import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRestaurantAdminAccessBySlugFromRequest } from "@/lib/admin/restaurant-access-edge";

type RouteContext = {
  params: Promise<{ slug: string; promotionId?: string }>;
};

type PromotionPayload = {
  name?: string;
  description?: string | null;
  promotionType?: string | null;
  status?: string | null;
  priority?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  imageUrl?: string | null;
  aiImageUrl?: string | null;
  targetType?: "restaurant" | "category" | "menu_item";
  targetId?: string | null;
  rule?: {
    buyQuantity?: number | null;
    getQuantity?: number | null;
    discountPercent?: number | null;
    discountAmount?: number | null;
    minOrderSubtotal?: number | null;
    maxDiscountAmount?: number | null;
    pickupOnly?: boolean | null;
    firstOrderOnly?: boolean | null;
    nextOrderOnly?: boolean | null;
  };
};

function cleanSlug(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  return s && s !== "undefined" && s !== "null" ? s : "";
}

function toNullableString(value: unknown) {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toNullableDateString(value: unknown) {
  const s = toNullableString(value);
  return s || null;
}

function toBool(value: unknown) {
  return Boolean(value);
}

function buildMetadata(body: PromotionPayload) {
  const metadata: Record<string, unknown> = {};

  if (body.imageUrl) metadata.image_url = body.imageUrl;
  if (body.aiImageUrl) metadata.ai_image_url = body.aiImageUrl;

  return metadata;
}

function hasOwn(object: unknown, key: string) {
  return Boolean(
    object && typeof object === "object" && Object.prototype.hasOwnProperty.call(object, key)
  );
}

function mapPromotionRow(
  promo: any,
  rule: any | null,
  target: any | null
) {
  const metadata =
    rule && rule.metadata && typeof rule.metadata === "object"
      ? rule.metadata
      : null;

  return {
    id: promo.id,
    restaurant_id: promo.restaurant_id,
    name: promo.name,
    description: promo.description,
    promotion_type: promo.promotion_type,
    status: promo.status,
    priority: promo.priority,
    starts_at: promo.starts_at,
    ends_at: promo.ends_at,
    channels: promo.channels,
    image_url:
      (metadata?.ai_image_url as string | undefined) ||
      (metadata?.image_url as string | undefined) ||
      null,
    rule: rule
      ? {
          id: rule.id,
          promotion_id: rule.promotion_id,
          buy_quantity: rule.buy_quantity,
          get_quantity: rule.get_quantity,
          discount_percent: rule.discount_percent,
          discount_amount: rule.discount_amount,
          min_order_subtotal: rule.min_order_subtotal,
          max_discount_amount: rule.max_discount_amount,
          first_order_only: rule.first_order_only,
          next_order_only: rule.next_order_only,
          pickup_only: rule.pickup_only,
          metadata: rule.metadata,
        }
      : null,
    target: target
      ? {
          id: target.id,
          promotion_id: target.promotion_id,
          target_type: target.target_type,
          target_id: target.target_id,
        }
      : null,
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { slug: rawSlug } = await context.params;
    const slug = cleanSlug(rawSlug);

    if (!slug) {
      return NextResponse.json(
        { error: "Missing restaurant slug." },
        { status: 400 }
      );
    }

    const access = await getRestaurantAdminAccessBySlugFromRequest(req, slug);

    if (!access) {
      return NextResponse.json(
        { error: "Not authorized." },
        { status: 403 }
      );
    }

    const supabase = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: restaurant, error: restaurantError } = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .select("id, name, slug, has_vibe_upgrade, has_menu_upgrade")
      .eq("id", access.restaurant.id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found." },
        { status: 404 }
      );
    }

    const { data: menusData } = await supabase
      .schema("food_ordering")
      .from("menus")
      .select("id")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true);

    const menuIds = (menusData || []).map((m: any) => m.id);

    let categories: any[] = [];
    if (menuIds.length > 0) {
      const { data: categoriesData } = await supabase
        .schema("food_ordering")
        .from("menu_categories")
        .select("id, name, menu_id, sort_order")
        .in("menu_id", menuIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      categories = categoriesData || [];
    }

    const categoryIds = categories.map((c: any) => c.id);

    let menuItems: any[] = [];
    if (categoryIds.length > 0) {
      const { data: itemsData } = await supabase
        .schema("food_ordering")
        .from("menu_items")
        .select("id, name, category_id, image_url")
        .in("category_id", categoryIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      menuItems = itemsData || [];
    }

    const categoryNameMap = new Map(
      categories.map((c: any) => [String(c.id), String(c.name || "")])
    );

    const shapedMenuItems = menuItems.map((item: any) => ({
      id: item.id,
      name: item.name,
      category_name: categoryNameMap.get(String(item.category_id)) || null,
      image_url: item.image_url || null,
    }));

    const shapedCategories = categories.map((category: any) => ({
      id: category.id,
      name: category.name,
    }));

    const { data: promotionsData, error: promotionsError } = await supabase
      .schema("growth")
      .from("promotions")
      .select(
        "id, restaurant_id, name, description, promotion_type, status, priority, starts_at, ends_at, channels"
      )
      .eq("restaurant_id", restaurant.id)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (promotionsError) {
      return NextResponse.json(
        { error: promotionsError.message || "Failed to load promotions." },
        { status: 500 }
      );
    }

    const promotions = promotionsData || [];
    const promotionIds = promotions.map((p: any) => p.id);

    let rules: any[] = [];
    let targets: any[] = [];

    if (promotionIds.length > 0) {
      const [{ data: rulesData }, { data: targetsData }] = await Promise.all([
        supabase
          .schema("growth")
          .from("promotion_rules")
          .select(
            "id, promotion_id, buy_quantity, get_quantity, discount_percent, discount_amount, min_order_subtotal, max_discount_amount, first_order_only, next_order_only, pickup_only, metadata"
          )
          .in("promotion_id", promotionIds),
        supabase
          .schema("growth")
          .from("promotion_targets")
          .select("id, promotion_id, target_type, target_id")
          .in("promotion_id", promotionIds),
      ]);

      rules = rulesData || [];
      targets = targetsData || [];
    }

    const ruleMap = new Map(rules.map((r: any) => [String(r.promotion_id), r]));
    const targetMap = new Map(
      targets.map((t: any) => [String(t.promotion_id), t])
    );

    const shapedPromotions = promotions.map((promo: any) =>
      mapPromotionRow(
        promo,
        ruleMap.get(String(promo.id)) || null,
        targetMap.get(String(promo.id)) || null
      )
    );

    return NextResponse.json({
      success: true,
      restaurant,
      promotions: shapedPromotions,
      menuItems: shapedMenuItems,
      categories: shapedCategories,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { slug: rawSlug, promotionId: rawPromotionId } = await context.params;
    const slug = cleanSlug(rawSlug);
    const promotionId = toNullableString(rawPromotionId);
    const body = (await req.json()) as PromotionPayload;

    if (!slug) {
      return NextResponse.json(
        { error: "Missing restaurant slug." },
        { status: 400 }
      );
    }

    if (!promotionId) {
      return NextResponse.json(
        { error: "Missing promotion id." },
        { status: 400 }
      );
    }

    const access = await getRestaurantAdminAccessBySlugFromRequest(req, slug);

    if (!access) {
      return NextResponse.json(
        { error: "Not authorized." },
        { status: 403 }
      );
    }

    const supabase = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: restaurant, error: restaurantError } = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .select("id, name, slug")
      .eq("id", access.restaurant.id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found." },
        { status: 404 }
      );
    }

    const { data: existingPromotion, error: existingPromotionError } =
      await supabase
        .schema("growth")
        .from("promotions")
        .select(
          "id, restaurant_id, name, description, promotion_type, status, priority, starts_at, ends_at, channels"
        )
        .eq("id", promotionId)
        .eq("restaurant_id", restaurant.id)
        .single();

    if (existingPromotionError || !existingPromotion) {
      return NextResponse.json(
        { error: "Promotion not found." },
        { status: 404 }
      );
    }

    const promotionUpdates: Record<string, unknown> = {};

    if (hasOwn(body, "name")) {
      const nextName = String(body.name || "").trim();

      if (!nextName) {
        return NextResponse.json(
          { error: "Promotion name is required." },
          { status: 400 }
        );
      }

      promotionUpdates.name = nextName;
    }

    if (hasOwn(body, "description")) {
      promotionUpdates.description = toNullableString(body.description);
    }

    if (hasOwn(body, "promotionType")) {
      promotionUpdates.promotion_type =
        toNullableString(body.promotionType) || "percent_off";
    }

    if (hasOwn(body, "status")) {
      promotionUpdates.status = toNullableString(body.status) || "draft";
    }

    if (hasOwn(body, "priority")) {
      promotionUpdates.priority = toNullableNumber(body.priority) ?? 100;
    }

    if (hasOwn(body, "startsAt")) {
      promotionUpdates.starts_at = toNullableDateString(body.startsAt);
    }

    if (hasOwn(body, "endsAt")) {
      promotionUpdates.ends_at = toNullableDateString(body.endsAt);
    }

    let promotion = existingPromotion;

    if (Object.keys(promotionUpdates).length > 0) {
      const { data: updatedPromotion, error: promotionError } = await supabase
        .schema("growth")
        .from("promotions")
        .update(promotionUpdates)
        .eq("id", promotionId)
        .eq("restaurant_id", restaurant.id)
        .select(
          "id, restaurant_id, name, description, promotion_type, status, priority, starts_at, ends_at, channels"
        )
        .single();

      if (promotionError || !updatedPromotion) {
        return NextResponse.json(
          { error: promotionError?.message || "Failed to update promotion." },
          { status: 500 }
        );
      }

      promotion = updatedPromotion;
    }

    let rule = null;

    const shouldUpdateRule =
      hasOwn(body, "rule") || hasOwn(body, "imageUrl") || hasOwn(body, "aiImageUrl");

    const { data: existingRule } = await supabase
      .schema("growth")
      .from("promotion_rules")
      .select(
        "id, promotion_id, buy_quantity, get_quantity, discount_percent, discount_amount, min_order_subtotal, max_discount_amount, first_order_only, next_order_only, pickup_only, metadata"
      )
      .eq("promotion_id", promotionId)
      .maybeSingle();

    if (shouldUpdateRule) {
      const ruleMetadata = buildMetadata(body);
      const ruleUpdates = {
        buy_quantity: toNullableNumber(body.rule?.buyQuantity),
        get_quantity: toNullableNumber(body.rule?.getQuantity),
        discount_percent: toNullableNumber(body.rule?.discountPercent),
        discount_amount: toNullableNumber(body.rule?.discountAmount),
        min_order_subtotal: toNullableNumber(body.rule?.minOrderSubtotal),
        max_discount_amount: toNullableNumber(body.rule?.maxDiscountAmount),
        first_order_only: toBool(body.rule?.firstOrderOnly),
        next_order_only: toBool(body.rule?.nextOrderOnly),
        pickup_only: toBool(body.rule?.pickupOnly),
        metadata: ruleMetadata,
      };

      if (existingRule?.id) {
        const { data: updatedRule, error: ruleError } = await supabase
          .schema("growth")
          .from("promotion_rules")
          .update(ruleUpdates)
          .eq("id", existingRule.id)
          .select(
            "id, promotion_id, buy_quantity, get_quantity, discount_percent, discount_amount, min_order_subtotal, max_discount_amount, first_order_only, next_order_only, pickup_only, metadata"
          )
          .single();

        if (ruleError) {
          return NextResponse.json(
            { error: ruleError.message || "Failed to update promotion rule." },
            { status: 500 }
          );
        }

        rule = updatedRule;
      } else {
        const { data: insertedRule, error: ruleError } = await supabase
          .schema("growth")
          .from("promotion_rules")
          .insert({
            promotion_id: promotionId,
            ...ruleUpdates,
          })
          .select(
            "id, promotion_id, buy_quantity, get_quantity, discount_percent, discount_amount, min_order_subtotal, max_discount_amount, first_order_only, next_order_only, pickup_only, metadata"
          )
          .single();

        if (ruleError) {
          return NextResponse.json(
            { error: ruleError.message || "Failed to create promotion rule." },
            { status: 500 }
          );
        }

        rule = insertedRule;
      }
    } else {
      rule = existingRule || null;
    }

    let target = null;

    if (hasOwn(body, "targetType")) {
      const targetType =
        body.targetType === "category" || body.targetType === "menu_item"
          ? body.targetType
          : "restaurant";

      const { error: deleteTargetError } = await supabase
        .schema("growth")
        .from("promotion_targets")
        .delete()
        .eq("promotion_id", promotionId);

      if (deleteTargetError) {
        return NextResponse.json(
          {
            error:
              deleteTargetError.message || "Failed to update promotion target.",
          },
          { status: 500 }
        );
      }

      if (targetType !== "restaurant") {
        const targetId = toNullableString(body.targetId);

        if (!targetId) {
          return NextResponse.json(
            { error: "Promotion target is required." },
            { status: 400 }
          );
        }

        const { data: targetData, error: targetError } = await supabase
          .schema("growth")
          .from("promotion_targets")
          .insert({
            promotion_id: promotionId,
            target_type: targetType,
            target_id: targetId,
          })
          .select("id, promotion_id, target_type, target_id")
          .single();

        if (targetError) {
          return NextResponse.json(
            {
              error:
                targetError.message || "Failed to update promotion target.",
            },
            { status: 500 }
          );
        }

        target = targetData;
      }
    } else {
      const { data: existingTarget } = await supabase
        .schema("growth")
        .from("promotion_targets")
        .select("id, promotion_id, target_type, target_id")
        .eq("promotion_id", promotionId)
        .maybeSingle();

      target = existingTarget || null;
    }

    return NextResponse.json({
      success: true,
      promotion: mapPromotionRow(promotion, rule, target),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
