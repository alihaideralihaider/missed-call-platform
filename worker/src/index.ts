import { createClient } from "@supabase/supabase-js";
import {
  evaluateRestaurantHours,
  isRestaurantOpenAt,
  type RestaurantHourRow,
} from "./restaurant-hours";
import { incrementRestaurantUsage } from "./usage";

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
  modifiers?: ModifierSelectionInput[];
};

type ModifierSelectionInput = {
  groupId?: string;
  groupName?: string;
  optionId?: string;
  optionName?: string;
  price?: number;
};

type CreateOrderPayload = {
  restaurantSlug: string;
  customerName: string;
  customerPhone: string;
  pickupTime?: string;
  pickupTimeLabel?: string;
  pickupAt?: string;
  smsOptIn?: boolean;
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

type TaxSettingsRow = {
  sales_tax_rate?: number | string | null;
  tax_mode?: string | null;
  tax_label?: string | null;
};

type MenuItemRow = {
  id: string;
  name: string;
  base_price: number | string | null;
  price: number | string | null;
  is_sold_out: boolean | null;
  category_id: string;
};

type NormalizedModifierSelection = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
};

const ASAP_PREP_MINUTES = 20;

function readEnv(value: string | undefined | null): string {
  return String(value ?? "").trim();
}

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

function buildPhoneVariants(phoneNumber: string): string[] {
  return Array.from(
    new Set(
      [
        phoneNumber,
        `+${phoneNumber}`,
        phoneNumber.length === 10 ? `+1${phoneNumber}` : "",
        phoneNumber.length === 11 && phoneNumber.startsWith("1") ? `+${phoneNumber}` : "",
      ].filter(Boolean)
    )
  );
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

function normalizeTaxRate(value: unknown): number {
  const raw = Number(value);

  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }

  if (raw >= 1) {
    return raw / 100;
  }

  return raw;
}

