import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeUsPhone } from "@/lib/phone";

export type RiskSignalType = "ip" | "email" | "phone" | "user_agent";

type RestaurantSignalRow = {
  id: string;
  name: string;
  slug: string;
  onboarding_status: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  onboarding_source_ip: string | null;
  onboarding_user_agent: string | null;
  created_at: string | null;
};

type LinkedRestaurantRecord = {
  id: string;
  name: string;
  slug: string;
  onboarding_status: string | null;
  created_at: string | null;
};

export type LinkedSignalRecord = {
  signal_type: RiskSignalType;
  signal_value: string;
  masked_signal_value: string;
  linked_restaurant_count: number;
  linked_restaurants: LinkedRestaurantRecord[];
  created_at: string | null;
};

export type RestaurantRiskSummary = {
  duplicate_ip: boolean;
  duplicate_phone: boolean;
  duplicate_email: boolean;
  duplicate_user_agent: boolean;
  repeated_ip_count: number;
  repeated_phone_count: number;
  repeated_email_count: number;
  repeated_user_agent_count: number;
  linked_restaurants_count: number;
  risk_flags: string[];
  linked_signals: LinkedSignalRecord[];
};

type IdentitySignalInsertInput = {
  restaurantId: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  onboardingSourceIp?: string | null;
  onboardingUserAgent?: string | null;
  createdAt?: string | null;
};

type RestaurantSignalValue = {
  signal_type: RiskSignalType;
  signal_value: string;
  normalized_value: string;
  created_at: string | null;
};

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim();
}

function normalizeEmail(value: string | null | undefined) {
  return normalizeText(value).toLowerCase();
}

function normalizePhone(value: string | null | undefined) {
  const normalized = normalizeUsPhone(normalizeText(value));
  if (normalized) return normalized;

  const digits = normalizeText(value).replace(/\D/g, "");
  return digits ? `digits:${digits}` : "";
}

function normalizeUserAgent(value: string | null | undefined) {
  return normalizeText(value).toLowerCase();
}

