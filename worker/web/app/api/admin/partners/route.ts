import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data, error } = await supabase
      .schema("partners")
      .from("partners")
      .select("id, name, email, status")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const partners =
      data?.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email ?? null,
      })) ?? [];

    return NextResponse.json({ partners });
  } catch (error) {
    console.error("GET /api/admin/partners failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load partners",
      },
      { status: 500 }
    );
  }
}