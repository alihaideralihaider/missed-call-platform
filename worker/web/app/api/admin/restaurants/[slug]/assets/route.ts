import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

function getFileExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;

    const { data: restaurant, error: restaurantError } = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .select("id, name, slug, has_vibe_upgrade, has_menu_upgrade, vibe_image_url")
      .eq("slug", slug)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found." },
        { status: 404 }
      );
    }

    const { data: assets, error: assetsError } = await supabase
      .schema("food_ordering")
      .from("menu_item_assets")
      .select(`
        id,
        restaurant_id,
        menu_item_id,
        original_file_name,
        storage_bucket,
        storage_path,
        mime_type,
        file_size_bytes,
        public_url,
        alt_text,
        created_at,
        updated_at
      `)
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });

    if (assetsError) {
      throw new Error(`Failed to load assets: ${assetsError.message}`);
    }

    return NextResponse.json({
      success: true,
      restaurant,
      assets: assets || [],
    });
  } catch (error) {
    console.error("GET /api/admin/restaurants/[slug]/assets failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
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
        { error: "Restaurant not found." },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const menuItemId = String(formData.get("menuItemId") || "").trim() || null;
    const altText = String(formData.get("altText") || "").trim() || null;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Image file is required." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image uploads are allowed." },
        { status: 400 }
      );
    }

    if (menuItemId) {
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
        .eq("id", menuItemId)
        .eq("menu_categories.menus.restaurant_id", restaurant.id)
        .single();

      if (menuItemError || !menuItem) {
        return NextResponse.json(
          { error: "Selected menu item is invalid for this restaurant." },
          { status: 400 }
        );
      }
    }

    const originalFileName = file.name || "image";
    const extension = getFileExtension(originalFileName) || "bin";
    const safeFileName = sanitizeFileName(originalFileName) || `image.${extension}`;
    const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const storagePath = `${restaurant.id}/${uniquePrefix}-${safeFileName}`;
    const bucket = "restaurant-assets";

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    const { data: insertedAsset, error: insertError } = await supabase
      .schema("food_ordering")
      .from("menu_item_assets")
      .insert({
        restaurant_id: restaurant.id,
        menu_item_id: menuItemId,
        original_file_name: originalFileName,
        storage_bucket: bucket,
        storage_path: storagePath,
        mime_type: file.type,
        file_size_bytes: file.size,
        public_url: publicUrl,
        alt_text: altText,
      })
      .select("*")
      .single();

    if (insertError || !insertedAsset) {
      throw new Error(
        `Failed to save asset record: ${insertError?.message ?? "unknown error"}`
      );
    }

    if (menuItemId) {
      const { error: updateMenuItemError } = await supabase
        .schema("food_ordering")
        .from("menu_items")
        .update({
          image_url: publicUrl,
        })
        .eq("id", menuItemId);

      if (updateMenuItemError) {
        throw new Error(
          `Image uploaded but failed to link to menu item: ${updateMenuItemError.message}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      asset: insertedAsset,
    });
  } catch (error) {
    console.error("POST /api/admin/restaurants/[slug]/assets failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}