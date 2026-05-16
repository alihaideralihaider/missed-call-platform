function getTwilioVerifyConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

  if (!accountSid || !authToken || !verifyServiceSid) {
    throw new Error("Twilio Verify is not configured.");
  }

  return { accountSid, authToken, verifyServiceSid };
}

function getTwilioAuthHeader(accountSid: string, authToken: string) {
  if (!accountSid || !authToken) {
    throw new Error("Twilio Verify is not configured.");
  }

  return `Basic ${btoa(`${accountSid}:${authToken}`)}`;
}

export async function sendPhoneVerification(to: string) {
  const { accountSid, authToken, verifyServiceSid } = getTwilioVerifyConfig();

  const body = new URLSearchParams({
    To: to,
    Channel: "sms",
  });

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`,
    {
      method: "POST",
      headers: {
        Authorization: getTwilioAuthHeader(accountSid, authToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio Verify failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function checkPhoneVerification(to: string, code: string) {
  const { accountSid, authToken, verifyServiceSid } = getTwilioVerifyConfig();

  const body = new URLSearchParams({
    To: to,
    Code: code,
  });

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        Authorization: getTwilioAuthHeader(accountSid, authToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Twilio Verify check failed: ${response.status} ${errorText}`
    );
  }

  return response.json();
}