function sanitizeSlug(input: string): string {
  return (input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// TEMP DEBUG: pickup-time validation tracing. Remove after checkout-hours issue is resolved.
function getDebugSafeTimeZone(timeZone?: string | null): string {
  const candidate = String(timeZone || "").trim();

  if (!candidate) {
    return "America/New_York";
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return "America/New_York";
  }
}

function getDebugTimeZoneParts(
  date: Date,
  timeZone: string
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const parts = formatter.formatToParts(date);
  const values = Object.create(null) as Record<string, string>;

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    weekday: weekdayMap[values.weekday] ?? 0,
  };
}

function formatDebugLocalTimestamp(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function getDebugHoursRowForDay(
  hours: RestaurantHourRow[],
  dayOfWeek: number
): RestaurantHourRow | null {
  return (
    hours.find((row) => Number(row.day_of_week) === Number(dayOfWeek)) || null
  );
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

function isSameMinute(a: Date, b: Date): boolean {
  return Math.abs(a.getTime() - b.getTime()) < 60 * 1000;
}

function formatPickupTimeForSms(
  pickupAt: Date,
  timeZone?: string | null
): string {
  const safeTimeZone = String(timeZone || "").trim() || "America/New_York";
  const smsNow = new Date();
  const smsPickup = new Date(
    pickupAt.toLocaleString("en-US", {
      timeZone: safeTimeZone,
    })
  );

  const today = new Date(
    smsNow.toLocaleString("en-US", {
      timeZone: safeTimeZone,
    })
  );
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const pickupDay = new Date(smsPickup);
  pickupDay.setHours(0, 0, 0, 0);

  const timeText = pickupAt.toLocaleTimeString("en-US", {
    timeZone: safeTimeZone,
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
    timeZone: safeTimeZone,
    month: "short",
    day: "numeric",
  });

  return `${dateText} at ${timeText}`;
}

function buildStorefrontUrl(requestUrl: URL, slug: string, env: Env): string {
  const baseUrl = readEnv(env.APP_BASE_URL) || requestUrl.origin;
  return `${baseUrl.replace(/\/$/, "")}/r/${slug}`;
}

async function resolveBusinessIdByRestaurantId(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string
): Promise<string | null> {
  const { data: businessMap, error: businessMapError } = await supabase
    .from("business_restaurant_map")
    .select("business_id")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!businessMapError && businessMap?.business_id) {
    return businessMap.business_id;
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) {
    console.error("Failed to resolve business id:", {
      restaurantId,
      error: error.message,
    });
    return null;
  }

  return data?.id || null;
}

async function isOptedOut(
  supabase: ReturnType<typeof createClient>,
  phoneNumber: string,
  businessId: string | null
): Promise<boolean> {
  if (!phoneNumber || !businessId) {
    return false;
  }

  const variants = buildPhoneVariants(phoneNumber);

  const { data, error } = await supabase
    .from("opt_outs")
    .select("id")
    .eq("business_id", businessId)
    .in("phone_number", variants)
    .maybeSingle();

  if (error) {
    console.error("Failed to check opt-out status:", {
      businessId,
      phoneNumber,
      error: error.message,
    });
    return false;
  }

  return Boolean(data?.id);
}

async function upsertTransactionalSmsConsent(args: {
  supabase: ReturnType<typeof createClient>;
  businessId: string | null;
  restaurantId: string;
  phoneNumber: string;
  consentSource: "checkout" | "ivr";
}) {
  const { supabase, businessId, restaurantId, phoneNumber, consentSource } = args;

  if (!businessId || !restaurantId || !phoneNumber) {
    return;
  }

  const { error } = await supabase
    .schema("messaging")
    .from("sms_consents")
    .upsert(
      {
        business_id: businessId,
        restaurant_id: restaurantId,
        phone_number: phoneNumber,
        consent_type: "transactional",
        consent_source: consentSource,
        consent_granted: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "business_id,phone_number,consent_type" }
    );

  if (error) {
    throw new Error(`Failed to upsert SMS consent: ${error.message}`);
  }
}

async function sendOrderConfirmationSms(args: {
  supabase: ReturnType<typeof createClient>;
  businessId: string | null;
  env: Env;
  to: string;
  restaurantName: string;
  orderNumber: string;
  pickupText: string;
}) {
  const { supabase, businessId, env, to, restaurantName, orderNumber, pickupText } = args;
  const accountSid = readEnv(env.TWILIO_ACCOUNT_SID);
  const authToken = readEnv(env.TWILIO_AUTH_TOKEN);
  const fromNumber = readEnv(env.TWILIO_FROM_NUMBER);

  if (!accountSid || !authToken || !fromNumber) {
    console.log("Skipping SMS confirmation: missing Twilio env vars");
    return;
  }

  if (await isOptedOut(supabase, to, businessId)) {
    console.log("sms_suppressed_opt_out", {
      phone_number: to,
      business_id: businessId,
    });
    return;
  }

  const body = new URLSearchParams();
  body.set("To", to);
  body.set("From", fromNumber);
  body.set(
    "Body",
    `Thanks for your order from ${restaurantName}. Your order ${orderNumber} is scheduled for pickup ${pickupText}.`
  );

  const auth = btoa(`${accountSid}:${authToken}`);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
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
  supabase: ReturnType<typeof createClient>;
  businessId: string | null;
  env: Env;
  to: string;
  restaurantName: string;
  storefrontUrl: string;
}) {
  const { supabase, businessId, env, to, restaurantName, storefrontUrl } = args;
  const accountSid = readEnv(env.TWILIO_ACCOUNT_SID);
  const authToken = readEnv(env.TWILIO_AUTH_TOKEN);
  const fromNumber = readEnv(env.TWILIO_FROM_NUMBER);

  if (!accountSid || !authToken || !fromNumber) {
    console.log("Skipping missed-call SMS: missing Twilio env vars");
    return;
  }

  if (await isOptedOut(supabase, to, businessId)) {
    console.log("sms_suppressed_opt_out", {
      phone_number: to,
      business_id: businessId,
    });
    return;
  }

  const body = new URLSearchParams();
  body.set("To", to);
  body.set("From", fromNumber);
  body.set(
    "Body",
    `Thanks for calling ${restaurantName}. Order here for pickup: ${storefrontUrl}`
  );

  const auth = btoa(`${accountSid}:${authToken}`);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
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

function normalizeModifierOptionPrice(option: any): number {
  const raw = option?.price_delta ?? 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

async function loadModifierConfig(
  supabase: ReturnType<typeof createClient>,
  menuItemIds: string[]
) {
  if (!menuItemIds.length) {
    return {
      linksByItemId: new Map<string, any[]>(),
      groupsById: new Map<string, any>(),
      optionsById: new Map<string, any>(),
      optionsByGroupId: new Map<string, any[]>(),
    };
  }

  const { data: linkRows, error: linkError } = await supabase
    .schema("food_ordering")
    .from("menu_item_modifier_groups")
    .select("*")
    .in("menu_item_id", menuItemIds);

  if (linkError) {
    throw new Error(`Failed to load menu item modifier groups: ${linkError.message}`);
  }

  const links = (linkRows as any[] | null) || [];
  const groupIds = Array.from(
    new Set(links.map((row) => String(row?.modifier_group_id || "")).filter(Boolean))
  );

  if (!groupIds.length) {
    return {
      linksByItemId: new Map<string, any[]>(),
      groupsById: new Map<string, any>(),
      optionsById: new Map<string, any>(),
      optionsByGroupId: new Map<string, any[]>(),
    };
  }

  const [{ data: groupRows, error: groupError }, { data: optionRows, error: optionError }] =
    await Promise.all([
      supabase.schema("food_ordering").from("modifier_groups").select("*").in("id", groupIds),
      supabase
        .schema("food_ordering")
        .from("modifier_group_options")
        .select("*")
        .in("modifier_group_id", groupIds),
    ]);

  if (groupError) {
    throw new Error(`Failed to load modifier groups: ${groupError.message}`);
  }

  if (optionError) {
    throw new Error(`Failed to load modifier options: ${optionError.message}`);
  }

  const linksByItemId = new Map<string, any[]>();
  for (const link of links) {
    const itemId = String(link?.menu_item_id || "");
    if (!itemId) continue;
    const existing = linksByItemId.get(itemId) || [];
    existing.push(link);
    linksByItemId.set(itemId, existing);
  }

  const groupsById = new Map<string, any>();
  for (const group of (groupRows as any[] | null) || []) {
    if (group?.is_active === false) continue;
    groupsById.set(String(group.id), group);
  }

  const optionsById = new Map<string, any>();
  const optionsByGroupId = new Map<string, any[]>();
  for (const option of (optionRows as any[] | null) || []) {
    if (option?.is_active === false) continue;
    const optionId = String(option?.id || "");
    const groupId = String(option?.modifier_group_id || "");
    if (!optionId || !groupId) continue;
    optionsById.set(optionId, option);
    const existing = optionsByGroupId.get(groupId) || [];
    existing.push(option);
    optionsByGroupId.set(groupId, existing);
  }

  return {
    linksByItemId,
    groupsById,
    optionsById,
    optionsByGroupId,
  };
}

function validateAndPriceModifiers(args: {
  menuItemId: string;
  modifiers: NormalizedModifierSelection[];
  modifierConfig: Awaited<ReturnType<typeof loadModifierConfig>>;
}) {
  const { menuItemId, modifiers, modifierConfig } = args;
  const itemLinks = modifierConfig.linksByItemId.get(menuItemId) || [];
  const allowedGroupIds = new Set(
    itemLinks
      .map((link) => String(link?.modifier_group_id || ""))
      .filter(Boolean)
  );

  if (!modifiers.length) {
    for (const groupId of allowedGroupIds) {
      const group = modifierConfig.groupsById.get(groupId);
      if (!group) continue;
      const required = Boolean(group?.is_required ?? group?.required ?? false);
      const minSelect = Math.max(
        Number(group?.min_selections ?? group?.min_select ?? (required ? 1 : 0)),
        required ? 1 : 0
      );
      if (minSelect > 0) {
        throw new Error(`Missing required modifiers for ${group?.name || "this item"}`);
      }
    }

    return {
      modifierTotal: 0,
      normalizedModifiers: [] as NormalizedModifierSelection[],
      displayNameSuffix: "",
    };
  }

  const selectedByGroup = new Map<string, NormalizedModifierSelection[]>();
  const dedupe = new Set<string>();

  for (const modifier of modifiers) {
    if (!allowedGroupIds.has(modifier.groupId)) {
      throw new Error("Invalid modifier group selected for item.");
    }

    const option = modifierConfig.optionsById.get(modifier.optionId);
    if (!option) {
      throw new Error("Invalid modifier option selected for item.");
    }

    const optionGroupId = String(option?.modifier_group_id || "");
    if (optionGroupId !== modifier.groupId) {
      throw new Error("Modifier option does not belong to modifier group.");
    }

    const dedupeKey = `${modifier.groupId}:${modifier.optionId}`;
    if (dedupe.has(dedupeKey)) {
      continue;
    }
    dedupe.add(dedupeKey);

    const group = modifierConfig.groupsById.get(modifier.groupId);
    const normalizedModifier: NormalizedModifierSelection = {
      groupId: modifier.groupId,
      groupName: String(group?.name || modifier.groupName || "Modifier").trim(),
      optionId: modifier.optionId,
      optionName: String(option?.name || modifier.optionName || "Option").trim(),
      price: normalizeModifierOptionPrice(option),
    };

    const existing = selectedByGroup.get(modifier.groupId) || [];
    existing.push(normalizedModifier);
    selectedByGroup.set(modifier.groupId, existing);
  }

  for (const groupId of allowedGroupIds) {
    const group = modifierConfig.groupsById.get(groupId);
    if (!group) continue;

    const selected = selectedByGroup.get(groupId) || [];
    const required = Boolean(group?.is_required ?? group?.required ?? false);
    const minSelect = Math.max(
      Number(group?.min_selections ?? group?.min_select ?? (required ? 1 : 0)),
      required ? 1 : 0
    );
    const groupOptions = modifierConfig.optionsByGroupId.get(groupId) || [];
    const maxSelectRaw =
      group?.max_selections === null || group?.max_selections === undefined
        ? group?.selection_mode === "single"
          ? 1
          : group?.max_select === null || group?.max_select === undefined
          ? groupOptions.length
          : Number(group.max_select)
        : Number(group.max_selections);
    const maxSelect = Math.max(1, Number.isFinite(maxSelectRaw) ? maxSelectRaw : groupOptions.length);

    if (selected.length < minSelect) {
      throw new Error(`Missing required modifiers for ${group?.name || "this item"}`);
    }

    if (selected.length > maxSelect) {
      throw new Error(`Too many modifiers selected for ${group?.name || "this item"}`);
    }
  }

  const normalizedModifiers = Array.from(selectedByGroup.values()).flat();
  const modifierTotal = normalizedModifiers.reduce(
    (sum, modifier) => sum + modifier.price,
    0
  );
  const displayNameSuffix =
    normalizedModifiers.length > 0
      ? ` (${normalizedModifiers.map((modifier) => modifier.optionName).join(", ")})`
      : "";

  return {
    modifierTotal,
    normalizedModifiers,
    displayNameSuffix,
  };
}

async function loadRestaurantTaxConfig(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string
): Promise<{
  taxRate: number;
  taxMode: "exclusive" | "none";
}> {
  const { data, error } = await supabase
    .schema("food_ordering")
    .from("tax_settings")
    .select("sales_tax_rate, tax_mode, tax_label")
    .eq("restaurant_id", restaurantId)
    .maybeSingle<TaxSettingsRow>();

  if (error) {
    console.warn("Failed to load restaurant tax settings; defaulting tax to 0.", {
      restaurantId,
      error: error.message,
    });
    return {
      taxRate: 0,
      taxMode: "none",
    };
  }

  if (!data) {
    console.warn("No restaurant tax settings found; defaulting tax to 0.", {
      restaurantId,
    });
    return {
      taxRate: 0,
      taxMode: "none",
    };
  }

  const normalizedMode =
    String(data.tax_mode || "").trim().toLowerCase() === "exclusive"
      ? "exclusive"
      : "none";
  const normalizedRate = normalizeTaxRate(data.sales_tax_rate);

  if (normalizedMode !== "exclusive" || normalizedRate <= 0) {
    return {
      taxRate: 0,
      taxMode: "none",
    };
  }

  return {
    taxRate: normalizedRate,
    taxMode: "exclusive",
  };
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
        const supabaseUrl = readEnv(env.SUPABASE_URL);
        const supabaseServiceRoleKey = readEnv(env.SUPABASE_SERVICE_ROLE_KEY);

        if (!supabaseUrl || !supabaseServiceRoleKey) {
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
          supabaseUrl,
          supabaseServiceRoleKey
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
          try {
            await incrementRestaurantUsage({
              supabase,
              restaurantId: restaurant.id,
              callsDelta: 1,
            });
          } catch (usageError) {
            console.error("Missed-call usage increment failed:", usageError);
          }

          const smsRestaurantName =
            String(restaurant.name || "").trim() || restaurant.slug || "the restaurant";
          const storefrontUrl = buildStorefrontUrl(url, restaurant.slug, env);
          const businessId = await resolveBusinessIdByRestaurantId(
            supabase,
            restaurant.id
          );

          await sendMissedCallLinkSms({
            supabase,
            businessId,
            env,
            to: fromPhone,
            restaurantName: smsRestaurantName,
            storefrontUrl,
          });

          try {
            await incrementRestaurantUsage({
              supabase,
              restaurantId: restaurant.id,
              smsDelta: 1,
            });
          } catch (usageError) {
            console.error("Missed-call SMS usage increment failed:", usageError);
          }
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
      const supabaseUrl = readEnv(env.SUPABASE_URL);
      const supabaseServiceRoleKey = readEnv(env.SUPABASE_SERVICE_ROLE_KEY);

      console.log("SUPABASE_URL exists:", Boolean(supabaseUrl));
      console.log(
        "SUPABASE_SERVICE_ROLE_KEY exists:",
        Boolean(supabaseServiceRoleKey)
      );


      try {
        if (!supabaseUrl || !supabaseServiceRoleKey) {
          return jsonError("Missing Supabase environment variables.", 500);
        }

        const supabase = createClient(
          supabaseUrl,
          supabaseServiceRoleKey
        );

        const body = (await request.json()) as Partial<CreateOrderPayload>;

        const restaurantSlug = (body.restaurantSlug || "").trim().toLowerCase();
        const customerName = (body.customerName || "").trim();
        const customerPhone = normalizePhone(body.customerPhone || "");
        const pickupTime = (body.pickupTime || "ASAP").trim();
        const pickupTimeLabel = (body.pickupTimeLabel || "").trim();
        const pickupAtInput = (body.pickupAt || "").trim();
        const smsOptIn = body.smsOptIn === true;
        const notes = (body.notes || "").trim();
        const items = Array.isArray(body.items) ? body.items : [];

        console.log("WORKER_RAW_ITEMS", body.items);

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
        const taxConfig = await loadRestaurantTaxConfig(supabase, restaurant.id);
        const now = new Date();
        const hoursEvaluation = evaluateRestaurantHours(
          hours,
          restaurant.timezone,
          now
        );

        const requestedPickupDate =
          parsePickupAt(pickupAtInput) || getRequestedPickupDate(pickupTime, now);

        const debugTimeZone = getDebugSafeTimeZone(restaurant.timezone);
        const debugPickupParts = requestedPickupDate
          ? getDebugTimeZoneParts(requestedPickupDate, debugTimeZone)
          : null;
        const debugDayOfWeek = debugPickupParts?.weekday ?? null;
        const debugHoursRow =
          debugDayOfWeek === null
            ? null
            : getDebugHoursRowForDay(hours, debugDayOfWeek);

        const logPickupValidationDebug = (
          invalidationReason: string,
          extra?: JsonRecord
        ) => {
          console.log("TEMP DEBUG pickup validation", {
            restaurantSlug,
            restaurantId: restaurant.id,
            restaurantTimezone: restaurant.timezone,
            pickupTime,
            pickupTimeLabel,
            pickupAt: pickupAtInput || null,
            currentTimeInRestaurantTimezone: formatDebugLocalTimestamp(
              now,
              debugTimeZone
            ),
            parsedPickupTimeInRestaurantTimezone: requestedPickupDate
              ? formatDebugLocalTimestamp(requestedPickupDate, debugTimeZone)
              : null,
            computedDayOfWeekUsedForValidation: debugDayOfWeek,
            selectedRestaurantHoursRowForDay: debugHoursRow,
            openTime: debugHoursRow?.open_time ?? null,
            closeTime: debugHoursRow?.close_time ?? null,
            invalidationReason,
            ...extra,
          });
        };

        logPickupValidationDebug("pre-validation");

        if (!requestedPickupDate) {
          logPickupValidationDebug("requestedPickupDate could not be parsed");
          return jsonError("Invalid pickup time selected.", 400, {
            code: "INVALID_PICKUP_TIME",
          });
        }

        if (isAsapPickup(pickupTime)) {
          if (!hoursEvaluation.allowsAsap) {
            logPickupValidationDebug("ASAP rejected because hoursEvaluation.allowsAsap is false", {
              hoursEvaluation,
            });
            return jsonError("Restaurant is currently closed.", 409, {
              code: "RESTAURANT_CLOSED",
              nextOpenText: hoursEvaluation.nextOpenText,
            });
          }
        } else {
          if (requestedPickupDate.getTime() <= now.getTime()) {
            logPickupValidationDebug("scheduled pickup rejected because requestedPickupDate is not in the future");
            return jsonError("Selected pickup time must be in the future.", 409, {
              code: "INVALID_PICKUP_TIME",
            });
          }

          if (pickupAtInput) {
            const matchesGeneratedSlot = hoursEvaluation.availableScheduledSlots.some(
              (option) => isSameMinute(new Date(option.pickupAt), requestedPickupDate)
            );

            if (!matchesGeneratedSlot) {
              logPickupValidationDebug(
                "pickupAtInput rejected because it did not match any generated scheduled slot",
                {
                  availableScheduledSlots: hoursEvaluation.availableScheduledSlots,
                }
              );
              return jsonError(
                "Selected pickup time is outside restaurant hours.",
                409,
                {
                  code: "INVALID_PICKUP_TIME",
                }
              );
            }
          } else if (!isRestaurantOpenAt(hours, restaurant.timezone, requestedPickupDate)) {
            logPickupValidationDebug(
              "scheduled pickup rejected by isRestaurantOpenAt in non-pickupAtInput branch"
            );
            return jsonError(
              "Selected pickup time is outside restaurant hours.",
              409,
              {
                code: "INVALID_PICKUP_TIME",
              }
            );
          }
        }

        if (!isRestaurantOpenAt(hours, restaurant.timezone, requestedPickupDate)) {
          logPickupValidationDebug(
            "final isRestaurantOpenAt check rejected pickup time"
          );
          return jsonError("Selected pickup time is outside restaurant hours.", 409, {
            code: "INVALID_PICKUP_TIME",
          });
        }

        const normalizedItems = items.map((item) => ({
          id: String(item?.id || "").trim(),
          name: String(item?.name || "").trim(),
          quantity: Math.max(1, Math.floor(toNumber(item?.quantity) || 1)),
          modifiers: Array.isArray(item?.modifiers)
            ? item.modifiers
                .map((modifier) => {
                  const groupId = String(modifier?.groupId || "").trim();
                  const groupName = String(modifier?.groupName || "").trim();
                  const optionId = String(modifier?.optionId || "").trim();
                  const optionName = String(modifier?.optionName || "").trim();
                  const price = Number(modifier?.price || 0);

                  if (!groupId || !optionId || !groupName || !optionName) {
                    return null;
                  }

                  return {
                    groupId,
                    groupName,
                    optionId,
                    optionName,
                    price: Number.isFinite(price) ? price : 0,
                  } satisfies NormalizedModifierSelection;
                })
                .filter(
                  (modifier): modifier is NormalizedModifierSelection =>
                    modifier !== null
                )
            : [],
        }));

        console.log("WORKER_NORMALIZED_ITEMS", normalizedItems);

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

        const modifierConfig = await loadModifierConfig(
          supabase,
          matchedDbItems.map((item) => item.id)
        );

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
          const modifierPricing = validateAndPriceModifiers({
            menuItemId: dbItem.id,
            modifiers: item.modifiers,
            modifierConfig,
          });
          const finalUnitPrice = roundMoney(unitPrice + modifierPricing.modifierTotal);

          return {
            menuItemId: dbItem.id,
            name: `${dbItem.name}${modifierPricing.displayNameSuffix}`,
            baseUnitPrice: unitPrice,
            unitPrice: finalUnitPrice,
            quantity: item.quantity,
            lineTotal: roundMoney(finalUnitPrice * item.quantity),
            modifiers: modifierPricing.normalizedModifiers,
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
        const tax =
          taxConfig.taxMode === "exclusive"
            ? roundMoney(subtotal * taxConfig.taxRate)
            : 0;
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
            sms_opt_in: smsOptIn,
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

        const { data: insertedOrderItems, error: orderItemsError } = await supabase
          .schema("food_ordering")
          .from("order_items")
          .insert(orderItemsPayload)
          .select("id");

        if (orderItemsError) {
          throw new Error(`Order items creation failed: ${orderItemsError.message}`);
        }

        if (!insertedOrderItems || insertedOrderItems.length !== cleanedItems.length) {
          throw new Error("Order items creation failed: missing inserted item ids");
        }

        const modifierSelectionsPayload = insertedOrderItems.flatMap(
          (orderItem, index) =>
            (cleanedItems[index]?.modifiers || []).map((modifier) => ({
              order_item_id: orderItem.id,
              group_name: modifier.groupName,
              option_name: modifier.optionName,
              price_delta: modifier.price,
            }))
        );

        if (modifierSelectionsPayload.length > 0) {
          const { error: modifierSelectionsError } = await supabase
            .schema("food_ordering")
            .from("order_item_modifier_selections")
            .insert(modifierSelectionsPayload);

          if (modifierSelectionsError) {
            throw new Error(
              `Order item modifier selections creation failed: ${modifierSelectionsError.message}`
            );
          }
        }

        try {
          await incrementRestaurantUsage({
            supabase,
            restaurantId: restaurant.id,
            ordersDelta: 1,
            orderId: insertedOrder.id,
          });
        } catch (usageError) {
          console.error("Order usage increment failed:", usageError);
        }

        if (smsOptIn) {
          try {
            const businessId = await resolveBusinessIdByRestaurantId(
              supabase,
              restaurant.id
            );

            await upsertTransactionalSmsConsent({
              supabase,
              businessId,
              restaurantId: restaurant.id,
              phoneNumber: customerPhone,
              consentSource: "checkout",
            });

            const smsRestaurantName =
              String(restaurant.name || "").trim() || restaurant.slug || "the restaurant";
            const pickupText = formatPickupTimeForSms(
              requestedPickupDate,
              restaurant.timezone
            );

            await sendOrderConfirmationSms({
              supabase,
              businessId,
              env,
              to: customerPhone,
              restaurantName: smsRestaurantName,
              orderNumber: insertedOrder.order_number,
              pickupText,
            });

            try {
              await incrementRestaurantUsage({
                supabase,
                restaurantId: restaurant.id,
                smsDelta: 1,
              });
            } catch (usageError) {
              console.error("Order confirmation SMS usage increment failed:", usageError);
            }
          } catch (smsError) {
            console.error("Order confirmation SMS failed:", smsError);
          }
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
