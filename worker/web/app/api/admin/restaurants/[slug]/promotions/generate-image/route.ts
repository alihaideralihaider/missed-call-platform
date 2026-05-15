import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantAdminAccessBySlugFromRequest } from "@/lib/admin/restaurant-access-edge";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

type RequestBody = {
  prompt?: string;
  promotionName?: string | null;
  targetLabel?: string | null;
};

type RestaurantRecord = {
  id: string;
  name: string;
  slug: string;
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

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
  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function loadRestaurantBySlug(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<RestaurantRecord> {
  const { data, error } = await supabase
    .schema("food_ordering")
    .from("restaurants")
    .select("id, name, slug")
    .eq("id", restaurantId)
    .single();

  if (error || !data) {
    throw new Error("Restaurant not found.");
  }

  return data as RestaurantRecord;
}

function buildSafePrompt(body: RequestBody, restaurant: RestaurantRecord) {
  const customPrompt = String(body.prompt || "").trim();
  const promotionName = String(body.promotionName || "").trim();
  const targetLabel = String(body.targetLabel || "").trim();

  return [
    customPrompt ||
      `Create a restaurant promotion image for ${restaurant.name}. Promotion: ${
        promotionName || "restaurant special"
      }. Target: ${targetLabel || "whole restaurant"}.`,
    "Style: appetizing realistic food marketing image, warm lighting, professional restaurant photography.",
    "Do not include readable discount text, logos, watermarks, phone numbers, QR codes, or menus in the image.",
    "Leave the promotion text to the surrounding user interface.",
  ].join(" ");
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const access = await getRestaurantAdminAccessBySlugFromRequest(req, slug);

    if (!access) {
      return NextResponse.json(
        { error: "Not authorized." },
        { status: 403 }
      );
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    const supabase = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const restaurant = await loadRestaurantBySlug(
      supabase,
      access.restaurant.id
    );
    const body = (await req.json()) as RequestBody;
    const prompt = buildSafePrompt(body, restaurant);

    const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_IMAGE_MODEL,
        prompt,
        size: "1024x1024",
        quality: "high",
        output_format: "jpeg",
      }),
    });

    const json = await openaiRes.json();

    if (!openaiRes.ok) {
      console.error("OpenAI promotion image generation error:", json);
      return NextResponse.json(
        { error: json?.error?.message || "OpenAI image generation failed." },
        { status: openaiRes.status }
      );
    }

    const b64 = json?.data?.[0]?.b64_json;

    if (!b64) {
      return NextResponse.json(
        { error: "No generated image returned." },
        { status: 500 }
      );
    }

    const timestamp = Date.now();
    const generatedBytes = b64ToUint8Array(b64);
    const safeRestaurantSlug = slugify(restaurant.slug || restaurant.name);
    const safePromotionName = slugify(String(body.promotionName || "promotion"));
    const displayFileName = `${safeRestaurantSlug}-${safePromotionName}-promotion-${timestamp}.jpg`;
    const storageBucket = "restaurant-assets";
    const storagePath = `${restaurant.id}/generated/promotions/${displayFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(storagePath, generatedBytes, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload generated image: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(storageBucket).getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      restaurantId: restaurant.id,
      restaurantSlug: restaurant.slug,
      model: OPENAI_IMAGE_MODEL,
      prompt,
      mimeType: "image/jpeg",
      generatedPath: storagePath,
      generatedUrl: publicUrl,
      displayFileName,
      isAiGenerated: true,
      aiLabel: "AI Generated",
    });
  } catch (error) {
    console.error(
      "POST /api/admin/restaurants/[slug]/promotions/generate-image failed:",
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
