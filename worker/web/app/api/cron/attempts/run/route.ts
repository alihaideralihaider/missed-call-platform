import { NextResponse } from "next/server";

import { runDueAttemptJobs } from "@/lib/attempts/universalAttemptsEngine";

export const runtime = "nodejs";

function getProvidedSecret(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() || "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim();
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret")?.trim();
  if (querySecret) return querySecret;

  return "";
}

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET?.trim();

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 }
    );
  }

  if (getProvidedSecret(request) !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const summary = await runDueAttemptJobs();

  return NextResponse.json(summary);
}
