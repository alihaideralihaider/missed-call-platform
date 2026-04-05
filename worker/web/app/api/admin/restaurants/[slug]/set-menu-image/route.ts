export const runtime = "edge";
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
    const menuItemId = String(body?.menuItemId || "").trim();
    const imageUrl = String(body?.imageUrl || "").trim();

    if (!menuItemId) {
      return NextResponse.json(
        { error: "Missing menuItemId." },
        { status: 400 }
      );
    }

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

    const supabase = createClient<any>(supabaseUrl, serviceRoleKey);

    const { data: restaurant, error: restaurantError } = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .select("id, slug")
      .eq("slug", slug)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found." },
        { status: 404 }
      );
    }

    const { data: menuItem, error: menuItemError } = await supabase
      .schema("food_ordering")
      .from("menu_items")
      .select("id, category_id")
      .eq("id", menuItemId)
      .single();

    if (menuItemError || !menuItem) {
      return NextResponse.json(
        { error: "Menu item not found." },
        { status: 404 }
      );
    }

    const { data: category, error: categoryError } = await supabase
      .schema("food_ordering")
      .from("menu_categories")
      .select("id, menu_id")
      .eq("id", menuItem.category_id)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: "Menu category not found." },
        { status: 404 }
      );
    }

    const { data: menu, error: menuError } = await supabase
      .schema("food_ordering")
      .from("menus")
      .select("id, restaurant_id")
      .eq("id", category.menu_id)
      .single();

    if (menuError || !menu || menu.restaurant_id !== restaurant.id) {
      return NextResponse.json(
        { error: "Menu item does not belong to this restaurant." },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .schema("food_ordering")
      .from("menu_items")
      .update({
        image_url: imageUrl,
      })
      .eq("id", menuItemId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update menu image." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      restaurantId: restaurant.id,
      menuItemId,
      imageUrl,
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