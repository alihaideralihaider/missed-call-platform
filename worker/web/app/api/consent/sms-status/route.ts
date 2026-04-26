import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SmsStatusRequest = {
  restaurantSlug?: string;
  phoneNumber?: string;
};

function normalizePhone(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function buildPhoneVariants(phoneNumber: string) {
  const digits = normalizePhone(phoneNumber);

  return Array.from(
    new Set(
      [
        phoneNumber,
        digits,
        digits ? `+${digits}` : "",
        digits.length === 10 ? `+1${digits}` : "",
        digits.length === 11 && digits.startsWith("1") ? `+${digits}` : "",
      ].filter(Boolean)
    )
  );
}

async function resolveBusinessId(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  restaurantId: string
) {
  const { data: businessMap, error: businessMapError } = await supabase
    .from("business_restaurant_map")
    .select("business_id")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!businessMapError && businessMap?.business_id) {
    return businessMap.business_id;
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (businessError) {
    throw new Error(`Failed to resolve business id: ${businessError.message}`);
  }

  return business?.id ?? null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SmsStatusRequest;
    const restaurantSlug = String(body?.restaurantSlug || "").trim().toLowerCase();
    const phoneNumber = normalizePhone(body?.phoneNumber || "");

    if (!restaurantSlug || phoneNumber.length < 10) {
      return NextResponse.json({
        hasConsent: false,
        optedOut: false,
        defaultSmsOptIn: false,
      });
    }

    const supabase = createSupabaseAdminClient();

    const { data: restaurant, error: restaurantError } = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .select("id")
      .eq("slug", restaurantSlug)
      .maybeSingle();

    if (restaurantError || !restaurant?.id) {
      return NextResponse.json({
        hasConsent: false,
        optedOut: false,
        defaultSmsOptIn: false,
      });
    }

    const businessId = await resolveBusinessId(supabase, restaurant.id);

    if (!businessId) {
      return NextResponse.json({
        hasConsent: false,
        optedOut: false,
        defaultSmsOptIn: false,
      });
    }

    const phoneVariants = buildPhoneVariants(phoneNumber);

    const [{ data: optOut }, { data: consent }] = await Promise.all([
      supabase
        .from("opt_outs")
        .select("id")
        .eq("business_id", businessId)
        .in("phone_number", phoneVariants)
        .maybeSingle(),
      supabase
        .schema("messaging")
        .from("sms_consents")
        .select("id")
        .eq("business_id", businessId)
        .eq("consent_type", "transactional")
        .eq("consent_granted", true)
        .in("phone_number", phoneVariants)
        .maybeSingle(),
    ]);

    const optedOut = Boolean(optOut?.id);
    const hasConsent = Boolean(consent?.id);

    return NextResponse.json({
      hasConsent,
      optedOut,
      defaultSmsOptIn: hasConsent && !optedOut,
    });
  } catch (error) {
    console.error("sms_status_lookup_failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return NextResponse.json({
      hasConsent: false,
      optedOut: false,
      defaultSmsOptIn: false,
    });
  }
}
