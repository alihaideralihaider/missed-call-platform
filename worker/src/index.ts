import { createClient } from "@supabase/supabase-js";

type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
  APP_BASE_URL?: string;
};

type OrderItemInput = {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
};

type CreateOrderPayload = {
  restaurantSlug: string;
  customerName: string;
  customerPhone: string;
  pickupTime?: string;
  pickupTimeLabel?: string;
  pickupAt?: string;
  notes?: string;
  items: OrderItemInput[];
};

type JsonRecord = Record<string, unknown>;

type RestaurantRow = {
  id: string;
  slug: string;
  timezone?: string | null;
  name?: string | null;
};

type RestaurantHourRow = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean | null;
};

type MenuItemRow = {
  id: string;
  name: string;
  base_price: number | string | null;
  price: number | string | null;
  is_sold_out: boolean | null;
  category_id: string;
};

const ASAP_PREP_MINUTES = 20;

function jsonResponse(data: JsonRecord, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
    },
  });
}

function jsonError(message: string, status = 400, extra?: JsonRecord) {
  return jsonResponse(
    {
      success: false,
      error: message,
      ...(extra ?? {}),
    },
    status
  );
}

function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
    },
  });
}

function xmlResponse(xml: string, status = 200) {
  return new Response(xml, {
    status,
    headers: {
      "content-type": "text/xml; charset=utf-8",
    },
  });
}

function normalizePhone(input: string): string {
  return (input || "").replace(/\D/g, "");
}

function isValidPhone(phone: string): boolean {
  return /^\d{10,15}$/.test(phone);
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function sanitizeSlug(input: string): string {
  return (input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getNowInTimeZone(timeZone?: string | null): Date {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: timeZone || "America/New_York",
    })
  );
}

