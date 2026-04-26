import RestaurantMenuClient from "@/components/storefront/RestaurantMenuClient";
import { evaluateRestaurantHours, type RestaurantHourRow } from "@/lib/restaurant-hours";
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

type MenuItemRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  base_price: number | null;
  compare_at_price: number | null;
  image_url: string | null;
  is_active: boolean | null;
  is_sold_out: boolean | null;
  is_featured: boolean | null;
  order_count: number | null;
  last_ordered_at: string | null;
  sort_order: number | null;
};

type ModifierGroupRow = {
  id: string;
  name: string | null;
  description?: string | null;
  required?: boolean | null;
  is_required?: boolean | null;
  min_select?: number | null;
  max_select?: number | null;
  min_selections?: number | null;
  max_selections?: number | null;
  selection_mode?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

type ModifierOptionRow = {
  id: string;
  modifier_group_id: string;
  name: string | null;
  description?: string | null;
  price_delta?: number | string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

type MenuItemModifierGroupRow = {
  menu_item_id: string;
  modifier_group_id: string;
  sort_order?: number | null;
};

type MenuCategoryRow = {
  id: string;
  name: string | null;
  sort_order: number | null;
  is_active?: boolean | null;
  menu_items?: MenuItemRow[] | null;
};

type MenuRow = {
  id: string;
  is_active?: boolean | null;
  menu_categories?: MenuCategoryRow[] | null;
};

type RestaurantRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean | null;
  timezone?: string | null;
  has_vibe_upgrade: boolean | null;
  has_menu_upgrade: boolean | null;
  vibe_image_url: string | null;
  address_line1?: string | null;
  address_line_1?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  menus?: MenuRow[] | null;
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

function buildRestaurantAddress(restaurant: RestaurantRow | null) {
  if (!restaurant) return null;

  const parts = [
    restaurant.address_line1 || restaurant.address_line_1 || "",
    restaurant.city || "",
    restaurant.state || "",
    restaurant.postal_code || "",
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

function normalizeModifierPrice(option: ModifierOptionRow) {
  const value = option.price_delta ?? 0;
  const price = Number(value);
  return Number.isFinite(price) ? price : 0;
}

function normalizeImageUrl(value: unknown) {
  const imageUrl = String(value ?? "").trim();

  if (!imageUrl) return null;
  if (imageUrl === "null" || imageUrl === "undefined") return null;

  return imageUrl;
}

export default async function Page({ params }: Props) {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
      timezone,
      has_vibe_upgrade,
      has_menu_upgrade,
      vibe_image_url,
      address_line1,
      address_line_1,
      city,
      state,
      postal_code,
      menus (
        id,
        is_active,
        menu_categories (
          id,
          name,
          sort_order,
          is_active,
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

  const restaurant = data as RestaurantRow;
  const restaurantTimeZone =
    String(restaurant.timezone || "").trim() || "America/New_York";

  const { data: restaurantHoursData, error: restaurantHoursError } = await supabase
    .schema("food_ordering")
    .from("restaurant_hours")
    .select("day_of_week, open_time, close_time, is_closed")
    .eq("restaurant_id", restaurant.id);

  if (restaurantHoursError) {
    console.error("Error loading restaurant hours:", restaurantHoursError);
  }

  const restaurantHours =
    ((restaurantHoursData as RestaurantHourRow[] | null) || []).map((row) => ({
      day_of_week: Number(row.day_of_week),
      open_time: row.open_time ?? null,
      close_time: row.close_time ?? null,
      is_closed: row.is_closed ?? null,
    }));

  const menus = Array.isArray(restaurant.menus) ? restaurant.menus : [];
  const activeMenu =
    menus.find((menu) => menu && menu.is_active !== false) || menus[0] || null;

  const categories = Array.isArray(activeMenu?.menu_categories)
    ? activeMenu!.menu_categories
        .filter((category) => category && category.is_active !== false)
        .sort(
          (a, b) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0)
        )
    : [];

  const items = categories.flatMap((category) =>
    (Array.isArray(category.menu_items) ? category.menu_items : [])
      .filter((item) => item && item.is_active)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? null,
        price: Number(item.price || 0),
        base_price: item.base_price ?? null,
        compare_at_price: item.compare_at_price ?? null,
        image_url: normalizeImageUrl(item.image_url),
        is_sold_out: item.is_sold_out ?? false,
        is_featured: item.is_featured ?? false,
        order_count: item.order_count ?? 0,
        last_ordered_at: item.last_ordered_at ?? null,
        category_name: category.name ?? null,
      }))
  );

  const itemIds = items.map((item) => item.id);
  let modifierGroupsByItemId = new Map<
    string,
    Array<{
      id: string;
      name: string;
      description: string | null;
      required: boolean;
      min_select: number;
      max_select: number | null;
      selection_mode: string | null;
      sort_order: number;
      options: Array<{
        id: string;
        name: string;
        description: string | null;
        price: number;
        sort_order: number;
      }>;
    }>
  >();

  if (itemIds.length > 0) {
    const { data: menuItemModifierGroupsData, error: menuItemModifierGroupsError } =
      await supabase
        .schema("food_ordering")
        .from("menu_item_modifier_groups")
        .select("menu_item_id, modifier_group_id, sort_order")
        .in("menu_item_id", itemIds);

    if (menuItemModifierGroupsError) {
      console.error(
        "Error loading menu item modifier group links:",
        menuItemModifierGroupsError
      );
    } else {
      const menuItemModifierGroups =
        (menuItemModifierGroupsData as MenuItemModifierGroupRow[] | null) || [];
      const modifierGroupIds = Array.from(
        new Set(menuItemModifierGroups.map((row) => row.modifier_group_id).filter(Boolean))
      );

      if (modifierGroupIds.length > 0) {
        const [{ data: modifierGroupsData, error: modifierGroupsError }, { data: modifierOptionsData, error: modifierOptionsError }] =
          await Promise.all([
            supabase
              .schema("food_ordering")
              .from("modifier_groups")
              .select("*")
              .in("id", modifierGroupIds),
            supabase
              .schema("food_ordering")
              .from("modifier_group_options")
              .select("*")
              .in("modifier_group_id", modifierGroupIds),
          ]);

        if (modifierGroupsError) {
          console.error("Error loading modifier groups:", modifierGroupsError);
        }

        if (modifierOptionsError) {
          console.error("Error loading modifier options:", modifierOptionsError);
        }

        const modifierGroups =
          ((modifierGroupsData as ModifierGroupRow[] | null) || []).filter(
            (group) => group && group.is_active !== false
          );
        const modifierOptions =
          ((modifierOptionsData as ModifierOptionRow[] | null) || []).filter(
            (option) => option && option.is_active !== false
          );

        const optionsByGroupId = new Map<
          string,
          Array<{
            id: string;
            name: string;
            description: string | null;
            price: number;
            sort_order: number;
          }>
        >();

        for (const option of modifierOptions) {
          const existing = optionsByGroupId.get(option.modifier_group_id) || [];
          existing.push({
            id: option.id,
            name: option.name ?? "",
            description: option.description ?? null,
            price: normalizeModifierPrice(option),
            sort_order: Number(option.sort_order || 0),
          });
          optionsByGroupId.set(option.modifier_group_id, existing);
        }

        const groupsById = new Map(
          modifierGroups.map((group) => [
            group.id,
            {
              id: group.id,
              name: group.name ?? "",
              description: group.description ?? null,
              required: group.is_required ?? group.required ?? false,
              min_select: Number(group.min_selections ?? group.min_select ?? 0),
              max_select:
                group.max_selections === null || group.max_selections === undefined
                  ? group.selection_mode === "single"
                    ? 1
                    : null
                  : Number(group.max_selections),
              selection_mode: group.selection_mode ?? null,
              sort_order: Number(group.sort_order || 0),
              options: (optionsByGroupId.get(group.id) || []).sort(
                (a, b) => a.sort_order - b.sort_order
              ),
            },
          ])
        );

        modifierGroupsByItemId = new Map();

        for (const link of menuItemModifierGroups) {
          const group = groupsById.get(link.modifier_group_id);
          if (!group || !group.options.length) continue;

          const existing = modifierGroupsByItemId.get(link.menu_item_id) || [];
          existing.push({
            ...group,
            sort_order:
              link.sort_order === null || link.sort_order === undefined
                ? group.sort_order
                : Number(link.sort_order),
          });
          modifierGroupsByItemId.set(link.menu_item_id, existing);
        }
      }
    }
  }

  const itemsWithModifiers = items.map((item) => ({
    ...item,
    modifier_groups: (modifierGroupsByItemId.get(item.id) || []).sort(
      (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)
    ),
  }));

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
    .eq("restaurant_id", restaurant.id)
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

  const hoursStatus = evaluateRestaurantHours(
    restaurantHours,
    restaurantTimeZone,
    now
  );

  return (
    <RestaurantMenuClient
      restaurantName={restaurant.name}
      restaurantAddress={buildRestaurantAddress(restaurant)}
      hasVibeUpgrade={restaurant.has_vibe_upgrade ?? false}
      hasMenuUpgrade={restaurant.has_menu_upgrade ?? false}
      vibeImageUrl={restaurant.vibe_image_url ?? null}
      items={itemsWithModifiers}
      hasPromotions={promotions.length > 0}
      promotions={promotions}
      isOpen={hoursStatus.isOpenNow}
      closingSoon={hoursStatus.closingSoon}
      closesAtText={hoursStatus.closesAtText}
      nextOpenText={hoursStatus.nextOpenText}
      statusText={hoursStatus.statusText}
    />
  );
}
