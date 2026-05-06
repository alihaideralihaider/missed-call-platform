import RestaurantMenuClient from "@/components/storefront/RestaurantMenuClient";
import { loadRestaurantMenu } from "@/lib/storefront/loadRestaurantMenu";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const menu = await loadRestaurantMenu(slug);

  if (!menu) {
    return <div>Restaurant not found</div>;
  }

  return (
    <RestaurantMenuClient
      restaurantName={menu.restaurant.name}
      restaurantAddress={menu.restaurantAddress}
      hasVibeUpgrade={menu.restaurant.has_vibe_upgrade ?? false}
      hasMenuUpgrade={menu.restaurant.has_menu_upgrade ?? false}
      vibeImageUrl={menu.restaurant.vibe_image_url ?? null}
      items={menu.items}
      hasPromotions={menu.promotions.length > 0}
      promotions={menu.promotions}
      isOpen={menu.hoursStatus.isOpenNow}
      closingSoon={menu.hoursStatus.closingSoon}
      closesAtText={menu.hoursStatus.closesAtText}
      nextOpenText={menu.hoursStatus.nextOpenText}
      statusText={menu.hoursStatus.statusText}
    />
  );
}
