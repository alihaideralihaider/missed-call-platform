import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{ slug: string; itemId: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { slug, itemId } = await context.params;
    const body = await req.json();

    const imageUrl =
      typeof body.image_url === "string" ? body.image_url.trim() : "";
    const clearImage = body.clear === true;

    if (!slug) {
      return NextResponse.json(
        { error: "Restaurant slug is required." },
        { status: 400 }
      );
    }

    if (!itemId) {
      return NextResponse.json(
        { error: "Menu item id is required." },
        { status: 400 }
      );
    }

    if (!clearImage && !imageUrl) {
      return NextResponse.json(
        { error: "image_url is required unless clear=true." },
        { status: 400 }
      );
    }

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
      .select(`
        id,
        category_id,
        menu_categories!inner (
          id,
          menu_id,
          menus!inner (
            id,
            restaurant_id
          )
        )
      `)
      .eq("id", itemId)
      .eq("menu_categories.menus.restaurant_id", restaurant.id)
      .single();

    if (menuItemError || !menuItem) {
      return NextResponse.json(
        { error: "Menu item not found for this restaurant." },
        { status: 404 }
      );
    }

    const { data: updatedItem, error: updateError } = await supabase
      .schema("food_ordering")
      .from("menu_items")
      .update({
        image_url: clearImage ? null : imageUrl,
      })
      .eq("id", itemId)
      .select("id, image_url")
      .single();

    if (updateError || !updatedItem) {
      throw new Error(
        `Failed to update menu item image: ${
          updateError?.message ?? "unknown error"
        }`
      );
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
      message: clearImage
        ? "Image removed from menu item."
        : "Image assigned to menu item.",
    });
  } catch (error) {
    console.error(
      "PATCH /api/admin/restaurants/[slug]/menu-items/[itemId]/image failed:",
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