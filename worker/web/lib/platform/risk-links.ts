import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeUsPhone } from "@/lib/phone";

export type RiskSignalType = "ip" | "email" | "phone" | "user_agent";
export type LocationLinkScope = "city" | "region" | "country";

type RestaurantSignalRow = {
  id: string;
  name: string;
  slug: string;
  onboarding_status: string | null;
  platform_review_status: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  onboarding_source_ip: string | null;
  onboarding_user_agent: string | null;
  onboarding_ip_country: string | null;
  onboarding_ip_region: string | null;
  onboarding_ip_city: string | null;
  onboarding_ip_lat: number | null;
  onboarding_ip_lon: number | null;
  onboarding_ip_lookup_at: string | null;
  created_at: string | null;
};

type LinkedRestaurantRecord = {
  id: string;
  name: string;
  slug: string;
  onboarding_status: string | null;
  platform_review_status: string | null;
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

export type LocationLinkRecord = {
  scope: LocationLinkScope;
  label: string;
  linked_restaurant_count: number;
  distinct_ip_count: number;
  linked_restaurants: LinkedRestaurantRecord[];
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
  same_city_count: number;
  same_region_count: number;
  same_country_count: number;
  distinct_ips_same_city_count: number;
  risk_flags: string[];
  linked_signals: LinkedSignalRecord[];
  location_links: LocationLinkRecord[];
};

type IdentitySignalInsertInput = {
  restaurantId: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  onboardingSourceIp?: string | null;
  onboardingUserAgent?: string | null;
};

type RestaurantSignalValue = {
  signal_type: RiskSignalType;
  signal_value: string;
  normalized_value: string;
  created_at: string | null;
};

type LocationMaps = {
  cityMap: Map<string, LinkedRestaurantRecord[]>;
  regionMap: Map<string, LinkedRestaurantRecord[]>;
  countryMap: Map<string, LinkedRestaurantRecord[]>;
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

function normalizeLocationPart(value: string | null | undefined) {
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

function formatCityLabel(row: RestaurantSignalRow) {
  const parts = [
    normalizeText(row.onboarding_ip_city),
    normalizeText(row.onboarding_ip_region),
    normalizeText(row.onboarding_ip_country),
  ].filter(Boolean);

  return parts.join(", ");
}

function formatRegionLabel(row: RestaurantSignalRow) {
  const parts = [
    normalizeText(row.onboarding_ip_region),
    normalizeText(row.onboarding_ip_country),
  ].filter(Boolean);

  return parts.join(", ");
}

function formatCountryLabel(row: RestaurantSignalRow) {
  return normalizeText(row.onboarding_ip_country);
}

function getCityKey(row: RestaurantSignalRow) {
  const city = normalizeLocationPart(row.onboarding_ip_city);
  const region = normalizeLocationPart(row.onboarding_ip_region);
  const country = normalizeLocationPart(row.onboarding_ip_country);

  if (!city || !region || !country) {
    return "";
  }

  return `${city}|${region}|${country}`;
}

function getRegionKey(row: RestaurantSignalRow) {
  const region = normalizeLocationPart(row.onboarding_ip_region);
  const country = normalizeLocationPart(row.onboarding_ip_country);

  if (!region || !country) {
    return "";
  }

  return `${region}|${country}`;
}

function getCountryKey(row: RestaurantSignalRow) {
  return normalizeLocationPart(row.onboarding_ip_country);
}

function getLinkedRestaurantRecord(row: RestaurantSignalRow): LinkedRestaurantRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    onboarding_status: row.onboarding_status,
    platform_review_status: row.platform_review_status,
    created_at: row.created_at,
  };
}

function dedupeLinkedRestaurants(rows: LinkedRestaurantRecord[]) {
  return rows.filter(
    (row, index, array) => array.findIndex((entry) => entry.id === row.id) === index
  );
}

function countDistinctIps(rows: RestaurantSignalRow[], currentRestaurantId: string) {
  const distinctIps = new Set<string>();

  for (const row of rows) {
    if (row.id === currentRestaurantId) {
      continue;
    }

    const ip = normalizeText(row.onboarding_source_ip);
    if (ip) {
      distinctIps.add(ip);
    }
  }

  return distinctIps.size;
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
      existing.push(getLinkedRestaurantRecord(row));
      map.set(key, existing);
    }
  }

  return map;
}

function buildLocationMaps(rows: RestaurantSignalRow[]): LocationMaps {
  const cityMap = new Map<string, LinkedRestaurantRecord[]>();
  const regionMap = new Map<string, LinkedRestaurantRecord[]>();
  const countryMap = new Map<string, LinkedRestaurantRecord[]>();

  for (const row of rows) {
    const linkedRestaurant = getLinkedRestaurantRecord(row);
    const cityKey = getCityKey(row);
    const regionKey = getRegionKey(row);
    const countryKey = getCountryKey(row);

    if (cityKey) {
      const existing = cityMap.get(cityKey) || [];
      existing.push(linkedRestaurant);
      cityMap.set(cityKey, existing);
    }

    if (regionKey) {
      const existing = regionMap.get(regionKey) || [];
      existing.push(linkedRestaurant);
      regionMap.set(regionKey, existing);
    }

    if (countryKey) {
      const existing = countryMap.get(countryKey) || [];
      existing.push(linkedRestaurant);
      countryMap.set(countryKey, existing);
    }
  }

  return {
    cityMap,
    regionMap,
    countryMap,
  };
}

