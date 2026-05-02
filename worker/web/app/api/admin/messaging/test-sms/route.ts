import { NextRequest, NextResponse } from "next/server";
import { sendSms } from "@/lib/messaging/sendSms";
import type { SmsProviderName } from "@/lib/messaging/types";

export const runtime = "nodejs";

function isSmsProviderName(value: unknown): value is SmsProviderName {
  return value === "twilio" || value === "signalhouse";
}

function isAuthorized(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const bearerToken = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");

  return headerSecret === secret || bearerToken === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    provider?: unknown;
    to?: unknown;
    body?: unknown;
  } | null;

  const to = typeof body?.to === "string" ? body.to.trim() : "";
  const smsBody = typeof body?.body === "string" ? body.body.trim() : "";
  const provider = isSmsProviderName(body?.provider) ? body.provider : undefined;

  if (!to || !smsBody) {
    return NextResponse.json(
      { error: "Request body requires to and body." },
      { status: 400 }
    );
  }

  const result = await sendSms({
    to,
    body: smsBody,
    messageType: "admin_test_sms",
    metadata: provider ? { provider } : undefined,
  });

  return NextResponse.json({
    provider: result.provider,
    success: result.success,
    messageId: result.messageId || null,
    error: result.error || null,
  });
}
