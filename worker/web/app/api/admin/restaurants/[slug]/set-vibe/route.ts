import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function cleanSlug(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  return s && s !== "undefined" && s !== "null" ? s : "";
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { slug: rawSlug } = await context.params;
    const slug = cleanSlug(rawSlug);

    if (!slug) {
      return NextResponse.json(
        { error: "Missing restaurant slug." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const imageUrl = String(body?.imageUrl || "").trim();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Missing imageUrl." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server environment variables are not configured." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: restaurant, error: findError } = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .select("id, slug, vibe_image_url, has_vibe_upgrade")
      .eq("slug", slug)
      .single();

    if (findError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found." },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .update({
        vibe_image_url: imageUrl,
      })
      .eq("id", restaurant.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update vibe background." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      restaurantId: restaurant.id,
      slug: restaurant.slug,
      vibeImageUrl: imageUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}