function maskEmail(value: string) {
  const normalized = normalizeEmail(value);
  const [local, domain] = normalized.split("@");

  if (!local || !domain) {
    return value;
  }

  const visibleLocal = local.slice(0, 2);
  return `${visibleLocal}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return value;
  return `***-***-${digits.slice(-4)}`;
}

function maskUserAgent(value: string) {
  if (value.length <= 80) return value;
  return `${value.slice(0, 77)}...`;
}

function getMaskedSignalValue(signalType: RiskSignalType, value: string) {
  if (signalType === "email") return maskEmail(value);
  if (signalType === "phone") return maskPhone(value);
  if (signalType === "user_agent") return maskUserAgent(value);
  return value;
}

function getSignalValues(row: RestaurantSignalRow): RestaurantSignalValue[] {
  const signals: RestaurantSignalValue[] = [];

  const ip = normalizeText(row.onboarding_source_ip);
  if (ip) {
    signals.push({
      signal_type: "ip",
      signal_value: ip,
      normalized_value: ip,
      created_at: row.created_at,
    });
  }

  const email = normalizeEmail(row.contact_email);
  if (email) {
    signals.push({
      signal_type: "email",
      signal_value: row.contact_email || email,
      normalized_value: email,
      created_at: row.created_at,
    });
  }

  const phone = normalizePhone(row.contact_phone);
  if (phone) {
    signals.push({
      signal_type: "phone",
      signal_value: row.contact_phone || phone,
      normalized_value: phone,
      created_at: row.created_at,
    });
  }

  const userAgent = normalizeUserAgent(row.onboarding_user_agent);
  if (userAgent) {
    signals.push({
      signal_type: "user_agent",
      signal_value: row.onboarding_user_agent || userAgent,
      normalized_value: userAgent,
      created_at: row.created_at,
    });
  }

  return signals;
}

function buildRestaurantSignalMaps(rows: RestaurantSignalRow[]) {
  const map = new Map<string, LinkedRestaurantRecord[]>();

  for (const row of rows) {
    const signalValues = getSignalValues(row);

    for (const signal of signalValues) {
      const key = `${signal.signal_type}:${signal.normalized_value}`;
      const existing = map.get(key) || [];
      existing.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        onboarding_status: row.onboarding_status,
        created_at: row.created_at,
      });
      map.set(key, existing);
    }
  }

  return map;
}

function buildRiskSummary(
  row: RestaurantSignalRow,
  signalMap: Map<string, LinkedRestaurantRecord[]>
): RestaurantRiskSummary {
  const signals = getSignalValues(row);
  const linkedSignals: LinkedSignalRecord[] = [];
  const linkedRestaurantIds = new Set<string>();
  const countsByType: Record<RiskSignalType, number> = {
    ip: 0,
    email: 0,
    phone: 0,
    user_agent: 0,
  };

  for (const signal of signals) {
    const key = `${signal.signal_type}:${signal.normalized_value}`;
    const matches = (signalMap.get(key) || []).filter(
      (restaurant) => restaurant.id !== row.id
    );

    const uniqueMatches = matches.filter(
      (restaurant, index, array) =>
        array.findIndex((entry) => entry.id === restaurant.id) === index
    );

    uniqueMatches.forEach((restaurant) => linkedRestaurantIds.add(restaurant.id));
    countsByType[signal.signal_type] += uniqueMatches.length;

    linkedSignals.push({
      signal_type: signal.signal_type,
      signal_value: signal.signal_value,
      masked_signal_value: getMaskedSignalValue(
        signal.signal_type,
        signal.signal_value
      ),
      linked_restaurant_count: uniqueMatches.length,
      linked_restaurants: uniqueMatches,
      created_at: signal.created_at,
    });
  }

  const flags: string[] = [];
  if (countsByType.ip > 0) flags.push("duplicate_ip");
  if (countsByType.phone > 0) flags.push("duplicate_phone");
  if (countsByType.email > 0) flags.push("duplicate_email");
  if (countsByType.user_agent > 0) flags.push("duplicate_user_agent");

  return {
    duplicate_ip: countsByType.ip > 0,
    duplicate_phone: countsByType.phone > 0,
    duplicate_email: countsByType.email > 0,
    duplicate_user_agent: countsByType.user_agent > 0,
    repeated_ip_count: countsByType.ip,
    repeated_phone_count: countsByType.phone,
    repeated_email_count: countsByType.email,
    repeated_user_agent_count: countsByType.user_agent,
    linked_restaurants_count: linkedRestaurantIds.size,
    risk_flags: flags,
    linked_signals: linkedSignals,
  };
}

function isMissingIdentitySignalsTableError(message: string) {
  const normalized = String(message || "").toLowerCase();
  return (
    normalized.includes("identity_signals") &&
    (normalized.includes("does not exist") ||
      normalized.includes("relation") ||
      normalized.includes("schema cache"))
  );
}

export async function upsertIdentitySignalsForRestaurant(
  input: IdentitySignalInsertInput
) {
  const admin = createSupabaseAdminClient();

  const rows = [
    input.onboardingSourceIp
      ? {
          restaurant_id: input.restaurantId,
          signal_type: "ip",
          signal_value: normalizeText(input.onboardingSourceIp),
          signal_value_normalized: normalizeText(input.onboardingSourceIp),
          signal_source: "restaurant_onboarding",
        }
      : null,
    input.contactEmail
      ? {
          restaurant_id: input.restaurantId,
          signal_type: "email",
          signal_value: normalizeText(input.contactEmail),
          signal_value_normalized: normalizeEmail(input.contactEmail),
          signal_source: "restaurant_onboarding",
        }
      : null,
    input.contactPhone
      ? {
          restaurant_id: input.restaurantId,
          signal_type: "phone",
          signal_value: normalizeText(input.contactPhone),
          signal_value_normalized: normalizePhone(input.contactPhone),
          signal_source: "restaurant_onboarding",
        }
      : null,
    input.onboardingUserAgent
      ? {
          restaurant_id: input.restaurantId,
          signal_type: "user_agent",
          signal_value: normalizeText(input.onboardingUserAgent),
          signal_value_normalized: normalizeUserAgent(input.onboardingUserAgent),
          signal_source: "restaurant_onboarding",
        }
      : null,
  ].filter(
    (
      row
    ): row is {
      restaurant_id: string;
      signal_type: string;
      signal_value: string;
      signal_value_normalized: string;
      signal_source: string;
    } => Boolean(row?.signal_value_normalized)
  );

  if (rows.length === 0) {
    return;
  }

  const { error } = await admin.from("identity_signals").upsert(rows, {
    onConflict: "restaurant_id,signal_type,signal_value_normalized",
  });

  if (error) {
    if (isMissingIdentitySignalsTableError(error.message)) {
      console.warn("identity_signals table is missing; onboarding signal capture skipped.");
      return;
    }

    console.error("Failed to upsert identity signals:", error);
  }
}

export async function getRestaurantRiskSummaries(
  targetRestaurantIds?: string[]
): Promise<Map<string, RestaurantRiskSummary>> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .schema("food_ordering")
    .from("restaurants")
    .select(
      "id, name, slug, onboarding_status, contact_email, contact_phone, onboarding_source_ip, onboarding_user_agent, created_at"
    );

  if (error) {
    throw new Error(`Failed to load restaurant identity signals: ${error.message}`);
  }

  const restaurants = (data || []) as RestaurantSignalRow[];
  const signalMap = buildRestaurantSignalMaps(restaurants);
  const targets = targetRestaurantIds?.length
    ? restaurants.filter((restaurant) => targetRestaurantIds.includes(restaurant.id))
    : restaurants;

  const summaries = new Map<string, RestaurantRiskSummary>();

  for (const restaurant of targets) {
    summaries.set(restaurant.id, buildRiskSummary(restaurant, signalMap));
  }

  return summaries;
}

export async function maybeLogRiskLinksDetected(args: {
  restaurantId: string;
  summary: RestaurantRiskSummary;
}) {
  if (args.summary.risk_flags.length === 0) {
    return;
  }

  const admin = createSupabaseAdminClient();
  const payload = {
    risk_flags: args.summary.risk_flags,
    repeated_ip_count: args.summary.repeated_ip_count,
    repeated_phone_count: args.summary.repeated_phone_count,
    repeated_email_count: args.summary.repeated_email_count,
    repeated_user_agent_count: args.summary.repeated_user_agent_count,
    linked_restaurants_count: args.summary.linked_restaurants_count,
  };

  const { data: existingEvent, error: existingEventError } = await admin
    .from("platform_activity_events")
    .select("id, metadata")
    .eq("entity_type", "restaurant")
    .eq("entity_id", args.restaurantId)
    .eq("event_type", "risk_links_detected")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingEventError) {
    console.error("Failed to load prior risk link event:", existingEventError);
    return;
  }

  const previousMetadata = (existingEvent?.metadata || {}) as Record<string, unknown>;
  if (JSON.stringify(previousMetadata) === JSON.stringify(payload)) {
    return;
  }

  const { error } = await admin.from("platform_activity_events").insert({
    entity_type: "restaurant",
    entity_id: args.restaurantId,
    event_type: "risk_links_detected",
    actor_type: "system",
    actor_user_id: null,
    metadata: payload,
  });

  if (error) {
    console.error("Failed to log risk_links_detected event:", error);
  }
}
