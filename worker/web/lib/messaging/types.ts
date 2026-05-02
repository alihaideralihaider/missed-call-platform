export type SmsProviderName = "twilio" | "signalhouse";

export type SendSmsInput = {
  to: string;
  body: string;
  restaurantId?: string;
  messageType?: string;
  metadata?: Record<string, unknown>;
};

export type SendSmsResult = {
  provider: SmsProviderName;
  success: boolean;
  messageId?: string;
  error?: string;
  raw?: unknown;
};

export type SmsProvider = {
  name: SmsProviderName;
  sendSms: (input: SendSmsInput) => Promise<SendSmsResult>;
};
