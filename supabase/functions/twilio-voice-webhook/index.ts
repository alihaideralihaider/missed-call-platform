import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_FUNCTION_TOKEN = Deno.env.get("INTERNAL_FUNCTION_TOKEN") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function xml(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}

function normalizePhone(input: string | null): string {
  if (!input) return "";
  return input.trim().replace(/\s+/g, "");
}

function mapOutcome(callStatus: string | null): {
  outcome: string;
  wasAnswered: boolean;
} {
  const status = (callStatus || "").toLowerCase();

  switch (status) {
    case "completed":
    case "in-progress":
      return { outcome: "answered", wasAnswered: true };
    case "busy":
      return { outcome: "busy", wasAnswered: false };
    case "no-answer":
      return { outcome: "no_answer", wasAnswered: false };
    case "failed":
      return { outcome: "failed", wasAnswered: false };
    case "ringing":
    case "queued":
    default:
      return { outcome: "missed", wasAnswered: false };
  }
}

async function triggerOrderLinkSms(args: {
  to: string;
  businessSlug: string;
  businessName: string;
}) {
  const url = `${SUPABASE_URL}/functions/v1/send-order-link-sms`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-function-token": INTERNAL_FUNCTION_TOKEN,
    },
    body: JSON.stringify({
      to: args.to,
      business_slug: args.businessSlug,
      business_name: args.businessName,
    }),
  });

  const text = await res.text();

  return {
    ok: res.ok,
    status: res.status,
    body: text,
  };
}

Deno.serve(async (req) => {
  try {
    console.log("twilio-voice-webhook start", { method: req.method });

    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const callSid = params.get("CallSid");
    const from = normalizePhone(params.get("From"));
    const to = normalizePhone(params.get("To"));
    const callStatus = params.get("CallStatus");
    const direction = (params.get("Direction") || "inbound").toLowerCase();
    const durationRaw = params.get("CallDuration");
    const durationSeconds = durationRaw ? Number(durationRaw) || 0 : 0;
    const rawPayload = Object.fromEntries(params.entries());

    console.log("twilio-voice-webhook parsed", {
      callSid,
      from,
      to,
      callStatus,
      direction,
      durationSeconds,
    });

    if (!callSid || !to) {
      console.warn("Missing callSid or to", { callSid, to });
      return xml(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
    }

    const { outcome, wasAnswered } = mapOutcome(callStatus);

    const { data: businessNumber, error: businessNumberError } = await supabase
      .from("business_numbers")
      .select("id, business_id, phone_number, is_active")
      .eq("phone_number", to)
      .eq("is_active", true)
      .maybeSingle();

    if (businessNumberError) {
      console.error("business_numbers lookup error", businessNumberError);
      return xml(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
    }

    if (!businessNumber) {
      console.warn("No active business number found for", to);
      return xml(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, slug, name")
      .eq("id", businessNumber.business_id)
      .maybeSingle();

    if (businessError) {
      console.error("business lookup error", businessError);
      return xml(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
    }

    if (!business) {
      console.error("Business not found for business_id", businessNumber.business_id);
      return xml(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
    }

    const now = new Date().toISOString();

    const insertPayload = {
      business_id: businessNumber.business_id,
      business_number_id: businessNumber.id,
      provider: "twilio",
      provider_call_sid: callSid,
      from_number: from,
      to_number: to,
      direction: "inbound",
      call_status: callStatus,
      outcome,
      was_answered: wasAnswered,
      duration_seconds: durationSeconds,
      received_at: now,
      created_at: now,
      raw_payload: rawPayload,
    };

    console.log("call_events upsert payload", insertPayload);

    const { data: upsertData, error: insertError } = await supabase
      .from("call_events")
      .upsert(insertPayload, { onConflict: "provider_call_sid" })
      .select();

    if (insertError) {
      console.error("call_events upsert error", insertError);
      return xml(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
    }

    console.log("call_events upsert success", upsertData);

    if (!from) {
      console.warn("Caller phone missing, skipping SMS");
      return xml(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
    }

    const smsResult = await triggerOrderLinkSms({
      to: from,
      businessSlug: business.slug,
      businessName: business.name || "",
    });

    console.log("triggerOrderLinkSms result", smsResult);

    return xml(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  } catch (error) {
    console.error("Unhandled twilio-voice-webhook error", error);
    return xml(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }
});