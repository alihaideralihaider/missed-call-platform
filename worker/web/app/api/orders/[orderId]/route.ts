import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrderPayload = {
  id: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  sms_opt_in: boolean | null;
  pickup_time: string | null;
  pickup_time_label: string | null;
  pickup_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  notes: string | null;
  order_number: string;
  created_at: string | null;
  restaurant: { slug: string; name: string | null } | null;
};

function jsonNoStore(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

function normalizeOrder(order: any): OrderPayload {
  return {
    id: order.id,
    status: order.status || "pending",
    subtotal: Number(order.subtotal || 0),
    tax: Number(order.tax || 0),
    total: Number(order.total || 0),
    sms_opt_in:
      typeof order.sms_opt_in === "boolean" ? order.sms_opt_in : null,
    pickup_time: order.pickup_time || null,
    pickup_time_label: order.pickup_time_label || null,
    pickup_at: order.pickup_at || null,
    cancelled_by: order.cancelled_by || null,
    cancelled_at: order.cancelled_at || null,
    notes: order.notes || null,
    order_number: order.order_number || order.public_order_code || order.id,
    created_at: order.created_at || null,
    restaurant: Array.isArray(order.restaurants)
      ? order.restaurants[0] || null
      : order.restaurants || null,
  };
}

async function loadOrderRecord(supabase: any, orderId: string) {
  return supabase
    .schema("food_ordering")
    .from("orders")
    .select(
      `
      id,
      status,
      subtotal,
      tax,
      total,
      sms_opt_in,
      pickup_time,
      pickup_time_label,
      pickup_at,
      cancelled_by,
      cancelled_at,
      notes,
      order_number,
      public_order_code,
      created_at,
      restaurant_id,
      restaurants!inner (
        slug,
        name
      )
    `
    )
    .eq("id", orderId)
    .single();
}

async function cancelOrderWithCancelledByFallback(args: {
  supabase: any;
  orderId: string;
}) {
  const updatesToTry = [
    {
      status: "cancelled",
      cancelled_by: "customer",
      cancelled_at: new Date().toISOString(),
    },
    {
      status: "cancelled",
      cancelled_by: "customer",
    },
    {
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    },
    {
      status: "cancelled",
    },
  ];

  let lastResult: any = null;

  for (const update of updatesToTry) {
    const result = await args.supabase
      .schema("food_ordering")
      .from("orders")
      .update(update)
      .eq("id", args.orderId)
      .eq("status", "pending")
      .select(
        `
        id,
        status,
        subtotal,
        tax,
        total,
        sms_opt_in,
        pickup_time,
        pickup_time_label,
        pickup_at,
        cancelled_by,
        cancelled_at,
        notes,
        order_number,
        public_order_code,
        created_at,
        restaurant_id,
        restaurants!inner (
          slug,
          name
        )
      `
      )
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

export async function GET(_: Request, context: RouteContext) {
  const supabase = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { orderId } = await context.params;

    const { data: order, error } = await loadOrderRecord(supabase, orderId);

    if (error || !order) {
      return jsonNoStore({ error: "Order not found." }, { status: 404 });
    }

    return jsonNoStore({
      success: true,
      order: normalizeOrder(order),
    });
  } catch (error) {
    console.error("GET /api/orders/[orderId] failed:", error);

    return jsonNoStore(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const supabase = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { orderId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim().toLowerCase();
    const restaurantSlug = String(body?.restaurantSlug || "")
      .trim()
      .toLowerCase();

    if (action !== "cancel") {
      return jsonNoStore({ error: "Invalid action." }, { status: 400 });
    }

    const { data: order, error } = await loadOrderRecord(supabase, orderId);

    if (error || !order) {
      return jsonNoStore({ error: "Order not found." }, { status: 404 });
    }

    const orderRestaurant = Array.isArray(order.restaurants)
      ? order.restaurants[0] || null
      : order.restaurants || null;
    const currentStatus = String(order.status || "pending").trim().toLowerCase();

    if (restaurantSlug && orderRestaurant?.slug !== restaurantSlug) {
      return jsonNoStore({ error: "Order not found." }, { status: 404 });
    }

    if (currentStatus !== "pending") {
      return jsonNoStore(
        { error: "This order can no longer be cancelled by the customer." },
        { status: 409 }
      );
    }

    const { data: updatedOrder, error: updateError } =
      await cancelOrderWithCancelledByFallback({
        supabase,
        orderId: order.id,
      });

    if (updateError || !updatedOrder) {
      console.error("Failed to cancel order:", updateError);
      return jsonNoStore(
        { error: "Failed to cancel order. Please refresh and try again." },
        { status: 409 }
      );
    }

    return jsonNoStore({
      success: true,
      message: "Your order has been cancelled.",
      order: normalizeOrder(updatedOrder),
    });
  } catch (error) {
    console.error("PATCH /api/orders/[orderId] failed:", error);

    return jsonNoStore(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
