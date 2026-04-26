import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const SMS_COST_ESTIMATE = 0.01;
export const CALL_COST_ESTIMATE = 0.02;

export const PLAN_USAGE_LIMITS = {
  base_monthly: {
    orders: 100,
    sms: 300,
    calls: 100,
  },
  pro_monthly: {
    orders: 300,
    sms: 900,
    calls: 300,
  },
  pro_plus_monthly: {
    orders: 300,
    sms: 900,
    calls: 300,
  },
} as const;

type UsagePeriod = {
  periodStart: string;
  periodEnd: string;
};

type UsageIncrementArgs = {
  restaurantId: string;
  ordersDelta?: number;
  smsDelta?: number;
  callsDelta?: number;
  orderId?: string | null;
};

type UsageRow = {
  period_start: string;
  period_end: string;
  orders_count: number;
  sms_sent_count: number;
  calls_count: number;
  estimated_sms_cost: number;
  estimated_call_cost: number;
  estimated_total_cost: number;
};

function startOfMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function addMonthsUtc(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function roundCost(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function normalizeCount(value: number | null | undefined) {
  const count = Math.floor(Number(value) || 0);
  return count > 0 ? count : 0;
}

function getPlanKeyWithFallback(planKey: string | null | undefined) {
  if (planKey === "pro_monthly") {
    return "pro_monthly";
  }

  if (planKey === "pro_plus_monthly") {
    return "pro_plus_monthly";
  }

  return "base_monthly";
}

function computeUsageCosts(smsSentCount: number, callsCount: number) {
  const estimatedSmsCost = roundCost(smsSentCount * SMS_COST_ESTIMATE);
  const estimatedCallCost = roundCost(callsCount * CALL_COST_ESTIMATE);

  return {
    estimatedSmsCost,
    estimatedCallCost,
    estimatedTotalCost: roundCost(estimatedSmsCost + estimatedCallCost),
  };
}

export function getCurrentUsagePeriod(now = new Date()): UsagePeriod {
  return {
    periodStart: formatDateOnly(startOfMonthUtc(now)),
    periodEnd: formatDateOnly(endOfMonthUtc(now)),
  };
}

export async function incrementRestaurantUsage({
  restaurantId,
  ordersDelta = 0,
  smsDelta = 0,
  callsDelta = 0,
  orderId = null,
}: UsageIncrementArgs) {
  if (!restaurantId) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const period = getCurrentUsagePeriod();

  const { data: existing, error: existingError } = await supabase
    .schema("food_ordering")
    .from("restaurant_usage_periods")
    .select(
      "id, period_start, period_end, orders_count, sms_sent_count, calls_count, estimated_sms_cost, estimated_call_cost, estimated_total_cost"
    )
    .eq("restaurant_id", restaurantId)
    .eq("period_start", period.periodStart)
    .eq("period_end", period.periodEnd)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to load restaurant usage period: ${existingError.message}`);
  }

  let ordersCount = normalizeCount(existing?.orders_count);

  if (orderId) {
    const periodEndExclusive = formatDateOnly(addMonthsUtc(startOfMonthUtc(new Date()), 1));
    const { count, error: countError } = await supabase
      .schema("food_ordering")
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .gte("created_at", `${period.periodStart}T00:00:00.000Z`)
      .lt("created_at", `${periodEndExclusive}T00:00:00.000Z`);

    if (countError) {
      throw new Error(`Failed to count restaurant orders for usage: ${countError.message}`);
    }

    ordersCount = normalizeCount(count || 0);
  } else {
    ordersCount += Math.max(0, Math.floor(ordersDelta));
  }

  const smsSentCount = normalizeCount(existing?.sms_sent_count) + Math.max(0, Math.floor(smsDelta));
  const callsCount = normalizeCount(existing?.calls_count) + Math.max(0, Math.floor(callsDelta));
  const costs = computeUsageCosts(smsSentCount, callsCount);

  const payload = {
    restaurant_id: restaurantId,
    period_start: period.periodStart,
    period_end: period.periodEnd,
    orders_count: ordersCount,
    sms_sent_count: smsSentCount,
    calls_count: callsCount,
    estimated_sms_cost: costs.estimatedSmsCost,
    estimated_call_cost: costs.estimatedCallCost,
    estimated_total_cost: costs.estimatedTotalCost,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .schema("food_ordering")
    .from("restaurant_usage_periods")
    .upsert(payload, { onConflict: "restaurant_id,period_start,period_end" })
    .select(
      "period_start, period_end, orders_count, sms_sent_count, calls_count, estimated_sms_cost, estimated_call_cost, estimated_total_cost"
    )
    .single();

  if (error) {
    throw new Error(`Failed to upsert restaurant usage: ${error.message}`);
  }

  return data as UsageRow;
}

export async function getRestaurantUsageSummary(restaurantId: string) {
  const supabase = createSupabaseAdminClient();
  const period = getCurrentUsagePeriod();

  const [{ data: usage }, { data: billing }] = await Promise.all([
    supabase
      .schema("food_ordering")
      .from("restaurant_usage_periods")
      .select(
        "period_start, period_end, orders_count, sms_sent_count, calls_count, estimated_sms_cost, estimated_call_cost, estimated_total_cost"
      )
      .eq("restaurant_id", restaurantId)
      .eq("period_start", period.periodStart)
      .eq("period_end", period.periodEnd)
      .maybeSingle(),
    supabase
      .schema("food_ordering")
      .from("restaurant_billing")
      .select("plan_key")
      .eq("restaurant_id", restaurantId)
      .maybeSingle(),
  ]);

  const planKey = getPlanKeyWithFallback(billing?.plan_key);
  const limits = PLAN_USAGE_LIMITS[planKey];
  const summary = {
    periodStart: usage?.period_start || period.periodStart,
    periodEnd: usage?.period_end || period.periodEnd,
    ordersCount: normalizeCount(usage?.orders_count),
    smsSentCount: normalizeCount(usage?.sms_sent_count),
    callsCount: normalizeCount(usage?.calls_count),
    estimatedSmsCost: Number(usage?.estimated_sms_cost || 0),
    estimatedCallCost: Number(usage?.estimated_call_cost || 0),
    estimatedTotalCost: Number(usage?.estimated_total_cost || 0),
    planKey,
    limits,
  };

  const ordersRatio = limits.orders > 0 ? summary.ordersCount / limits.orders : 0;
  const smsRatio = limits.sms > 0 ? summary.smsSentCount / limits.sms : 0;
  const callsRatio = limits.calls > 0 ? summary.callsCount / limits.calls : 0;
  const highestRatio = Math.max(ordersRatio, smsRatio, callsRatio);
  const status =
    highestRatio >= 1 ? "over_limit" : highestRatio >= 0.8 ? "warning" : "ok";

  return {
    ...summary,
    percentages: {
      orders: Math.round(ordersRatio * 100),
      sms: Math.round(smsRatio * 100),
      calls: Math.round(callsRatio * 100),
    },
    status,
    message:
      status === "over_limit"
        ? "You are over the included monthly usage. Early access limits are flexible, but we may recommend an upgrade if usage stays high."
        : status === "warning"
          ? "You're nearing your included monthly usage."
          : "",
  };
}
