import RestaurantMenuClient from "@/components/storefront/RestaurantMenuClient";
import { createClient } from "@supabase/supabase-js";

type Props = {
  params: Promise<{ slug: string }>;
};

type PromotionRow = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  promotion_type: string | null;
  status: string | null;
  priority: number | null;
  starts_at: string | null;
  ends_at: string | null;
  channels: string[] | string | null;
};

type PromotionRuleRow = {
  id: string;
  promotion_id: string;
  buy_quantity: number | null;
  get_quantity: number | null;
  discount_percent: number | null;
  discount_amount: number | null;
  min_order_subtotal: number | null;
  max_discount_amount: number | null;
  first_order_only: boolean | null;
  next_order_only: boolean | null;
  pickup_only: boolean | null;
  metadata: unknown;
};

function isPromotionActive(promo: PromotionRow, now: Date) {
  const startsOk = !promo.starts_at || new Date(promo.starts_at) <= now;
  const endsOk = !promo.ends_at || new Date(promo.ends_at) >= now;
  const status = String(promo.status || "").toLowerCase();

  return startsOk && endsOk && (!status || status === "active" || status === "live");
}

function channelAllowsStorefront(channels: PromotionRow["channels"]) {
  if (!channels) return true;

  if (Array.isArray(channels)) {
    if (channels.length === 0) return true;
    const lowered = channels.map((c) => String(c).toLowerCase());
    return (
      lowered.includes("storefront") ||
      lowered.includes("web") ||
      lowered.includes("pickup") ||
      lowered.includes("all")
    );
  }

  const single = String(channels).toLowerCase();
  return (
    single.includes("storefront") ||
    single.includes("web") ||
    single.includes("pickup") ||
    single.includes("all")
  );
}

function formatMoney(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function buildPromotionSubtitle(
  promo: PromotionRow,
  rule?: PromotionRuleRow | null
) {
  const parts: string[] = [];

  if (rule?.buy_quantity && rule?.get_quantity) {
    parts.push(`Buy ${rule.buy_quantity}, get ${rule.get_quantity}`);
  } else if (rule?.discount_percent) {
    parts.push(`${rule.discount_percent}% off`);
  } else if (rule?.discount_amount) {
    parts.push(`${formatMoney(rule.discount_amount)} off`);
  }

  if (rule?.min_order_subtotal) {
    parts.push(`on orders over ${formatMoney(rule.min_order_subtotal)}`);
  }

  if (rule?.pickup_only) {
    parts.push("pickup only");
  }

  if (rule?.first_order_only) {
    parts.push("first order only");
  }

  if (rule?.next_order_only) {
    parts.push("next order only");
  }

  if (parts.length > 0) {
    return parts.join(" • ");
  }

  return promo.description || null;
}

function buildPromotionBadge(
  promo: PromotionRow,
  rule?: PromotionRuleRow | null
) {
  if (rule?.pickup_only) return "Pickup Only";

  const type = String(promo.promotion_type || "").trim();
  if (!type) return null;

  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default async function Page({ params }: Props) {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .schema("food_ordering")
    .from("restaurants")
    .select(
      `
      id,
      name,
      slug,
      is_active,
      has_vibe_upgrade,
      has_menu_upgrade,
      vibe_image_url,
      menus (
        id,
        menu_categories (
          id,
          name,
          sort_order,
          menu_items (
            id,
            name,
            description,
            price,
            base_price,
            compare_at_price,
            image_url,
            is_active,
            is_sold_out,
            is_featured,
            order_count,
            last_ordered_at,
            sort_order
          )
        )
      )
    `
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    console.error("Error loading restaurant:", error);
    return <div>Restaurant not found</div>;
  }

  const categories = data.menus?.[0]?.menu_categories || [];

  const items =
    categories.flatMap((category: any) =>
      (category.menu_items || [])
        .filter((item: any) => item.is_active)
        .sort((a: any, b: any) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description ?? null,
          price: item.price,
          base_price: item.base_price ?? null,
          compare_at_price: item.compare_at_price ?? null,
          image_url: item.image_url ?? null,
          is_active: item.is_active,
          is_sold_out: item.is_sold_out,
          is_featured: item.is_featured ?? false,
          order_count: item.order_count ?? 0,
          last_ordered_at: item.last_ordered_at ?? null,
          category_name: category.name ?? null,
        }))
    ) || [];

  const now = new Date();

  const { data: promotionsData, error: promotionsError } = await supabase
    .schema("growth")
    .from("promotions")
    .select(
      `
      id,
      restaurant_id,
      name,
      description,
      promotion_type,
      status,
      priority,
      starts_at,
      ends_at,
      channels
    `
    )
    .eq("restaurant_id", data.id)
    .order("priority", { ascending: false });

  if (promotionsError) {
    console.error("Error loading promotions:", promotionsError);
  }

  const activePromotions = ((promotionsData as PromotionRow[] | null) || []).filter(
    (promo) => isPromotionActive(promo, now) && channelAllowsStorefront(promo.channels)
  );

  const promotionIds = activePromotions.map((promo) => promo.id);

  let rulesByPromotionId = new Map<string, PromotionRuleRow>();

  if (promotionIds.length > 0) {
    const { data: rulesData, error: rulesError } = await supabase
      .schema("growth")
      .from("promotion_rules")
      .select(
        `
        id,
        promotion_id,
        buy_quantity,
        get_quantity,
        discount_percent,
        discount_amount,
        min_order_subtotal,
        max_discount_amount,
        first_order_only,
        next_order_only,
        pickup_only,
        metadata
      `
      )
      .in("promotion_id", promotionIds);

    if (rulesError) {
      console.error("Error loading promotion rules:", rulesError);
    } else {
      rulesByPromotionId = new Map(
        ((rulesData as PromotionRuleRow[] | null) || []).map((rule) => [
          rule.promotion_id,
          rule,
        ])
      );
    }
  }

  const promotions = activePromotions.map((promo) => {
    const rule = rulesByPromotionId.get(promo.id) || null;

    return {
      id: promo.id,
      title: promo.name,
      subtitle: buildPromotionSubtitle(promo, rule),
      badge: buildPromotionBadge(promo, rule),
      image_url: null,
    };
  });

  return (
    <RestaurantMenuClient
      restaurantName={data.name}
      hasVibeUpgrade={data.has_vibe_upgrade ?? false}
      hasMenuUpgrade={data.has_menu_upgrade ?? false}
      vibeImageUrl={data.vibe_image_url ?? null}
      items={items}
      hasPromotions={promotions.length > 0}
      promotions={promotions}
    />
  );
}