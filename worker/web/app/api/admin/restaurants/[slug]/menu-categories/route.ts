import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function normalizeName(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export async function POST(req: Request, context: RouteContext) {
  const supabase = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { slug } = await context.params;
    const body = await req.json();
    const name = normalizeName(body.name);

    if (!slug) {
      return NextResponse.json(
        { error: "Restaurant slug is required." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required." },
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

    const { data: existingCategory, error: existingCategoryError } = await supabase
      .schema("food_ordering")
      .from("menu_categories")
      .select("id, name, sort_order")
      .eq("menu_id", menu.id)
      .ilike("name", name)
      .maybeSingle();

    if (existingCategoryError) {
      throw new Error(
        `Failed to check existing category: ${existingCategoryError.message}`
      );
    }

    if (existingCategory) {
      return NextResponse.json({
        success: true,
        category: existingCategory,
        existing: true,
      });
    }

    const { data: lastCategory, error: lastCategoryError } = await supabase
      .schema("food_ordering")
      .from("menu_categories")
      .select("sort_order")
      .eq("menu_id", menu.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastCategoryError) {
      throw new Error(
        `Failed to determine category sort order: ${lastCategoryError.message}`
      );
    }

    const nextSortOrder =
      typeof lastCategory?.sort_order === "number"
        ? lastCategory.sort_order + 1
        : 0;

    const { data: category, error: insertError } = await supabase
      .schema("food_ordering")
      .from("menu_categories")
      .insert({
        menu_id: menu.id,
        name,
        sort_order: nextSortOrder,
        is_active: true,
      })
      .select("id, name, sort_order")
      .single();

    if (insertError || !category) {
      throw new Error(
        `Failed to create category: ${insertError?.message ?? "unknown error"}`
      );
    }

    return NextResponse.json({
      success: true,
      category,
      existing: false,
    });
  } catch (error) {
    console.error("POST /api/admin/restaurants/[slug]/menu-categories failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
