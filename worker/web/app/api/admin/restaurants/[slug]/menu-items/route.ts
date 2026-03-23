import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const body = await req.json();

    const categoryId = String(body.categoryId || "").trim();
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const price = toNumber(body.price);

    if (!slug) {
      return NextResponse.json(
        { error: "Restaurant slug is required." },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category is required." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Item name is required." },
        { status: 400 }
      );
    }

    if (price < 0) {
      return NextResponse.json(
        { error: "Price must be zero or greater." },
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

    const { data: menu, error: menuError } = await supabase
      .schema("food_ordering")
      .from("menus")
      .select("id")
      .eq("restaurant_id", restaurant.id)
      .eq("name", "Main Menu")
      .single();

    if (menuError || !menu) {
      return NextResponse.json(
        { error: "Menu not found." },
        { status: 404 }
      );
    }

    const { data: category, error: categoryError } = await supabase
      .schema("food_ordering")
      .from("menu_categories")
      .select("id, menu_id")
      .eq("id", categoryId)
      .eq("menu_id", menu.id)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: "Selected category is invalid." },
        { status: 400 }
      );
    }

    const { data: lastItem, error: lastItemError } = await supabase
      .schema("food_ordering")
      .from("menu_items")
      .select("sort_order")
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastItemError) {
      throw new Error(`Failed to determine sort order: ${lastItemError.message}`);
    }

    const nextSortOrder =
      typeof lastItem?.sort_order === "number" ? lastItem.sort_order + 1 : 0;

    const { data: insertedItem, error: insertError } = await supabase
      .schema("food_ordering")
      .from("menu_items")
      .insert({
        category_id: categoryId,
        name,
        description: description || null,
        price,
        sort_order: nextSortOrder,
      })
      .select("id, category_id, name, description, price, sort_order")
      .single();

    if (insertError || !insertedItem) {
      throw new Error(
        `Failed to create menu item: ${insertError?.message ?? "unknown error"}`
      );
    }

    return NextResponse.json({
      success: true,
      item: {
        id: insertedItem.id,
        category_id: insertedItem.category_id,
        name: insertedItem.name,
        description: insertedItem.description,
        price: Number(insertedItem.price ?? 0),
        sort_order: insertedItem.sort_order,
      },
    });
  } catch (error) {
    console.error("POST /api/admin/restaurants/[slug]/menu-items failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}