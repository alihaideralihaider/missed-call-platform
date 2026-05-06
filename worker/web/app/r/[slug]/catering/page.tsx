import Link from "next/link";
import RestaurantMenuClient from "@/components/storefront/RestaurantMenuClient";
import { loadRestaurantMenu } from "@/lib/storefront/loadRestaurantMenu";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CateringPage({ params }: Props) {
  const { slug } = await params;
  const menu = await loadRestaurantMenu(slug, { categoryName: "catering" });

  if (!menu) {
    return <div>Restaurant not found</div>;
  }

  if (menu.items.length === 0) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <div className="mx-auto min-h-screen max-w-md bg-white px-4 py-6 shadow-sm">
          <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Catering Menu
            </p>
            <h1 className="mt-2 text-xl font-bold text-neutral-900">
              Catering menu is not available yet.
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Please check the main menu or call the restaurant.
            </p>
            <Link
              href={`/r/${slug}`}
              className="mt-5 inline-block rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              View main menu
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <RestaurantMenuClient
      restaurantName={menu.restaurant.name}
      restaurantAddress={menu.restaurantAddress}
      menuEyebrow="Catering Menu"
      menuIntroTitle="Schedule your catering order"
      menuIntroBody="Order from the restaurant's catering menu using the same direct pickup checkout."
      menuIntroNotes={[
        "Minimum order notice may apply.",
        "For large orders, the restaurant may confirm details before preparation.",
      ]}
      hasVibeUpgrade={menu.restaurant.has_vibe_upgrade ?? false}
      hasMenuUpgrade={menu.restaurant.has_menu_upgrade ?? false}
      vibeImageUrl={menu.restaurant.vibe_image_url ?? null}
      items={menu.items}
      hasPromotions={false}
      promotions={[]}
      isOpen={menu.hoursStatus.isOpenNow}
      closingSoon={menu.hoursStatus.closingSoon}
      closesAtText={menu.hoursStatus.closesAtText}
      nextOpenText={menu.hoursStatus.nextOpenText}
      statusText={menu.hoursStatus.statusText}
    />
  );
}
