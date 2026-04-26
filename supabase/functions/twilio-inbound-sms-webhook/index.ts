import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const STOP_KEYWORDS = new Set([
  "STOP",
  "STOPALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
]);

const HELP_KEYWORDS = new Set(["HELP"]);
const START_KEYWORDS = new Set(["START", "UNSTOP"]);

const STOP_RESPONSE =
  "You have been unsubscribed and will no longer receive SMS messages from SaanaOS. Reply START to resubscribe.";
const HELP_RESPONSE =
  "SaanaOS: For help, contact the restaurant directly or visit https://www.saanaos.com. Reply STOP to opt out.";
const START_RESPONSE =
  "You have been resubscribed to SaanaOS order-related messages.";

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function normalizePhone(input: string | null): string {
  return (input || "").trim();
}

function normalizeBody(input: string | null): string {
  return (input || "").trim();
}

function normalizeCommand(input: string | null): string {
  return normalizeBody(input).toUpperCase().replace(/\s+/g, "");
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twimlMessage(message: string, status = 200) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`,
    {
      status,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
    },
  );
}

async function resolveBusinessIdByToNumber(to: string): Promise<string | null> {
  if (!supabase || !to) {
    return null;
  }

  const { data, error } = await supabase
    .from("business_numbers")
    .select("business_id")
    .eq("phone_number", to)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("twilio-inbound-sms-webhook business lookup error", {
      to,
      error,
    });
    return null;
  }

  return data?.business_id || null;
}

async function saveOptOut(phoneNumber: string, businessId: string | null) {
  if (!supabase || !phoneNumber) {
    return;
  }

  if (businessId) {
    const { error } = await supabase
      .from("opt_outs")
      .upsert(
        {
          business_id: businessId,
          phone_number: phoneNumber,
          source: "sms_reply",
        },
        { onConflict: "business_id,phone_number" },
      );

    if (error) {
      console.error("twilio-inbound-sms-webhook opt-out upsert error", {
        businessId,
        phoneNumber,
        error,
      });
    }

    return;
  }

  const { error } = await supabase.from("opt_outs").insert({
    business_id: null,
    phone_number: phoneNumber,
    source: "sms_reply",
  });

  if (error) {
    console.error("twilio-inbound-sms-webhook opt-out insert error", {
      businessId,
      phoneNumber,
      error,
    });
  }
}

async function clearOptOut(phoneNumber: string, businessId: string | null) {
  if (!supabase || !phoneNumber) {
    return;
  }

  let query = supabase.from("opt_outs").delete().eq("phone_number", phoneNumber);

  query = businessId ? query.eq("business_id", businessId) : query.is("business_id", null);

  const { error } = await query;

  if (error) {
    console.error("twilio-inbound-sms-webhook opt-out delete error", {
      businessId,
      phoneNumber,
      error,
    });
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const messageSid = params.get("MessageSid");
    const from = normalizePhone(params.get("From"));
    const to = normalizePhone(params.get("To"));
    const body = normalizeBody(params.get("Body"));
    const command = normalizeCommand(body);

    console.log("twilio-inbound-sms-webhook received", {
      messageSid,
      from,
      to,
      body,
      command,
    });

    const businessId = await resolveBusinessIdByToNumber(to);

    if (STOP_KEYWORDS.has(command)) {
      await saveOptOut(from, businessId);
      return twimlMessage(STOP_RESPONSE);
    }

    if (HELP_KEYWORDS.has(command)) {
      return twimlMessage(HELP_RESPONSE);
    }

    if (START_KEYWORDS.has(command)) {
      await clearOptOut(from, businessId);
      return twimlMessage(START_RESPONSE);
    }

    return new Response("", { status: 200 });
  } catch (error) {
    console.error("Unhandled twilio-inbound-sms-webhook error", error);
    return new Response("ok", { status: 200 });
  }
});
