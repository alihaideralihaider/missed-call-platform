import { NextResponse } from "next/server";

export const runtime = "edge";

function readPublicSupabaseConfig() {
  const url = String(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
  ).trim();
  const anonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  return {
    url,
    anonKey,
  };
}

export async function GET() {
  const supabase = readPublicSupabaseConfig();

  if (!supabase.url || !supabase.anonKey) {
    return NextResponse.json(
      {
        error: "Public Supabase runtime config is unavailable.",
        supabase: {
          urlPresent: Boolean(supabase.url),
          anonKeyPresent: Boolean(supabase.anonKey),
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    {
      supabase,
      exposure: {
        serviceRoleKeyExposed: false,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
