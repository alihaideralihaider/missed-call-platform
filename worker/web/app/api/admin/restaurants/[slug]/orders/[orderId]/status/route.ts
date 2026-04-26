import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { incrementRestaurantUsage } from "@/lib/restaurant-usage";

type RouteContext = {
  params: Promise<{
    slug: string;
    orderId: string;
  }>;
};

const ALLOWED_STATUSES = [
  "pending",
  "confirmed",
  "ready",
  "completed",
  "cancelled",
] as const;

type OrderStatus = (typeof ALLOWED_STATUSES)[number];
type AdminSupabaseClient = ReturnType<typeof createClient> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: (schemaName: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (tableName: string) => any;
};
type TwilioSendResponse = {
  sid?: string;
  code?: number | string;
  message?: string;
};
type OrderUpdateResult = {
  data?:
    | {
        id: string;
        status: string;
        order_number: string | null;
        customer_id: string | null;
        sms_opt_in: boolean | null;
      }
    | null;
  error?: { message?: string | null } | null;
};

function isValidStatus(value: string): value is OrderStatus {
  return ALLOWED_STATUSES.includes(value as OrderStatus);
}

function canTransition(fromStatus: string, toStatus: OrderStatus): boolean {
  const from = fromStatus.trim().toLowerCase();

  if (from === "pending") {
    return toStatus === "confirmed" || toStatus === "cancelled";
  }

  if (from === "confirmed") {
    return toStatus === "ready" || toStatus === "cancelled";
  }

  if (from === "ready") {
    return toStatus === "completed" || toStatus === "cancelled";
  }

  return false;
}

function normalizePhoneToE164(phone: string | null | undefined): string | null {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return null;

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

function buildStatusMessage(args: {
  restaurantName: string;
  orderNumber: string;
  status: OrderStatus;
}): string | null {
  const { restaurantName, orderNumber, status } = args;

  if (status === "confirmed") {
    return `${restaurantName}: Your order ${orderNumber} is confirmed and is being prepared.`;
  }

  if (status === "ready") {
    return `${restaurantName}: Your order ${orderNumber} is ready for pickup. Thank you for ordering with us.`;
  }

  if (status === "cancelled") {
    return `${restaurantName}: Your order ${orderNumber} has been cancelled. Please call the restaurant if you have questions.`;
  }

  return null;
}

function shouldSendStatusSms(status: OrderStatus) {
  return status !== "completed";
}

async function sendTwilioSms(args: {
  to: string;
  body: string;
}): Promise<
  | { ok: true; sid: string }
  | { ok: false; error: string; sid?: string; errorCode?: string }
> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, error: "Missing Twilio environment variables." };
  }

  const formBody = new URLSearchParams({
    To: args.to,
    From: fromNumber,
    Body: args.body,
  });

  try {
    const auth =
      typeof btoa === "function"
        ? btoa(`${accountSid}:${authToken}`)
        : Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
      }
    );

    const rawText = await response.text();

    let parsed: TwilioSendResponse | null = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        error: parsed?.message || `Twilio send failed: ${response.status}`,
        sid: parsed?.sid,
        errorCode: parsed?.code ? String(parsed.code) : undefined,
      };
    }

    return {
      ok: true,
      sid: parsed?.sid || "",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Twilio error",
    };
  }
}

async function resolveBusinessId(
  supabase: AdminSupabaseClient,
  restaurantId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) {
    console.error("Failed to resolve business id:", error);
    return null;
  }

  const business = data as { id?: string | null } | null;
  return business?.id || null;
}

async function isOptedOut(
  supabase: AdminSupabaseClient,
  phoneNumber: string,
  businessId: string | null
): Promise<boolean> {
  if (!phoneNumber || !businessId) {
    return false;
  }

  const { data, error } = await supabase
    .from("opt_outs")
    .select("id")
    .eq("business_id", businessId)
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (error) {
    console.error("Failed to check opt-out status:", error);
    return false;
  }

  const optOut = data as { id?: string | null } | null;
  return Boolean(optOut?.id);
}

