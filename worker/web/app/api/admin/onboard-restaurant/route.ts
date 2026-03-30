import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = (body.name || "").trim();
    let slug = (body.slug || "").trim().toLowerCase();
    const contactName = (body.contactName || "").trim();
    const contactPhone = (body.contactPhone || "").trim();
    const contactEmail = (body.contactEmail || "").trim();

    // ✅ ADD THESE
    const salesTaxRateRaw = body.salesTaxRate;
    const taxMode = (body.taxMode || "exclusive").trim();
    const taxLabel = (body.taxLabel || "Sales Tax").trim();

    let salesTaxRate = Number(salesTaxRateRaw);

    if (!Number.isFinite(salesTaxRate)) {
      salesTaxRate = 0;
    }

    // normalize percent vs decimal
    if (salesTaxRate > 1) {
      salesTaxRate = salesTaxRate / 100;
    }

    if (!name) {
      return NextResponse.json(
        { error: "Restaurant name is required" },
        { status: 400 }
      );
    }

    if (!slug) {
      slug = slugify(name);
    }

    const { data: existingRestaurant, error: existingRestaurantError } =
      await supabase
        .schema("food_ordering")
        .from("restaurants")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

    if (existingRestaurantError) {
      throw new Error(
        `Restaurant lookup failed: ${existingRestaurantError.message}`
      );
    }

    if (existingRestaurant) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 400 }
      );
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .insert({
        name,
        slug,
        contact_name: contactName || null,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
        is_active: true,
        onboarding_status: "draft",
        default_prep_minutes: 25,
      })
      .select("id, slug")
      .single();

    if (restaurantError || !restaurant) {
      throw new Error(
        `Failed to create restaurant: ${
          restaurantError?.message ?? "unknown error"
        }`
      );
    }

    // ✅ ADD THIS BLOCK (core fix)
    const { error: taxError } = await supabase
      .schema("food_ordering")
      .from("tax_settings")
      .upsert({
        restaurant_id: restaurant.id,
        sales_tax_rate: salesTaxRate,
        tax_mode: taxMode,
        tax_label: taxLabel,
      });

    if (taxError) {
      throw new Error(
        `Failed to create tax settings: ${taxError.message}`
      );
    }

    const { data: menu, error: menuError } = await supabase
      .schema("food_ordering")
      .from("menus")
      .insert({
        restaurant_id: restaurant.id,
        name: "Main Menu",
      })
      .select("id")
      .single();

    if (menuError || !menu) {
      throw new Error(
        `Failed to create menu: ${menuError?.message ?? "unknown error"}`
      );
    }

    const categoryPayload = [
      { menu_id: menu.id, name: "Popular", sort_order: 0, is_active: true },
      { menu_id: menu.id, name: "Mains", sort_order: 1, is_active: true },
      { menu_id: menu.id, name: "Drinks", sort_order: 2, is_active: true },
    ];

    const { error: categoryError } = await supabase
      .schema("food_ordering")
      .from("menu_categories")
      .insert(categoryPayload);

    if (categoryError) {
      throw new Error(
        `Failed to create categories: ${categoryError.message}`
      );
    }

    return NextResponse.json({
      success: true,
      slug: restaurant.slug,
      restaurantId: restaurant.id,
      menuId: menu.id,
    });
  } catch (error) {
    console.error("POST /api/admin/onboard-restaurant failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}