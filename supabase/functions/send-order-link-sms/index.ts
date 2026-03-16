import "@supabase/functions-js/edge-runtime.d.ts";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER") || "";
const PUBLIC_BASE_URL = (Deno.env.get("PUBLIC_BASE_URL") || "").replace(/\/+$/, "");
const INTERNAL_FUNCTION_TOKEN = Deno.env.get("INTERNAL_FUNCTION_TOKEN") || "";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function buildOrderUrl(slug: string): string {
  return `${PUBLIC_BASE_URL}/order/${encodeURIComponent(slug)}`;
}

async function sendSms(to: string, body: string) {
  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const form = new URLSearchParams();
  form.set("To", to);
  form.set("From", TWILIO_FROM_NUMBER);
  form.set("Body", body);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    },
  );

  const text = await res.text();

  return {
    ok: res.ok,
    status: res.status,
    body: text,
  };
}

Deno.serve(async (req) => {
  try {
    console.log("send-order-link-sms start", { method: req.method });

    if (req.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    if (INTERNAL_FUNCTION_TOKEN) {
      const authHeader = req.headers.get("x-internal-function-token") || "";
      if (authHeader !== INTERNAL_FUNCTION_TOKEN) {
        console.error("Unauthorized internal function call");
        return json({ ok: false, error: "Unauthorized" }, 401);
      }
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
      console.error("Missing Twilio SMS secrets");
      return json({ ok: false, error: "Missing Twilio SMS secrets" }, 500);
    }

    if (!PUBLIC_BASE_URL) {
      console.error("Missing PUBLIC_BASE_URL");
      return json({ ok: false, error: "Missing PUBLIC_BASE_URL" }, 500);
    }

    const payload = await req.json().catch(() => null);

    const to = (payload?.to || "").trim();
    const businessSlug = (payload?.business_slug || "").trim();
    const businessName = (payload?.business_name || "us").trim();

    console.log("send-order-link-sms payload", {
      to,
      businessSlug,
      businessName,
    });

    if (!to || !businessSlug) {
      return json({ ok: false, error: "Missing to or business_slug" }, 400);
    }

    const orderUrl = buildOrderUrl(businessSlug);
    const smsBody = `Sorry we missed your call. Order here at menu price: ${orderUrl}`;

    const result = await sendSms(to, smsBody);

    console.log("send-order-link-sms result", {
      to,
      businessSlug,
      ok: result.ok,
      status: result.status,
      body: result.body,
    });

    return json({
      ok: result.ok,
      result,
      meta: {
        to,
        business_slug: businessSlug,
        business_name: businessName,
        order_url: orderUrl,
      },
    });
  } catch (error) {
    console.error("Unhandled send-order-link-sms error", error);
    return json({ ok: false, error: "Unhandled error" }, 500);
  }
});