async function logMessage(
  supabase: AdminSupabaseClient,
  args: {
    restaurantId: string;
    orderId: string;
    customerId?: string | null;
    eventType: string;
    toPhone?: string | null;
    fromPhone?: string | null;
    messageBody?: string | null;
    providerMessageSid?: string | null;
    status: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const payload = {
    restaurant_id: args.restaurantId,
    order_id: args.orderId,
    customer_id: args.customerId || null,
    channel: "sms",
    direction: "outbound",
    event_type: args.eventType,
    provider: "twilio",
    provider_message_sid: args.providerMessageSid || null,
    to_phone: args.toPhone || null,
    from_phone: args.fromPhone || process.env.TWILIO_FROM_NUMBER || null,
    message_body: args.messageBody || null,
    status: args.status,
    error_code: args.errorCode || null,
    error_message: args.errorMessage || null,
    metadata: args.metadata || {},
  };

  const messagingClient = supabase as unknown as {
    schema: (schemaName: string) => {
      from: (tableName: string) => {
        insert: (value: unknown) => {
          select: (columns: string) => {
            single: () => Promise<{
              data:
                | {
                    id?: string | null;
                    status?: string | null;
                    provider_message_sid?: string | null;
                  }
                | null;
              error: unknown;
            }>;
          };
        };
      };
    };
  };

  const { data, error } = await messagingClient
    .schema("messaging")
    .from("message_logs")
    .insert(payload)
    .select("id, status, provider_message_sid")
    .single();

  if (error) {
    console.error("❌ Failed to insert message log:", error, payload);
    return null;
  }

  console.log("✅ Inserted message log:", data);
  return data;
}

async function updateOrderStatusWithCancelledByFallback(args: {
  supabase: AdminSupabaseClient;
  orderId: string;
  nextStatus: OrderStatus;
}): Promise<OrderUpdateResult> {
  const foodOrderingClient = args.supabase as unknown as {
    schema: (schemaName: string) => {
      from: (tableName: string) => {
        update: (value: Record<string, unknown>) => {
          eq: (column: string, value: string) => {
            select: (columns: string) => {
              single: () => Promise<OrderUpdateResult>;
            };
          };
        };
      };
    };
  };

  const updatesToTry =
    args.nextStatus === "cancelled"
      ? [
          {
            status: args.nextStatus,
            cancelled_by: "restaurant",
            cancelled_at: new Date().toISOString(),
          },
          {
            status: args.nextStatus,
            cancelled_by: "restaurant",
          },
          {
            status: args.nextStatus,
            cancelled_at: new Date().toISOString(),
          },
          {
            status: args.nextStatus,
          },
        ]
      : [{ status: args.nextStatus }];

  let lastResult: OrderUpdateResult = {
    data: null,
    error: null,
  };

  for (const update of updatesToTry) {
    const result = await foodOrderingClient
      .schema("food_ordering")
      .from("orders")
      .update(update)
      .eq("id", args.orderId)
      .select("id, status, order_number, customer_id, sms_opt_in")
      .single();

    if (!result.error || result.data) {
      return result;
    }

    const message = String(result.error.message || "").toLowerCase();
    const missingOptionalCancellationField =
      (message.includes("cancelled_by") || message.includes("cancelled_at")) &&
      (message.includes("column") || message.includes("schema cache"));

    lastResult = result;

    if (!missingOptionalCancellationField) {
      return result;
    }
  }

  return lastResult;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as AdminSupabaseClient;

  try {
    const { slug, orderId } = await params;
    const body = await req.json();
    const nextStatus = String(body?.status || "").trim().toLowerCase();

    if (!isValidStatus(nextStatus)) {
      return NextResponse.json(
        { error: "Invalid status." },
        { status: 400 }
      );
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .select("id, slug, name")
      .eq("slug", slug)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found." },
        { status: 404 }
      );
    }

    const { data: order, error: orderError } = await supabase
      .schema("food_ordering")
      .from("orders")
      .select("id, status, restaurant_id, order_number, customer_id, sms_opt_in")
      .eq("id", orderId)
      .eq("restaurant_id", restaurant.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found for this restaurant." },
        { status: 404 }
      );
    }

    const currentStatus = String(order.status || "pending")
      .trim()
      .toLowerCase();

    if (currentStatus === nextStatus) {
      return NextResponse.json({
        success: true,
        message: "Order status already set.",
        order: {
          id: order.id,
          status: currentStatus,
          order_number: order.order_number,
        },
      });
    }

    if (!canTransition(currentStatus, nextStatus)) {
      return NextResponse.json(
        {
          error: `Cannot move order from "${currentStatus}" to "${nextStatus}".`,
        },
        { status: 400 }
      );
    }

    const { data: updatedOrder, error: updateError } =
      await updateOrderStatusWithCancelledByFallback({
        supabase,
        orderId: order.id,
        nextStatus,
      });

    if (updateError || !updatedOrder) {
      console.error("Failed to update order status:", updateError);
      return NextResponse.json(
        { error: "Failed to update order status." },
        { status: 500 }
      );
    }

    let smsAttempted = false;
    let smsSent = false;
    let smsError = "";
    let smsSid = "";

    if (!shouldSendStatusSms(nextStatus)) {
      smsError = "";
    } else if (updatedOrder.sms_opt_in !== true) {
      smsError = "Customer did not opt in to SMS order updates.";

      await logMessage(supabase, {
        restaurantId: restaurant.id,
        orderId: updatedOrder.id,
        customerId: updatedOrder.customer_id || null,
        eventType: `order_status_${nextStatus}`,
        status: "skipped",
        errorMessage: smsError,
        metadata: {
          order_number: updatedOrder.order_number,
          order_status: nextStatus,
        },
      });
    } else if (updatedOrder.customer_id) {
      const { data: customer, error: customerError } = await supabase
        .schema("food_ordering")
        .from("customers")
        .select("id, name, phone")
        .eq("id", updatedOrder.customer_id)
        .single();

      if (!customerError && customer?.phone) {
        const toPhone = normalizePhoneToE164(customer.phone);
        const smsBody = buildStatusMessage({
          restaurantName: restaurant.name || "Restaurant",
          orderNumber: updatedOrder.order_number || updatedOrder.id,
          status: nextStatus,
        });

        if (toPhone && smsBody) {
          const businessId = await resolveBusinessId(supabase, restaurant.id);

          if (await isOptedOut(supabase, toPhone, businessId)) {
            smsError = "SMS suppressed because the customer opted out.";

            console.log("sms_suppressed_opt_out", {
              phone_number: toPhone,
              business_id: businessId,
            });

            await logMessage(supabase, {
              restaurantId: restaurant.id,
              orderId: updatedOrder.id,
              customerId: customer.id,
              eventType: `order_status_${nextStatus}`,
              toPhone,
              messageBody: smsBody,
              status: "skipped",
              errorMessage: smsError,
              metadata: {
                order_number: updatedOrder.order_number,
                order_status: nextStatus,
                business_id: businessId,
                suppressed_reason: "opt_out",
              },
            });
          } else {
            smsAttempted = true;

            const smsResult = await sendTwilioSms({
              to: toPhone,
              body: smsBody,
            });

            if (smsResult.ok) {
              smsSent = true;
              smsSid = smsResult.sid;

              try {
                await incrementRestaurantUsage({
                  restaurantId: restaurant.id,
                  smsDelta: 1,
                });
              } catch (usageError) {
                console.error("Order status SMS usage increment failed:", {
                  orderId: updatedOrder.id,
                  restaurantId: restaurant.id,
                  error:
                    usageError instanceof Error
                      ? usageError.message
                      : "unknown_error",
                });
              }

              await logMessage(supabase, {
                restaurantId: restaurant.id,
                orderId: updatedOrder.id,
                customerId: customer.id,
                eventType: `order_status_${nextStatus}`,
                toPhone,
                messageBody: smsBody,
                providerMessageSid: smsResult.sid,
                status: "sent_to_provider",
                metadata: {
                  order_number: updatedOrder.order_number,
                  order_status: nextStatus,
                },
              });
            } else {
              smsError = smsResult.error;
              smsSid = smsResult.sid || "";

              await logMessage(supabase, {
                restaurantId: restaurant.id,
                orderId: updatedOrder.id,
                customerId: customer.id,
                eventType: `order_status_${nextStatus}`,
                toPhone,
                messageBody: smsBody,
                providerMessageSid: smsResult.sid || null,
                status: "provider_error",
                errorCode: smsResult.errorCode || null,
                errorMessage: smsResult.error,
                metadata: {
                  order_number: updatedOrder.order_number,
                  order_status: nextStatus,
                },
              });

              console.error("Order status SMS failed:", smsResult.error, {
                orderId: updatedOrder.id,
                status: nextStatus,
                toPhone,
              });
            }
          }
        } else {
          smsError = !toPhone
            ? "Customer phone could not be normalized to E.164."
            : "No SMS body generated for this status.";

          await logMessage(supabase, {
            restaurantId: restaurant.id,
            orderId: updatedOrder.id,
            customerId: customer.id,
            eventType: `order_status_${nextStatus}`,
            toPhone: toPhone || customer.phone,
            messageBody: smsBody || null,
            status: "skipped",
            errorMessage: smsError,
            metadata: {
              order_number: updatedOrder.order_number,
              order_status: nextStatus,
            },
          });

          console.error("Order status SMS skipped:", smsError, {
            orderId: updatedOrder.id,
            rawPhone: customer.phone,
          });
        }
      } else {
        smsError = "Customer phone not found.";

        await logMessage(supabase, {
          restaurantId: restaurant.id,
          orderId: updatedOrder.id,
          customerId: updatedOrder.customer_id,
          eventType: `order_status_${nextStatus}`,
          status: "skipped",
          errorMessage: smsError,
          metadata: {
            order_number: updatedOrder.order_number,
            order_status: nextStatus,
          },
        });
      }
    } else {
      smsError = "Customer not linked to order.";

      await logMessage(supabase, {
        restaurantId: restaurant.id,
        orderId: updatedOrder.id,
        eventType: `order_status_${nextStatus}`,
        status: "skipped",
        errorMessage: smsError,
        metadata: {
          order_number: updatedOrder.order_number,
          order_status: nextStatus,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Order moved to ${nextStatus}.`,
      order: updatedOrder,
      sms: {
        attempted: smsAttempted,
        sent: smsSent,
        sid: smsSid,
        error: smsSent ? "" : smsError,
      },
    });
  } catch (error) {
    console.error(
      "PATCH /api/admin/restaurants/[slug]/orders/[orderId]/status failed:",
      error
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