function buildLocationLinks(
  row: RestaurantSignalRow,
  allRows: RestaurantSignalRow[],
  locationMaps: LocationMaps
) {
  const cityKey = getCityKey(row);
  const regionKey = getRegionKey(row);
  const countryKey = getCountryKey(row);

  const sameCityRows = cityKey
    ? allRows.filter(
        (entry) => entry.id !== row.id && getCityKey(entry) === cityKey
      )
    : [];
  const sameRegionRows = regionKey
    ? allRows.filter(
        (entry) => entry.id !== row.id && getRegionKey(entry) === regionKey
      )
    : [];
  const sameCountryRows = countryKey
    ? allRows.filter(
        (entry) => entry.id !== row.id && getCountryKey(entry) === countryKey
      )
    : [];

  const sameCityLinked = cityKey
    ? dedupeLinkedRestaurants(
        (locationMaps.cityMap.get(cityKey) || []).filter(
          (entry) => entry.id !== row.id
        )
      )
    : [];
  const sameRegionLinked = regionKey
    ? dedupeLinkedRestaurants(
        (locationMaps.regionMap.get(regionKey) || []).filter(
          (entry) => entry.id !== row.id
        )
      )
    : [];
  const sameCountryLinked = countryKey
    ? dedupeLinkedRestaurants(
        (locationMaps.countryMap.get(countryKey) || []).filter(
          (entry) => entry.id !== row.id
        )
      )
    : [];

  const locationLinks: LocationLinkRecord[] = [];

  if (cityKey) {
    locationLinks.push({
      scope: "city",
      label: formatCityLabel(row),
      linked_restaurant_count: sameCityLinked.length,
      distinct_ip_count: countDistinctIps(sameCityRows, row.id),
      linked_restaurants: sameCityLinked,
    });
  }

  if (regionKey) {
    locationLinks.push({
      scope: "region",
      label: formatRegionLabel(row),
      linked_restaurant_count: sameRegionLinked.length,
      distinct_ip_count: countDistinctIps(sameRegionRows, row.id),
      linked_restaurants: sameRegionLinked,
    });
  }

  if (countryKey) {
    locationLinks.push({
      scope: "country",
      label: formatCountryLabel(row),
      linked_restaurant_count: sameCountryLinked.length,
      distinct_ip_count: countDistinctIps(sameCountryRows, row.id),
      linked_restaurants: sameCountryLinked,
    });
  }

  return {
    sameCityCount: sameCityLinked.length,
    sameRegionCount: sameRegionLinked.length,
    sameCountryCount: sameCountryLinked.length,
    distinctIpsSameCityCount: countDistinctIps(sameCityRows, row.id),
    locationLinks,
  };
}

function buildRiskSummary(
  row: RestaurantSignalRow,
  allRows: RestaurantSignalRow[],
  signalMap: Map<string, LinkedRestaurantRecord[]>,
  locationMaps: LocationMaps
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
    const matches = dedupeLinkedRestaurants(
      (signalMap.get(key) || []).filter((restaurant) => restaurant.id !== row.id)
    );

    matches.forEach((restaurant) => linkedRestaurantIds.add(restaurant.id));
    countsByType[signal.signal_type] += matches.length;

    linkedSignals.push({
      signal_type: signal.signal_type,
      signal_value: signal.signal_value,
      masked_signal_value: getMaskedSignalValue(
        signal.signal_type,
        signal.signal_value
      ),
      linked_restaurant_count: matches.length,
      linked_restaurants: matches,
      created_at: signal.created_at,
    });
  }

  const locationLinks = buildLocationLinks(row, allRows, locationMaps);
  locationLinks.locationLinks.forEach((link) => {
    link.linked_restaurants.forEach((restaurant) => linkedRestaurantIds.add(restaurant.id));
  });

  const flags: string[] = [];
  if (countsByType.ip > 0) flags.push("duplicate_ip");
  if (countsByType.phone > 0) flags.push("duplicate_phone");
  if (countsByType.email > 0) flags.push("duplicate_email");
  if (countsByType.user_agent > 0) flags.push("duplicate_user_agent");
  if (locationLinks.sameCityCount >= 2) flags.push("location_city_cluster");
  if (locationLinks.sameRegionCount >= 5) flags.push("location_region_cluster");
  if (locationLinks.distinctIpsSameCityCount >= 2) {
    flags.push("moving_ip_same_location");
  }

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
    same_city_count: locationLinks.sameCityCount,
    same_region_count: locationLinks.sameRegionCount,
    same_country_count: locationLinks.sameCountryCount,
    distinct_ips_same_city_count: locationLinks.distinctIpsSameCityCount,
    risk_flags: flags,
    linked_signals: linkedSignals,
    location_links: locationLinks.locationLinks,
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
      "id, name, slug, onboarding_status, platform_review_status, contact_email, contact_phone, onboarding_source_ip, onboarding_user_agent, onboarding_ip_country, onboarding_ip_region, onboarding_ip_city, onboarding_ip_lat, onboarding_ip_lon, onboarding_ip_lookup_at, created_at"
    );

  if (error) {
    throw new Error(`Failed to load restaurant identity signals: ${error.message}`);
  }

  const restaurants = (data || []) as RestaurantSignalRow[];
  const signalMap = buildRestaurantSignalMaps(restaurants);
  const locationMaps = buildLocationMaps(restaurants);
  const targets = targetRestaurantIds?.length
    ? restaurants.filter((restaurant) => targetRestaurantIds.includes(restaurant.id))
    : restaurants;

  const summaries = new Map<string, RestaurantRiskSummary>();

  for (const restaurant of targets) {
    summaries.set(
      restaurant.id,
      buildRiskSummary(restaurant, restaurants, signalMap, locationMaps)
    );
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
    same_city_count: args.summary.same_city_count,
    same_region_count: args.summary.same_region_count,
    same_country_count: args.summary.same_country_count,
    distinct_ips_same_city_count: args.summary.distinct_ips_same_city_count,
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
