import type { SupabaseClient } from "@supabase/supabase-js";

export const SMS_COST_ESTIMATE = 0.01;
export const CALL_COST_ESTIMATE = 0.02;

type UsagePeriod = {
  periodStart: string;
  periodEnd: string;
};

type IncrementRestaurantUsageArgs = {
  supabase: SupabaseClient;
  restaurantId: string;
  ordersDelta?: number;
  smsDelta?: number;
  callsDelta?: number;
  orderId?: string | null;
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
  supabase,
  restaurantId,
  ordersDelta = 0,
  smsDelta = 0,
  callsDelta = 0,
  orderId = null,
}: IncrementRestaurantUsageArgs) {
  if (!restaurantId) {
    return null;
  }

  const period = getCurrentUsagePeriod();
  const { data: existing, error: existingError } = await supabase
    .schema("food_ordering")
    .from("restaurant_usage_periods")
    .select("orders_count, sms_sent_count, calls_count")
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

  const { data, error } = await supabase
    .schema("food_ordering")
    .from("restaurant_usage_periods")
    .upsert(
      {
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
      },
      { onConflict: "restaurant_id,period_start,period_end" }
    )
    .select(
      "period_start, period_end, orders_count, sms_sent_count, calls_count, estimated_sms_cost, estimated_call_cost, estimated_total_cost"
    )
    .single();

  if (error) {
    throw new Error(`Failed to upsert restaurant usage: ${error.message}`);
  }

  return data;
}
