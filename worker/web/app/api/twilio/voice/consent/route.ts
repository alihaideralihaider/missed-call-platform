import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { incrementRestaurantUsage } from "@/lib/restaurant-usage";
import { sendSms } from "@/lib/messaging/sendSms";
import {
  recordMissedCallRecoverySms,
  recordMissedCallRecoverySmsFailure,
} from "@/lib/attempts/universalAttemptsEngine";

export const runtime = "nodejs";

const CONSENT_TABLE = process.env.TWILIO_VOICE_CONSENT_TABLE || "call_consents";
const CONSENT_SCHEMA = process.env.TWILIO_VOICE_CONSENT_SCHEMA || "messaging";

function buildTwiml(message: string, options?: { includePause?: boolean }) {
  const includePause = options?.includePause ?? true;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${includePause ? '<Pause length="0.5" />' : ""}
  <Say voice="Polly.Joanna-Generative">${message}</Say>
  <Hangup />
</Response>`;
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizePhone(value: FormDataEntryValue | string | null) {
  return `${value ?? ""}`.trim() || null;
}

function normalizeQueryValue(value: string | null) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function buildPhoneVariants(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");

  return Array.from(
    new Set(
      [
        phoneNumber,
        digits ? `+${digits}` : "",
        digits,
        digits.length === 10 ? `+1${digits}` : "",
        digits.length === 11 && digits.startsWith("1") ? `+${digits}` : "",
      ].filter(Boolean)
    )
  );
}

function buildOrderLink(restaurantSlug: string) {
  const baseUrl = getRequiredEnv("PUBLIC_ORDER_BASE_URL").replace(/\/+$/, "");

  return {
    restaurantSlug,
    orderLink: `${baseUrl}/r/${restaurantSlug}`,
  };
}

async function resolveBusinessId(restaurantId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("business_restaurant_map")
    .select("business_id")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve business id: ${error.message}`);
  }

  return data?.business_id ?? null;
}

