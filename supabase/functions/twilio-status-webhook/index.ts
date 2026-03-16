import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const callSid = params.get("CallSid");
    const callStatus = params.get("CallStatus");
    const durationSeconds = Number(params.get("CallDuration") || "0");
    const rawPayload = Object.fromEntries(params.entries());

    console.log("twilio-status-webhook received", {
      callSid,
      callStatus,
      durationSeconds,
    });

    if (!callSid) {
      return new Response("ok", { status: 200 });
    }

    const { outcome, wasAnswered } = mapOutcome(callStatus);
    const endedAt = new Date().toISOString();

    const { error } = await supabase
      .from("call_events")
      .update({
        call_status: callStatus,
        outcome,
        was_answered: wasAnswered,
        duration_seconds: durationSeconds,
        ended_at: endedAt,
        raw_payload: rawPayload,
      })
      .eq("provider_call_sid", callSid);

    if (error) {
      console.error("call_events update error", error);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Unhandled twilio-status-webhook error", error);
    return new Response("ok", { status: 200 });
  }
});