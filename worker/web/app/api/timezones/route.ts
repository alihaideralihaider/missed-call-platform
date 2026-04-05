export const runtime = "edge";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("timezones")
    .select("timezone_name, display_label, country_code")
    .eq("is_active", true)
    .order("country_code", { ascending: true })
    .order("display_label", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    timezones: data || [],
  });
}