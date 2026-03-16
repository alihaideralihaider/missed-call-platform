Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const messageSid = params.get("MessageSid");
    const from = params.get("From");
    const to = params.get("To");
    const body = params.get("Body");

    console.log("twilio-inbound-sms-webhook received", {
      messageSid,
      from,
      to,
      body,
    });

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Unhandled twilio-inbound-sms-webhook error", error);
    return new Response("ok", { status: 200 });
  }
});