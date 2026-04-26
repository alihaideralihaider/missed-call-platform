import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { incrementRestaurantUsage } from "@/lib/restaurant-usage";

export const runtime = "nodejs";

function buildTwiml(message: string, options?: { includePause?: boolean }) {
  const includePause = options?.includePause ?? true;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${includePause ? '<Pause length="0.5" />' : ""}
  <Say voice="Polly.Joanna-Generative">${message}</Say>
  <Hangup />
</Response>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizePhone(value: FormDataEntryValue | string | null) {
  return `${value ?? ""}`.trim() || null;
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
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

async function resolveVoiceContext(toPhone: string) {
  const supabase = createSupabaseAdminClient();
  const phoneVariants = buildPhoneVariants(toPhone);

  const { data: businessNumber, error: businessNumberError } = await supabase
    .from("business_numbers")
    .select("business_id, phone_number, is_active")
    .in("phone_number", phoneVariants)
    .eq("is_active", true)
    .maybeSingle();

  if (businessNumberError) {
    throw new Error(
      `Failed to resolve business number for ${toPhone}: ${businessNumberError.message}`
    );
  }

  if (!businessNumber?.business_id) {
    return null;
  }

  const { data: businessMap, error: businessMapError } = await supabase
    .from("business_restaurant_map")
    .select("restaurant_id")
    .eq("business_id", businessNumber.business_id)
    .maybeSingle();

  if (businessMapError) {
    throw new Error(
      `Failed to resolve business_restaurant_map for business ${businessNumber.business_id}: ${businessMapError.message}`
    );
  }

  if (!businessMap?.restaurant_id) {
    return null;
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .schema("food_ordering")
    .from("restaurants")
    .select("id, slug")
    .eq("id", businessMap.restaurant_id)
    .maybeSingle();

  if (restaurantError) {
    throw new Error(
      `Failed to resolve restaurant ${businessMap.restaurant_id}: ${restaurantError.message}`
    );
  }

  if (!restaurant?.id || !restaurant?.slug) {
    return null;
  }

  return {
    businessId: businessNumber.business_id,
    restaurantId: restaurant.id,
    restaurantSlug: restaurant.slug,
  };
}

async function hasOptOut(phoneNumber: string, businessId: string) {
  const supabase = createSupabaseAdminClient();
  const phoneVariants = buildPhoneVariants(phoneNumber);
  const { data, error } = await supabase
    .from("opt_outs")
    .select("id")
    .eq("business_id", businessId)
    .in("phone_number", phoneVariants)
    .limit(1);

  if (error) {
    throw new Error(`Failed to check opt-out status: ${error.message}`);
  }

  return Array.isArray(data) && data.length > 0;
}

async function hasTransactionalConsent(phoneNumber: string, businessId: string) {
  const supabase = createSupabaseAdminClient();
  const phoneVariants = buildPhoneVariants(phoneNumber);
  const { data, error } = await supabase
    .schema("messaging")
    .from("sms_consents")
    .select("id")
    .eq("business_id", businessId)
    .eq("consent_type", "transactional")
    .eq("consent_granted", true)
    .in("phone_number", phoneVariants)
    .limit(1);

  if (error) {
    throw new Error(`Failed to check transactional consent: ${error.message}`);
  }

  return Array.isArray(data) && data.length > 0;
}

function buildOrderLink(restaurantSlug: string) {
  const baseUrl = getRequiredEnv("PUBLIC_ORDER_BASE_URL").replace(/\/+$/, "");
  return `${baseUrl}/r/${restaurantSlug}`;
}

function getTwilioAuthHeader() {
  const accountSid = getRequiredEnv("TWILIO_ACCOUNT_SID");
  const authToken = getRequiredEnv("TWILIO_AUTH_TOKEN");

  return `Basic ${btoa(`${accountSid}:${authToken}`)}`;
}

async function sendOrderLinkSms(input: {
  to: string;
  orderLink: string;
}) {
  const accountSid = getRequiredEnv("TWILIO_ACCOUNT_SID");
  const fromNumber = getRequiredEnv("TWILIO_FROM_NUMBER");
  const body = new URLSearchParams({
    To: input.to,
    From: fromNumber,
    Body: `SaanaOS: Here is your order link: ${input.orderLink} Reply STOP to opt out.`,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: getTwilioAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio SMS request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const callSid = `${formData.get("CallSid") ?? ""}`.trim();
  const from = `${formData.get("From") ?? ""}`.trim();
  const to = `${formData.get("To") ?? ""}`.trim();

  const resolvedTo = normalizePhone(to);

  if (!resolvedTo) {
    return new Response(buildNotConfiguredTwiml(), {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  let voiceContext = null;

  try {
    voiceContext = await resolveVoiceContext(resolvedTo);
  } catch (error) {
    console.error("twilio_voice_incoming_resolution_failed", {
      callSid,
      from,
      to: resolvedTo,
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return new Response(buildNotConfiguredTwiml(), {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  if (!voiceContext) {
    console.warn("twilio_voice_incoming_missing_mapping", {
      callSid,
      from,
      to: resolvedTo,
    });

    return new Response(buildNotConfiguredTwiml(), {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  try {
    await incrementRestaurantUsage({
      restaurantId: voiceContext.restaurantId,
      callsDelta: 1,
    });
  } catch (error) {
    console.error("twilio_voice_incoming_usage_increment_failed", {
      callSid,
      from,
      to: resolvedTo,
      restaurant_id: voiceContext.restaurantId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }

  const resolvedFrom = normalizePhone(from);

  if (resolvedFrom) {
    try {
      const optedOut = await hasOptOut(resolvedFrom, voiceContext.businessId);

      if (optedOut) {
        return new Response(
          buildTwiml(
            "You have opted out of text messages. No text message will be sent. Goodbye."
          ),
          {
            status: 200,
            headers: {
              "Content-Type": "text/xml; charset=utf-8",
              "Cache-Control": "no-store",
            },
          }
        );
      }

      const hasConsent = await hasTransactionalConsent(
        resolvedFrom,
        voiceContext.businessId
      );

      if (hasConsent) {
        try {
          const orderLink = buildOrderLink(voiceContext.restaurantSlug);

          await sendOrderLinkSms({
            to: resolvedFrom,
            orderLink,
          });

          try {
            await incrementRestaurantUsage({
              restaurantId: voiceContext.restaurantId,
              smsDelta: 1,
            });
          } catch (usageError) {
            console.error("returning_caller_sms_usage_increment_failed", {
              callSid,
              restaurant_id: voiceContext.restaurantId,
              error:
                usageError instanceof Error ? usageError.message : "unknown_error",
            });
          }

          console.log("returning_caller_sms_sent", {
            callSid,
            from: resolvedFrom,
            to: resolvedTo,
            business_id: voiceContext.businessId,
            restaurant_id: voiceContext.restaurantId,
            restaurant_slug: voiceContext.restaurantSlug,
          });

          return new Response(buildTwiml("Thanks.", { includePause: false }), {
            status: 200,
            headers: {
              "Content-Type": "text/xml; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        } catch (error) {
          console.error("returning_caller_sms_failed", {
            callSid,
            from: resolvedFrom,
            to: resolvedTo,
            business_id: voiceContext.businessId,
            restaurant_id: voiceContext.restaurantId,
            error: error instanceof Error ? error.message : "unknown_error",
          });

          return new Response(
            buildTwiml("Sorry, we could not send the text message right now. Goodbye."),
            {
              status: 200,
              headers: {
                "Content-Type": "text/xml; charset=utf-8",
                "Cache-Control": "no-store",
              },
            }
          );
        }
      }
    } catch (error) {
      console.error("twilio_voice_incoming_consent_check_failed", {
        callSid,
        from: resolvedFrom,
        to: resolvedTo,
        business_id: voiceContext.businessId,
        restaurant_id: voiceContext.restaurantId,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }

  const actionUrl = new URL("/api/twilio/voice/consent", request.url);

  if (callSid) {
    actionUrl.searchParams.set("callSid", callSid);
  }

  if (from) {
    actionUrl.searchParams.set("from", from);
  }

  if (to) {
    actionUrl.searchParams.set("to", to);
  }

  actionUrl.searchParams.set("restaurant_id", voiceContext.restaurantId);
  actionUrl.searchParams.set("restaurant_slug", voiceContext.restaurantSlug);
  actionUrl.searchParams.set("business_id", voiceContext.businessId);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="0.5" />
  <Gather input="dtmf" numDigits="1" timeout="10" method="POST" action="${escapeXml(actionUrl.toString())}">
    <Say voice="Polly.Joanna-Generative">Sorry we missed your call.</Say>
    <Pause length="0.5" />
    <Say voice="Polly.Joanna-Generative">Press 1 now to receive a text message with a link to place your order.</Say>
  </Gather>
  <Pause length="0.5" />
  <Say voice="Polly.Joanna-Generative">We did not receive your selection.</Say>
  <Pause length="0.5" />
  <Say voice="Polly.Joanna-Generative">Goodbye.</Say>
  <Hangup />
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function buildNotConfiguredTwiml() {
  return buildTwiml("Sorry, this ordering line is not configured yet. Goodbye.");
}