async function isOptedOut(phoneNumber: string, businessId: string | null) {
  if (!phoneNumber || !businessId) {
    return false;
  }

  const supabase = createSupabaseAdminClient();
  const phoneVariants = buildPhoneVariants(phoneNumber);
  const { data, error } = await supabase
    .from("opt_outs")
    .select("id")
    .eq("business_id", businessId)
    .in("phone_number", phoneVariants)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check opt-out status: ${error.message}`);
  }

  return Boolean(data?.id);
}

async function insertConsentEvent(input: {
  restaurantId: string;
  callSid: string | null;
  from: string | null;
  to: string | null;
  digits: string;
  orderLink: string;
  smsSent: boolean;
  smsSid: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.schema(CONSENT_SCHEMA).from(CONSENT_TABLE).insert({
    restaurant_id: input.restaurantId,
    call_sid: input.callSid,
    from_phone: input.from,
    to_phone: input.to,
    consent_channel: "ivr",
    consent_action: "press_1_sms_link",
    consent_granted: input.digits === "1",
    digits: input.digits,
    order_link: input.orderLink,
    sms_sent: input.smsSent,
    sms_sid: input.smsSid,
  });

  if (error) {
    throw new Error(`Failed to insert consent event: ${error.message}`);
  }
}

async function upsertTransactionalSmsConsent(input: {
  businessId: string | null;
  restaurantId: string;
  phoneNumber: string;
  consentSource: "checkout" | "ivr";
}) {
  if (!input.businessId || !input.restaurantId || !input.phoneNumber) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .schema("messaging")
    .from("sms_consents")
    .upsert(
      {
        business_id: input.businessId,
        restaurant_id: input.restaurantId,
        phone_number: input.phoneNumber,
        consent_type: "transactional",
        consent_source: input.consentSource,
        consent_granted: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "business_id,phone_number,consent_type" }
    );

  if (error) {
    throw new Error(`Failed to upsert SMS consent: ${error.message}`);
  }
}

async function sendOrderLinkSms(input: {
  to: string;
  orderLink: string;
  businessId: string | null;
  restaurantId: string;
}) {
  if (await isOptedOut(input.to, input.businessId)) {
    console.log("sms_suppressed_opt_out", {
      phone_number: input.to,
      business_id: input.businessId,
    });

    return {
      sid: null,
      status: "suppressed_opt_out",
      to: input.to,
      from: null,
      suppressed: true,
    };
  }

  const result = await sendSms({
    to: input.to,
    body: `SaanaOS: Here is your order link: ${input.orderLink} Reply STOP to opt out.`,
    restaurantId: input.restaurantId,
    messageType: "ivr_consent_order_link",
    metadata: {
      businessId: input.businessId,
    },
  });

  if (!result.success) {
    throw new Error(result.error || "SMS request failed.");
  }

  return (result.raw ?? {
    sid: result.messageId,
    provider: result.provider,
  }) as {
    sid?: string | null;
    status?: string | null;
    to?: string | null;
    from?: string | null;
    provider?: string | null;
  };
}

async function resolveContextFromQuery(url: URL) {
  const restaurantId = normalizeQueryValue(url.searchParams.get("restaurant_id"));
  const restaurantSlug = normalizeQueryValue(url.searchParams.get("restaurant_slug"));
  const businessId = normalizeQueryValue(url.searchParams.get("business_id"));

  if (restaurantId && restaurantSlug) {
    return {
      restaurantId,
      restaurantSlug,
      businessId,
      usedFallback: false,
    };
  }

  const fallbackRestaurantId = process.env.DEFAULT_RESTAURANT_ID?.trim() || null;
  const fallbackRestaurantSlug = process.env.DEFAULT_RESTAURANT_SLUG?.trim() || null;

  if (fallbackRestaurantId && fallbackRestaurantSlug) {
    console.warn("twilio_voice_consent_default_restaurant_fallback", {
      restaurantId: fallbackRestaurantId,
      restaurantSlug: fallbackRestaurantSlug,
      reason: "missing_context_query_params",
    });

    return {
      restaurantId: fallbackRestaurantId,
      restaurantSlug: fallbackRestaurantSlug,
      businessId: null,
      usedFallback: true,
    };
  }

  return null;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const digits = `${formData.get("Digits") ?? ""}`.trim();
  const url = new URL(request.url);
  const rawFromForm = formData.get("From");
  const rawFromQuery = url.searchParams.get("from");
  const callSid =
    normalizePhone(formData.get("CallSid")) ?? normalizePhone(url.searchParams.get("callSid"));
  const from = normalizePhone(rawFromForm || rawFromQuery);
  const to =
    normalizePhone(formData.get("To")) ?? normalizePhone(url.searchParams.get("to"));

  console.log("twilio_voice_consent_from_resolution", {
    rawFromForm,
    rawFromQuery,
    from,
  });

  if (digits !== "1" || !from) {
    return new Response(buildTwiml("No text message will be sent. Goodbye."), {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  let resolvedContext: Awaited<ReturnType<typeof resolveContextFromQuery>> = null;
  let resolvedOrderLink = "";

  try {
    const context = await resolveContextFromQuery(url);
    resolvedContext = context;

    if (!context) {
      console.warn("twilio_voice_consent_missing_mapping", {
        callSid,
        from,
        to,
      });

      return new Response(
        buildTwiml("Sorry, this ordering line is not configured yet. Goodbye."),
        {
          status: 200,
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const { orderLink } = buildOrderLink(context.restaurantSlug);
    resolvedOrderLink = orderLink;
    const businessId =
      context.businessId || (await resolveBusinessId(context.restaurantId));
    const sms = await sendOrderLinkSms({
      to: from,
      orderLink,
      businessId,
      restaurantId: context.restaurantId,
    });

    try {
      await recordMissedCallRecoverySms({
        restaurantId: context.restaurantId,
        businessId,
        restaurantSlug: context.restaurantSlug,
        callSid,
        from,
        to,
        orderLink,
        messageType: "ivr_consent_order_link",
        sms,
      });
    } catch (attemptError) {
      console.error("attempt_message_record_failed", {
        callSid,
        from,
        restaurant_id: context.restaurantId,
        error:
          attemptError instanceof Error ? attemptError.message : "unknown_error",
      });
    }

    if (!("suppressed" in sms && sms.suppressed === true)) {
      try {
        await incrementRestaurantUsage({
          restaurantId: context.restaurantId,
          smsDelta: 1,
        });
      } catch (usageError) {
        console.error("twilio_voice_consent_usage_increment_failed", {
          callSid,
          from,
          to,
          restaurant_id: context.restaurantId,
          error:
            usageError instanceof Error ? usageError.message : "unknown_error",
        });
      }
    }

    if (!("suppressed" in sms && sms.suppressed === true)) {
      await upsertTransactionalSmsConsent({
        businessId,
        restaurantId: context.restaurantId,
        phoneNumber: from,
        consentSource: "ivr",
      });
    }

    console.log("twilio_voice_consent_sms_response", {
      sid: sms.sid ?? null,
      status: "status" in sms ? sms.status ?? null : null,
      to: "to" in sms ? sms.to ?? null : null,
      from: "from" in sms ? sms.from ?? null : null,
      sms,
    });

    await insertConsentEvent({
      restaurantId: context.restaurantId,
      callSid,
      from,
      to,
      digits,
      orderLink,
      smsSent: !("suppressed" in sms && sms.suppressed === true),
      smsSid: sms.sid ?? null,
    });

    return new Response(buildTwiml("Thanks.", { includePause: false }), {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (resolvedContext && from && resolvedOrderLink) {
      try {
        await recordMissedCallRecoverySmsFailure({
          restaurantId: resolvedContext.restaurantId,
          businessId: resolvedContext.businessId,
          restaurantSlug: resolvedContext.restaurantSlug,
          callSid,
          from,
          to,
          orderLink: resolvedOrderLink,
          messageType: "ivr_consent_order_link",
          error,
        });
      } catch (attemptError) {
        console.error("attempt_message_failure_record_failed", {
          callSid,
          from,
          restaurant_id: resolvedContext.restaurantId,
          error:
            attemptError instanceof Error ? attemptError.message : "unknown_error",
        });
      }
    }

    console.error("twilio_voice_consent_failed", {
      callSid,
      from,
      to,
      digits,
      error: error instanceof Error ? error.message : "unknown_error",
    });

    try {
      const context = await resolveContextFromQuery(url);

      if (context) {
        const { orderLink } = buildOrderLink(context.restaurantSlug);

        await insertConsentEvent({
          restaurantId: context.restaurantId,
          callSid,
          from,
          to,
          digits,
          orderLink,
          smsSent: false,
          smsSid: null,
        });
      }
    } catch (insertError) {
      console.error("twilio_voice_consent_insert_failed", {
        callSid,
        from,
        to,
        digits,
        error: insertError instanceof Error ? insertError.message : "unknown_error",
      });
    }

    return new Response(buildTwiml("No text message will be sent. Goodbye."), {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
