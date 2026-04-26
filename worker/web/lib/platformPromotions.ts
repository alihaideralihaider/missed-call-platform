export type PlatformPromoTargetType = "internal" | "external";

export type PlatformPromotion = {
  slug: string;
  title: string;
  short_body: string;
  image_url?: string | null;
  icon?: string | null;
  cta_label?: string | null;
  placement_keys: string[];
  is_active: boolean;
  target_type: PlatformPromoTargetType;
  target_url?: string | null;
};

const PLATFORM_PROMOTIONS: PlatformPromotion[] = [
  {
    slug: "storefront-upgrade-playbook",
    title: "Boost repeat orders with a sharper storefront",
    short_body:
      "See how SaanaOS storefront polish, menu visuals, and tighter customer journeys can lift conversion.",
    icon: "↗",
    cta_label: "View details",
    placement_keys: ["restaurant_admin_orders_empty", "restaurant_admin_sales"],
    is_active: true,
    target_type: "internal",
  },
  {
    slug: "restaurant-growth-audit",
    title: "Book a growth audit",
    short_body:
      "Get a platform-led review of menu presentation, promotions, and missed conversion points.",
    icon: "◎",
    cta_label: "Open audit link",
    placement_keys: ["restaurant_admin_orders_empty"],
    is_active: false,
    target_type: "external",
    target_url: "https://saanaos.com",
  },
];

export function getPlatformPromotionsForPlacement(placementKey: string) {
  return PLATFORM_PROMOTIONS.filter(
    (promo) =>
      promo.is_active && promo.placement_keys.includes(placementKey)
  );
}

export function getPlatformPromotionBySlug(slug: string) {
  return (
    PLATFORM_PROMOTIONS.find(
      (promo) => promo.is_active && promo.slug === slug
    ) || null
  );
}

export function getPlatformPromotionHref(promo: PlatformPromotion): string {
  if (promo.target_type === "external") {
    return String(promo.target_url || "").trim();
  }

  return `/admin/platform/promos/${promo.slug}`;
}
