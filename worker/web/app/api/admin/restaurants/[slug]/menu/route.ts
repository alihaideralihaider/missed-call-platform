import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const supabase = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { slug } = await context.params;

    const { data: restaurant, error: restaurantError } = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .select("id, name, slug")
      .eq("slug", slug)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const { data: menu, error: menuError } = await supabase
      .schema("food_ordering")
      .from("menus")
      .select("id, name")
      .eq("restaurant_id", restaurant.id)
      .eq("name", "Main Menu")
      .single();

    if (menuError || !menu) {
      return NextResponse.json(
        { error: "Menu not found" },
        { status: 404 }
      );
    }

    const { data: categories, error: categoriesError } = await supabase
      .schema("food_ordering")
      .from("menu_categories")
      .select("id, name, sort_order")
      .eq("menu_id", menu.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (categoriesError) {
      throw new Error(categoriesError.message);
    }

    const categoryIds = (categories || []).map((category) => category.id);

    let items: Array<{
      id: string;
      category_id: string;
      name: string;
      description: string | null;
      price: number;
      sort_order: number | null;
      is_sold_out: boolean;
      image_url: string | null;
    }> = [];

    if (categoryIds.length > 0) {
      const { data: itemRows, error: itemsError } = await supabase
        .schema("food_ordering")
        .from("menu_items")
        .select(
          "id, category_id, name, description, price, sort_order, is_sold_out, image_url"
        )
        .in("category_id", categoryIds)
        .order("sort_order", { ascending: true });

      if (itemsError) {
        throw new Error(itemsError.message);
      }

      items =
        itemRows?.map((item) => ({
          id: item.id,
          category_id: item.category_id,
          name: item.name,
          description: item.description,
          price: Number(item.price ?? 0),
          sort_order: item.sort_order,
          is_sold_out: item.is_sold_out ?? false,
          image_url: item.image_url ?? null,
        })) || [];
    }

    return NextResponse.json({
      success: true,
      restaurant,
      menu,
      categories: categories || [],
      items,
    });
  } catch (error) {
    console.error("GET /api/admin/restaurants/[slug]/menu failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}