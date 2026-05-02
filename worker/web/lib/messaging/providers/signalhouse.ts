import type { SendSmsInput, SendSmsResult, SmsProvider } from "@/lib/messaging/types";

async function sendSignalHouseSms(input: SendSmsInput): Promise<SendSmsResult> {
  const apiKey = process.env.SIGNALHOUSE_API_KEY?.trim();
  const fromNumber = process.env.SIGNALHOUSE_FROM_NUMBER?.trim();
  const baseUrl = process.env.SIGNALHOUSE_BASE_URL?.trim();

  if (!apiKey || !fromNumber || !baseUrl) {
    return {
      provider: "signalhouse",
      success: false,
      error: "Signal House environment variables are not configured.",
    };
  }

  // TODO: Replace this placeholder with the final Signal House API call once
  // endpoint, auth, and response format docs are available.
  void input;

  return {
    provider: "signalhouse",
    success: false,
    error: "Signal House SMS provider is not implemented yet.",
  };
}

export const signalHouseSmsProvider: SmsProvider = {
  name: "signalhouse",
  sendSms: sendSignalHouseSms,
};
