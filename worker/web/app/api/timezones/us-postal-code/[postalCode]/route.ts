export const runtime = "edge";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(_: Request, { params }: any) {
  const { postalCode } = await params;
  const admin = createSupabaseAdminClient();

  const normalizedPostalCode = String(postalCode || "").trim();

  if (!normalizedPostalCode) {
    return NextResponse.json(
      { error: "postalCode is required" },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("us_postal_code_timezones")
    .select("postal_code, city, state_code, state_name, county_name, timezone_name")
    .eq("postal_code", normalizedPostalCode)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Postal code not found" }, { status: 404 });
  }

  return NextResponse.json({
    postalCode: data.postal_code,
    city: data.city || null,
    stateCode: data.state_code || null,
    stateName: data.state_name || null,
    countyName: data.county_name || null,
    timezone: data.timezone_name,
  });
}