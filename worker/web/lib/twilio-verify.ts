import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!accountSid || !authToken || !verifyServiceSid) {
  console.warn("Twilio Verify env vars are missing.");
}

const client =
  accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendPhoneVerification(to: string) {
  if (!client || !verifyServiceSid) {
    throw new Error("Twilio Verify is not configured.");
  }

  return client.verify.v2
    .services(verifyServiceSid)
    .verifications.create({
      to,
      channel: "sms",
    });
}

export async function checkPhoneVerification(to: string, code: string) {
  if (!client || !verifyServiceSid) {
    throw new Error("Twilio Verify is not configured.");
  }

  return client.verify.v2
    .services(verifyServiceSid)
    .verificationChecks.create({
      to,
      code,
    });
}