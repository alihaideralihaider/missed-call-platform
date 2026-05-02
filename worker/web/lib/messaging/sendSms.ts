import { signalHouseSmsProvider } from "@/lib/messaging/providers/signalhouse";
import { twilioSmsProvider } from "@/lib/messaging/providers/twilio";
import type { SendSmsInput, SendSmsResult, SmsProviderName } from "@/lib/messaging/types";

function isSmsProviderName(value: unknown): value is SmsProviderName {
  return value === "twilio" || value === "signalhouse";
}

function getRequestedProvider(input: SendSmsInput): SmsProviderName {
  const metadataProvider = input.metadata?.provider;

  if (isSmsProviderName(metadataProvider)) {
    return metadataProvider;
  }

  const envProvider = process.env.SMS_PROVIDER_OVERRIDE?.trim().toLowerCase();

  if (isSmsProviderName(envProvider)) {
    return envProvider;
  }

  return "twilio";
}

function shouldFallbackToTwilio() {
  return process.env.SMS_FALLBACK_TO_TWILIO?.trim().toLowerCase() === "true";
}

function logSmsResult(args: {
  selectedProvider: SmsProviderName;
  result: SendSmsResult;
  input: SendSmsInput;
  fallbackUsed?: boolean;
}) {
  const { selectedProvider, result, input, fallbackUsed = false } = args;

  console.log("sms_provider_result", {
    selectedProvider,
    provider: result.provider,
    messageType: input.messageType || null,
    restaurantId: input.restaurantId || null,
    success: result.success,
    fallbackUsed,
    error: result.error || null,
  });
}

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  if (!input?.to || !input?.body) {
    return {
      provider: "twilio",
      success: false,
      error: "SMS input requires to and body.",
    };
  }

  const selectedProvider = getRequestedProvider(input);
  const provider =
    selectedProvider === "signalhouse" ? signalHouseSmsProvider : twilioSmsProvider;

  const result = await provider.sendSms(input).catch((error) => ({
    provider: selectedProvider,
    success: false,
    error: error instanceof Error ? error.message : "Unknown SMS provider error",
  }));
  logSmsResult({ selectedProvider, result, input });

  if (
    selectedProvider === "signalhouse" &&
    !result.success &&
    shouldFallbackToTwilio()
  ) {
    const fallbackResult = await twilioSmsProvider.sendSms(input).catch((error) => ({
      provider: "twilio" as const,
      success: false,
      error: error instanceof Error ? error.message : "Unknown Twilio fallback error",
    }));
    logSmsResult({
      selectedProvider,
      result: fallbackResult,
      input,
      fallbackUsed: true,
    });

    return fallbackResult;
  }

  return result;
}