function buildTimeForToday(now: Date, timeValue: string) {
  const [hour, minute] = timeValue.split(":").map(Number);
  const result = new Date(now);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function parsePickupLeadMinutes(pickupTime: string): number | null {
  const value = String(pickupTime || "").trim();

  if (!value || value.toUpperCase() === "ASAP") {
    return ASAP_PREP_MINUTES;
  }

  const match = value.match(/^(\d+)\s*minutes?$/i);
  if (!match) {
    return null;
  }

  const minutes = Number(match[1]);
  if (!Number.isFinite(minutes) || minutes < 0) {
    return null;
  }

  return minutes;
}

function getRequestedPickupDate(
  pickupTime: string,
  now: Date
): Date | null {
  const leadMinutes = parsePickupLeadMinutes(pickupTime);
  if (leadMinutes === null) {
    return null;
  }

  return addMinutes(now, leadMinutes);
}

function parsePickupAt(value: string): Date | null {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function isAsapPickup(pickupTime: string): boolean {
  const value = String(pickupTime || "").trim();
  return !value || value.toUpperCase() === "ASAP";
}

function isRestaurantOpenNow(hours: RestaurantHourRow[], now = new Date()): boolean {
  const currentDay = now.getDay();
  const previousDay = currentDay === 0 ? 6 : currentDay - 1;

  const today = hours.find((row) => Number(row.day_of_week) === currentDay);
  const yesterday = hours.find((row) => Number(row.day_of_week) === previousDay);

  if (today && !today.is_closed && today.open_time && today.close_time) {
    const openAt = buildTimeForToday(now, today.open_time);
    const closeAt = buildTimeForToday(now, today.close_time);

    if (closeAt <= openAt) {
      closeAt.setDate(closeAt.getDate() + 1);
    }

    if (now >= openAt && now <= closeAt) {
      return true;
    }
  }

  if (
    yesterday &&
    !yesterday.is_closed &&
    yesterday.open_time &&
    yesterday.close_time
  ) {
    const yesterdayOpenAt = buildTimeForToday(now, yesterday.open_time);
    yesterdayOpenAt.setDate(yesterdayOpenAt.getDate() - 1);

    const yesterdayCloseAt = buildTimeForToday(now, yesterday.close_time);

    const yesterdayIsOvernight =
      yesterday.close_time <= yesterday.open_time;

    if (yesterdayIsOvernight && now <= yesterdayCloseAt) {
      if (now >= yesterdayOpenAt) {
        return true;
      }
    }
  }

  return false;
}

function formatPickupTimeForSms(
  pickupAt: Date,
  timeZone?: string | null
): string {
  const smsNow = getNowInTimeZone(timeZone);
  const smsPickup = new Date(
    pickupAt.toLocaleString("en-US", {
      timeZone: timeZone || "America/New_York",
    })
  );

  const today = new Date(smsNow);
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const pickupDay = new Date(smsPickup);
  pickupDay.setHours(0, 0, 0, 0);

  const timeText = pickupAt.toLocaleTimeString("en-US", {
    timeZone: timeZone || "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  });

  if (pickupDay.getTime() === today.getTime()) {
    return `today at ${timeText}`;
  }

  if (pickupDay.getTime() === tomorrow.getTime()) {
    return `tomorrow at ${timeText}`;
  }

  const dateText = pickupAt.toLocaleDateString("en-US", {
    timeZone: timeZone || "America/New_York",
    month: "short",
    day: "numeric",
  });

  return `${dateText} at ${timeText}`;
}

function buildStorefrontUrl(requestUrl: URL, slug: string, env: Env): string {
  const baseUrl = String(env.APP_BASE_URL || "").trim() || requestUrl.origin;
  return `${baseUrl.replace(/\/$/, "")}/r/${slug}`;
}

async function sendOrderConfirmationSms(args: {
  env: Env;
  to: string;
  restaurantName: string;
  orderNumber: string;
  pickupText: string;
}) {
  const { env, to, restaurantName, orderNumber, pickupText } = args;

  if (
    !env.TWILIO_ACCOUNT_SID ||
    !env.TWILIO_AUTH_TOKEN ||
    !env.TWILIO_FROM_NUMBER
  ) {
    console.log("Skipping SMS confirmation: missing Twilio env vars");
    return;
  }

  const body = new URLSearchParams();
  body.set("To", to);
  body.set("From", env.TWILIO_FROM_NUMBER);
  body.set(
    "Body",
    `Thanks for your order from ${restaurantName}. Your order ${orderNumber} is scheduled for pickup ${pickupText}.`
  );

  const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio SMS failed: ${response.status} ${errorText}`);
  }
}

async function sendMissedCallLinkSms(args: {
  env: Env;
  to: string;
  restaurantName: string;
  storefrontUrl: string;
}) {
  const { env, to, restaurantName, storefrontUrl } = args;

  if (
    !env.TWILIO_ACCOUNT_SID ||
    !env.TWILIO_AUTH_TOKEN ||
    !env.TWILIO_FROM_NUMBER
  ) {
    console.log("Skipping missed-call SMS: missing Twilio env vars");
    return;
  }

  const body = new URLSearchParams();
  body.set("To", to);
  body.set("From", env.TWILIO_FROM_NUMBER);
  body.set(
    "Body",
    `Thanks for calling ${restaurantName}. Order here for pickup: ${storefrontUrl}`
  );

  const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio missed-call SMS failed: ${response.status} ${errorText}`);
  }
}

async function generateOrderNumber(
  supabase: ReturnType<typeof createClient>,
  restaurantSlug: string
): Promise<string> {
  const baseSlug = sanitizeSlug(restaurantSlug) || "order";

  for (let i = 0; i < 25; i++) {
    const fiveDigits = Math.floor(10000 + Math.random() * 90000).toString();
    const candidate = `${baseSlug}-${fiveDigits}`;

    const { data, error } = await supabase
      .schema("food_ordering")
      .from("orders")
      .select("id")
      .eq("order_number", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to generate order code: ${error.message}`);
    }

    if (!data) {
      return candidate;
    }
  }

  throw new Error("Failed to generate unique order number after multiple attempts.");
}

async function loadRestaurantMenuItems(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string
): Promise<MenuItemRow[]> {
  const { data, error } = await supabase
    .schema("food_ordering")
    .from("menu_items")
    .select(`
      id,
      name,
      base_price,
      price,
      is_sold_out,
      category_id,
      menu_categories!inner (
        id,
        menu_id,
        menus!inner (
          id,
          restaurant_id
        )
      )
    `)
    .eq("menu_categories.menus.restaurant_id", restaurantId);

  if (error) {
    throw new Error(`Failed to validate menu items: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    base_price: row.base_price,
    price: row.price,
    is_sold_out: row.is_sold_out,
    category_id: row.category_id,
  }));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ success: true, ok: true });
    }

    if (
      request.method === "POST" &&
      url.pathname.startsWith("/twilio/voice/")
    ) {
      try {
        if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
          return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`, 200);
        }

        const slug = sanitizeSlug(
          url.pathname.split("/twilio/voice/")[1] || ""
        );

        if (!slug) {
          return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`, 200);
        }

        const form = await request.formData();
        const fromPhone = normalizePhone(String(form.get("From") || ""));

        if (!fromPhone || !isValidPhone(fromPhone)) {
          return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`, 200);
        }

        const supabase = createClient(
          env.SUPABASE_URL,
          env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: restaurant, error: restaurantError } = await supabase
          .schema("food_ordering")
          .from("restaurants")
          .select("id, slug, name")
          .eq("slug", slug)
          .single<RestaurantRow>();

        if (restaurantError || !restaurant) {
          console.error("Twilio voice webhook restaurant lookup failed:", {
            slug,
            error: restaurantError?.message,
          });

          return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`, 200);
        }

        try {
          const smsRestaurantName =
            String(restaurant.name || "").trim() || restaurant.slug || "the restaurant";
          const storefrontUrl = buildStorefrontUrl(url, restaurant.slug, env);

          await sendMissedCallLinkSms({
            env,
            to: fromPhone,
            restaurantName: smsRestaurantName,
            storefrontUrl,
          });
        } catch (smsError) {
          console.error("Missed-call SMS failed:", smsError);
        }

        return xmlResponse(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Pause length="1"/><Hangup/></Response>`,
          200
        );
      } catch (error) {
        console.error("Twilio voice webhook failed:", error);
        return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`, 200);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/orders") {
      console.log("POST /api/orders hit");

      try {
        if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
          return jsonError("Missing Supabase environment variables.", 500);
        }

        const supabase = createClient(
          env.SUPABASE_URL,
          env.SUPABASE_SERVICE_ROLE_KEY
        );

        const body = (await request.json()) as Partial<CreateOrderPayload>;

        const restaurantSlug = (body.restaurantSlug || "").trim().toLowerCase();
        const customerName = (body.customerName || "").trim();
        const customerPhone = normalizePhone(body.customerPhone || "");
        const pickupTime = (body.pickupTime || "ASAP").trim();
        const pickupTimeLabel = (body.pickupTimeLabel || "").trim();
        const pickupAtInput = (body.pickupAt || "").trim();
        const notes = (body.notes || "").trim();
        const items = Array.isArray(body.items) ? body.items : [];

        if (!restaurantSlug) return jsonError("restaurantSlug is required.");
        if (!customerName) return jsonError("customerName is required.");
        if (!customerPhone || !isValidPhone(customerPhone)) {
          return jsonError("A valid customerPhone is required.");
        }
        if (!items.length) return jsonError("At least one item is required.");

        const { data: restaurant, error: restaurantError } = await supabase
          .schema("food_ordering")
          .from("restaurants")
          .select("id, slug, timezone, name")
          .eq("slug", restaurantSlug)
          .single<RestaurantRow>();

        if (restaurantError) {
          throw new Error(`Failed to load restaurant: ${restaurantError.message}`);
        }

        if (!restaurant) {
          return jsonError("Restaurant not found.", 404);
        }

        const { data: restaurantHours, error: restaurantHoursError } = await supabase
          .schema("food_ordering")
          .from("restaurant_hours")
          .select("day_of_week, open_time, close_time, is_closed")
          .eq("restaurant_id", restaurant.id);

        if (restaurantHoursError) {
          throw new Error(
            `Failed to load restaurant hours: ${restaurantHoursError.message}`
          );
        }

        const hours = (restaurantHours as RestaurantHourRow[] | null) || [];
        const now = getNowInTimeZone(restaurant.timezone);

        const requestedPickupDate =
          parsePickupAt(pickupAtInput) || getRequestedPickupDate(pickupTime, now);

        if (!requestedPickupDate) {
          return jsonError("Invalid pickup time selected.", 400, {
            code: "INVALID_PICKUP_TIME",
          });
        }

        if (isAsapPickup(pickupTime)) {
          const isOpenNow = isRestaurantOpenNow(hours, now);

          if (!isOpenNow) {
            return jsonError("Restaurant is currently closed.", 409, {
              code: "RESTAURANT_CLOSED",
            });
          }
        }

        const isOpenAtRequestedPickupTime = isRestaurantOpenNow(
          hours,
          requestedPickupDate
        );

        if (!isOpenAtRequestedPickupTime) {
          return jsonError("Selected pickup time is outside restaurant hours.", 409, {
            code: "INVALID_PICKUP_TIME",
          });
        }

        const normalizedItems = items.map((item) => ({
          id: String(item?.id || "").trim(),
          name: String(item?.name || "").trim(),
          quantity: Math.max(1, Math.floor(toNumber(item?.quantity) || 1)),
        }));

        const hasIdsForAllItems = normalizedItems.every((item) => item.id);
        const restaurantMenuItems = await loadRestaurantMenuItems(
          supabase,
          restaurant.id
        );

        let matchedDbItems: MenuItemRow[] = [];

        if (hasIdsForAllItems) {
          matchedDbItems = normalizedItems.map((item) => {
            const match = restaurantMenuItems.find((dbItem) => dbItem.id === item.id);
            if (!match) {
              throw new Error(`Invalid item id: ${item.id}`);
            }
            return match;
          });
        } else {
          const itemNames = normalizedItems.map((item) => item.name).filter(Boolean);

          if (!itemNames.length || itemNames.length !== normalizedItems.length) {
            return jsonError("One or more items are invalid.");
          }

          matchedDbItems = normalizedItems.map((item) => {
            const match = restaurantMenuItems.find((dbItem) => dbItem.name === item.name);
            if (!match) {
              throw new Error(`Invalid item name: ${item.name}`);
            }
            return match;
          });
        }

        if (matchedDbItems.length !== normalizedItems.length) {
          return jsonError("One or more items are invalid.");
        }

        const soldOutItems = matchedDbItems.filter((item) => item.is_sold_out);

        if (soldOutItems.length > 0) {
          return jsonError(`${soldOutItems[0].name} is currently sold out`);
        }

        const cleanedItems = normalizedItems.map((item) => {
          const dbItem = hasIdsForAllItems
            ? matchedDbItems.find((d) => d.id === item.id)
            : matchedDbItems.find((d) => d.name === item.name);

          if (!dbItem) {
            throw new Error(`Invalid item: ${item.id || item.name || "unknown"}`);
          }

          const unitPrice = roundMoney(
            Number(dbItem.base_price ?? dbItem.price ?? 0)
          );

          return {
            menuItemId: dbItem.id,
            name: dbItem.name,
            unitPrice,
            quantity: item.quantity,
            lineTotal: roundMoney(unitPrice * item.quantity),
          };
        });

        let customerId: string;

        const { data: existingCustomer, error: existingCustomerError } =
          await supabase
            .schema("food_ordering")
            .from("customers")
            .select("id")
            .eq("restaurant_id", restaurant.id)
            .eq("phone", customerPhone)
            .maybeSingle();

        if (existingCustomerError) {
          throw new Error(
            `Failed to load customer: ${existingCustomerError.message}`
          );
        }

        if (existingCustomer?.id) {
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer, error: newCustomerError } = await supabase
            .schema("food_ordering")
            .from("customers")
            .insert({
              restaurant_id: restaurant.id,
              phone: customerPhone,
              name: customerName,
            })
            .select("id")
            .single();

          if (newCustomerError) {
            throw new Error(`Customer creation failed: ${newCustomerError.message}`);
          }

          if (!newCustomer) {
            throw new Error("Customer creation failed");
          }

          customerId = newCustomer.id;
        }

        const subtotal = roundMoney(
          cleanedItems.reduce((sum, item) => sum + item.lineTotal, 0)
        );
        const tax = 0;
        const total = roundMoney(subtotal + tax);

        const orderNumber = await generateOrderNumber(
          supabase,
          restaurant.slug
        );

        const { data: insertedOrder, error: insertedOrderError } = await supabase
          .schema("food_ordering")
          .from("orders")
          .insert({
            restaurant_id: restaurant.id,
            customer_id: customerId,
            status: "pending",
            subtotal,
            total,
            source: "web",
            pickup_time: pickupTime,
            pickup_time_label: pickupTimeLabel || null,
            pickup_at: requestedPickupDate.toISOString(),
            notes:
              [pickupTimeLabel ? `Pickup: ${pickupTimeLabel}` : "", notes]
                .filter(Boolean)
                .join("\n") || null,
            tax,
            payment_status: "unpaid",
            payment_method: "cash",
            order_number: orderNumber,
            public_order_code: orderNumber,
          })
          .select("id, order_number")
          .single();

        if (insertedOrderError) {
          throw new Error(`Order creation failed: ${insertedOrderError.message}`);
        }

        if (!insertedOrder) {
          throw new Error("Order creation failed");
        }

        const orderItemsPayload = cleanedItems.map((item) => ({
          order_id: insertedOrder.id,
          menu_item_id: item.menuItemId,
          item_name: item.name,
          unit_price: item.unitPrice,
          price: item.unitPrice,
          quantity: item.quantity,
          line_total: item.lineTotal,
        }));

        const { error: orderItemsError } = await supabase
          .schema("food_ordering")
          .from("order_items")
          .insert(orderItemsPayload);

        if (orderItemsError) {
          throw new Error(`Order items creation failed: ${orderItemsError.message}`);
        }

        try {
          const smsRestaurantName =
            String(restaurant.name || "").trim() || restaurant.slug || "the restaurant";
          const pickupText = formatPickupTimeForSms(
            requestedPickupDate,
            restaurant.timezone
          );

          await sendOrderConfirmationSms({
            env,
            to: customerPhone,
            restaurantName: smsRestaurantName,
            orderNumber: insertedOrder.order_number,
            pickupText,
          });
        } catch (smsError) {
          console.error("Order confirmation SMS failed:", smsError);
        }

        for (const item of cleanedItems) {
          const { data: currentItem, error: currentItemError } = await supabase
            .schema("food_ordering")
            .from("menu_items")
            .select("order_count")
            .eq("id", item.menuItemId)
            .single();

          if (currentItemError || !currentItem) {
            console.error("Failed to read current order_count:", {
              menuItemId: item.menuItemId,
              error: currentItemError?.message,
            });
            continue;
          }

          const currentOrderCount = Number(currentItem.order_count ?? 0);
          const nextOrderCount = currentOrderCount + item.quantity;

          const { error: incrementError } = await supabase
            .schema("food_ordering")
            .from("menu_items")
            .update({
              order_count: nextOrderCount,
              last_ordered_at: new Date().toISOString(),
            })
            .eq("id", item.menuItemId);

          if (incrementError) {
            console.error("Failed to update menu item order_count:", {
              menuItemId: item.menuItemId,
              error: incrementError.message,
            });
          }
        }

        return jsonResponse({
          success: true,
          orderId: insertedOrder.id,
          orderNumber: insertedOrder.order_number,
          subtotal,
          tax,
          total,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown server error";
        console.error("POST /api/orders failed:", error);
        return jsonError(message, 500);
      }
    }

    return jsonError("Not found.", 404);
  },
};