export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{
    slug: string;
    itemId: string;
  }>;
};

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const supabase = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { slug, itemId } = await params;
    const body = await req.json();
    const { is_sold_out } = body as { is_sold_out?: boolean };

    if (typeof is_sold_out !== "boolean") {
      return NextResponse.json(
        { error: "is_sold_out must be true or false" },
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
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const { data: item, error: itemError } = await supabase
      .schema("food_ordering")
      .from("menu_items")
      .select(`
        id,
        name,
        is_sold_out,
        category_id,
        menu_categories!inner(
          id,
          menu_id,
          menus!inner(
            id,
            restaurant_id
          )
        )
      `)
      .eq("id", itemId)
      .eq("menu_categories.menus.restaurant_id", restaurant.id)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: "Menu item not found for this restaurant" },
        { status: 404 }
      );
    }

    const { data: updatedItem, error: updateError } = await supabase
      .schema("food_ordering")
      .from("menu_items")
      .update({ is_sold_out })
      .eq("id", itemId)
      .select("id, name, price, is_active, is_sold_out")
      .single();

    if (updateError || !updatedItem) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update availability" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: updatedItem,
    });
  } catch (error) {
    console.error("PATCH availability error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}