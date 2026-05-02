import type { SendSmsInput, SendSmsResult, SmsProvider } from "@/lib/messaging/types";

type TwilioMessageResponse = {
  sid?: string;
  code?: number | string;
  message?: string;
  status?: string;
  to?: string;
  from?: string;
};

function getTwilioAuth(accountSid: string, authToken: string) {
  const encoded =
    typeof btoa === "function"
      ? btoa(`${accountSid}:${authToken}`)
      : Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  return `Basic ${encoded}`;
}

async function sendTwilioSms(input: SendSmsInput): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim();

  if (!accountSid || !authToken || !fromNumber) {
    return {
      provider: "twilio",
      success: false,
      error: "Missing Twilio environment variables.",
    };
  }

  const formBody = new URLSearchParams({
    To: input.to,
    From: fromNumber,
    Body: input.body,
  });

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: getTwilioAuth(accountSid, authToken),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
      }
    );

    const rawText = await response.text();
    let parsed: TwilioMessageResponse | null = null;

    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      return {
        provider: "twilio",
        success: false,
        messageId: parsed?.sid,
        error: parsed?.message || `Twilio send failed: ${response.status}`,
        raw: parsed || rawText,
      };
    }

    return {
      provider: "twilio",
      success: true,
      messageId: parsed?.sid || "",
      raw: parsed,
    };
  } catch (error) {
    return {
      provider: "twilio",
      success: false,
      error: error instanceof Error ? error.message : "Unknown Twilio error",
    };
  }
}

export const twilioSmsProvider: SmsProvider = {
  name: "twilio",
  sendSms: sendTwilioSms,
};
