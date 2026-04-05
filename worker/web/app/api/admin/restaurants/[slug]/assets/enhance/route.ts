import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

type RequestBody = {
  imageUrl?: string;
  mode?: "vibe" | "menu";
  menuItemId?: string | null;
  originalFileName?: string | null;
  sourceAssetId?: string | null;
};

type RestaurantRecord = {
  id: string;
  name: string;
  slug: string;
};

type MenuItemRecord = {
  id: string;
  name: string;
};

function buildPrompt(mode: "vibe" | "menu") {
  if (mode === "menu") {
    return [
      "Enhance this restaurant food image for professional menu presentation.",
      "Improve lighting, clarity, sharpness, and overall polish.",
      "Keep the dish realistic and natural.",
      "Do not invent new food items, ingredients, props, logos, text, or plating.",
      "Do not make it look artificial or over-edited.",
      "Keep the original composition as much as possible.",
    ].join(" ");
  }

  return [
    "Enhance this restaurant vibe image for a professional storefront header background.",
    "Improve lighting, clarity, sharpness, and overall polish.",
    "Keep it realistic, warm, and natural.",
    "Do not invent new objects, signage, logos, food, or people.",
    "Do not make it look artificial or heavily stylized.",
    "Preserve the original scene and composition as much as possible.",
  ].join(" ");
}

function guessFileNameFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split("/").pop() || "image.jpg";
    return last.includes(".") ? last : `${last}.jpg`;
  } catch {
    return "image.jpg";
  }
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function getExtension(fileName: string) {
  const match = fileName.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "jpg";
}

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function b64ToUint8Array(b64: string) {
  const binary = Buffer.from(b64, "base64");
  return new Uint8Array(binary);
}

async function loadRestaurantBySlug(
  supabase: ReturnType<typeof createClient>,
  slug: string
): Promise<RestaurantRecord> {
  const { data, error } = await supabase
    .schema("food_ordering")
    .from("restaurants")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    throw new Error("Restaurant not found.");
  }

  return data as RestaurantRecord;
}

async function loadMenuItemName(
  supabase: ReturnType<typeof createClient>,
  menuItemId?: string | null
): Promise<string | null> {
  if (!menuItemId) return null;

  const { data, error } = await supabase
    .schema("food_ordering")
    .from("menu_items")
    .select("id, name")
    .eq("id", menuItemId)
    .single();

  if (error || !data) return null;

  return (data as MenuItemRecord).name || null;
}

async function getNextVibeNumber(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string,
  restaurantSlug: string
) {
  const folder = `${restaurantId}/enhanced`;
  const prefix = `${restaurantSlug}-vibe-`;

  const { data, error } = await supabase.storage.from("restaurant-assets").list(folder, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });

  if (error || !Array.isArray(data)) {
    return 1;
  }

  let maxNumber = 0;

  for (const item of data) {
    const name = String(item.name || "");
    if (!name.startsWith(prefix)) continue;

    const match = name.match(/^.+-vibe-(\d+)-\d+\.(jpg|jpeg|png|webp)$/i);
    if (!match) continue;

    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > maxNumber) {
      maxNumber = parsed;
    }
  }

  return maxNumber + 1;
}

async function buildEnhancedFileName(
  supabase: ReturnType<typeof createClient>,
  args: {
    restaurantId: string;
    restaurantSlug: string;
    mode: "vibe" | "menu";
    menuItemName?: string | null;
    originalFileName?: string | null;
  }
) {
  const timestamp = Date.now();

  if (args.mode === "vibe") {
    const vibeNumber = await getNextVibeNumber(
      supabase,
      args.restaurantId,
      args.restaurantSlug
    );
    return `${args.restaurantSlug}-vibe-${vibeNumber}-${timestamp}.jpg`;
  }

  const originalBase = stripExtension(args.originalFileName || "image");
  const baseFromOriginal = slugify(originalBase);
  const baseFromMenuItem = slugify(args.menuItemName || "");
  const bestBase = baseFromMenuItem || baseFromOriginal || "menu-image";

  return `${args.restaurantSlug}-${bestBase}-enhanced-${timestamp}.jpg`;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    const { slug } = await params;
    const restaurant = await loadRestaurantBySlug(supabase, slug);

    const body = (await req.json()) as RequestBody;
    const imageUrl = String(body.imageUrl || "").trim();
    const mode = body.mode === "menu" ? "menu" : "vibe";
    const menuItemId = body.menuItemId || null;
    const clientOriginalFileName = String(body.originalFileName || "").trim() || null;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required." },
        { status: 400 }
      );
    }

    const sourceRes = await fetch(imageUrl);

    if (!sourceRes.ok) {
      return NextResponse.json(
        { error: "Failed to download source image." },
        { status: 400 }
      );
    }

    const sourceBlob = await sourceRes.blob();
    const guessedSourceFileName = guessFileNameFromUrl(imageUrl);
    const sourceFileName = clientOriginalFileName || guessedSourceFileName;
    const sourceFileType = sourceBlob.type || "image/jpeg";

    const imageFile = new File([sourceBlob], sourceFileName, {
      type: sourceFileType,
    });

    const formData = new FormData();
    formData.append("model", OPENAI_IMAGE_MODEL);
    formData.append("prompt", buildPrompt(mode));
    formData.append("image[]", imageFile);
    formData.append("quality", "high");
    formData.append("size", mode === "vibe" ? "1536x1024" : "1024x1024");
    formData.append("output_format", "jpeg");

    const openaiRes = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    const json = await openaiRes.json();

    if (!openaiRes.ok) {
      console.error("OpenAI image edit error:", json);
      return NextResponse.json(
        { error: json?.error?.message || "OpenAI image edit failed." },
        { status: openaiRes.status }
      );
    }

    const b64 = json?.data?.[0]?.b64_json;

    if (!b64) {
      return NextResponse.json(
        { error: "No enhanced image returned." },
        { status: 500 }
      );
    }

    const enhancedBytes = b64ToUint8Array(b64);
    const menuItemName = await loadMenuItemName(supabase, menuItemId);

    const displayFileName = await buildEnhancedFileName(supabase, {
      restaurantId: restaurant.id,
      restaurantSlug: slugify(restaurant.slug || restaurant.name),
      mode,
      menuItemName,
      originalFileName: sourceFileName,
    });

    const storageBucket = "restaurant-assets";
    const storagePath = `${restaurant.id}/enhanced/${displayFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(storagePath, enhancedBytes, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload enhanced image: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(storageBucket).getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      restaurantId: restaurant.id,
      restaurantSlug: restaurant.slug,
      model: OPENAI_IMAGE_MODEL,
      mode,
      mimeType: "image/jpeg",
      originalImageUrl: imageUrl,
      originalFileName: sourceFileName,
      enhancedPath: storagePath,
      enhancedUrl: publicUrl,
      displayFileName,
      isAiEnhanced: true,
      aiLabel: "AI Enhanced",
      menuItemId,
      menuItemName,
      sourceAssetId: body.sourceAssetId || null,
    });
  } catch (error) {
    console.error(
      "POST /api/admin/restaurants/[slug]/assets/enhance failed:",
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