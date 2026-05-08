import { notFound } from "next/navigation";
import { loadRestaurantMenu } from "@/lib/storefront/loadRestaurantMenu";
import MysteryOfferClient from "./MysteryOfferClient";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function RestaurantMysteryOfferPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await loadRestaurantMenu(slug);

  if (!data?.restaurant) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fef3c7,_transparent_34%),linear-gradient(180deg,#f8fafc,#ffffff)]">
      <MysteryOfferClient
        restaurantName={data.restaurant.name || "this restaurant"}
        slug={data.restaurant.slug || slug}
      />
    </main>
  );
}
