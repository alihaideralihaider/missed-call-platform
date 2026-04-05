export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(req: NextRequest, { params }: RouteContext) {
  const supabase = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { slug } = await params;
    const body = await req.json();
    const type = String(body?.type || "").trim().toLowerCase();

    if (!["vibe", "menu", "bundle"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid upgrade type." },
        { status: 400 }
      );
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .select("id, slug, has_vibe_upgrade, has_menu_upgrade")
      .eq("slug", slug)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found." },
        { status: 404 }
      );
    }

    const update: Record<string, boolean> = {};

    if (type === "vibe") {
      update.has_vibe_upgrade = true;
    }

    if (type === "menu") {
      update.has_menu_upgrade = true;
    }

    if (type === "bundle") {
      update.has_vibe_upgrade = true;
      update.has_menu_upgrade = true;
    }

    const { error: updateError } = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .update(update)
      .eq("id", restaurant.id);

    if (updateError) {
      throw new Error(`Failed to update upgrade flags: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      slug: restaurant.slug,
      applied: type,
      hasVibeUpgrade:
        type === "vibe" || type === "bundle"
          ? true
          : restaurant.has_vibe_upgrade ?? false,
      hasMenuUpgrade:
        type === "menu" || type === "bundle"
          ? true
          : restaurant.has_menu_upgrade ?? false,
    });
  } catch (error) {
    console.error(
      "POST /api/admin/restaurants/[slug]/upgrade failed:",
      error
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}