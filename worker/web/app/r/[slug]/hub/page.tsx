import Link from "next/link";

import { loadRestaurantMenu } from "@/lib/storefront/loadRestaurantMenu";

type Props = {
  params: Promise<{ slug: string }>;
};

const placeholderSpecials = [
  {
    title: "Chef's Pickup Pick",
    body: "A featured favorite from today's direct ordering menu.",
  },
  {
    title: "Family Meal Idea",
    body: "Build an easy pickup order for the table.",
  },
  {
    title: "Quick Lunch",
    body: "Fast, direct ordering when you are short on time.",
  },
];

const reviewPlaceholders = [
  { label: "Google rating", value: "Coming soon" },
  { label: "Yelp rating", value: "Coming soon" },
  { label: "Facebook recommended", value: "Coming soon" },
];

function formatLocationLine(menu: Awaited<ReturnType<typeof loadRestaurantMenu>>) {
  if (!menu?.restaurantAddress) {
    return null;
  }

  const parts = menu.restaurantAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length >= 2 ? parts.slice(-3).join(", ") : menu.restaurantAddress;
}

function getStatusText(menu: Awaited<ReturnType<typeof loadRestaurantMenu>>) {
  if (!menu) return "Official restaurant hub";

  const statusText = String(menu.hoursStatus.statusText || "").trim();
  if (statusText) return statusText;

  if (menu.hoursStatus.isOpenNow) return "Open now";
  if (menu.hoursStatus.nextOpenText) return menu.hoursStatus.nextOpenText;

  return "Official restaurant hub";
}

function getDirectionsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address
  )}`;
}

export default async function RestaurantHubPage({ params }: Props) {
  const { slug } = await params;
  const menu = await loadRestaurantMenu(slug);

  if (!menu) {
    return <div>Restaurant not found</div>;
  }

  const restaurant = menu.restaurant;
  const locationLine = formatLocationLine(menu);
  const statusText = getStatusText(menu);
  const heroImageUrl =
    restaurant.has_vibe_upgrade && restaurant.vibe_image_url
      ? restaurant.vibe_image_url
      : null;
  const specials =
    menu.promotions.length > 0
      ? menu.promotions.slice(0, 3).map((promo) => ({
          title: promo.title,
          body: promo.subtitle || "Available for direct pickup orders.",
        }))
      : placeholderSpecials;

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      <div className="mx-auto min-h-screen max-w-md bg-white shadow-sm">
        <section className="px-5 pb-6 pt-6">
          <div className="flex items-start gap-4">
            {heroImageUrl ? (
              <img
                src={heroImageUrl}
                alt={`${restaurant.name} logo`}
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 text-xl font-bold text-white">
                {restaurant.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {statusText}
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                {restaurant.name}
              </h1>
              {locationLine ? (
                <p className="mt-1 text-sm text-neutral-500">{locationLine}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <Link
              href={`/r/${slug}`}
              className="rounded-2xl bg-neutral-900 px-5 py-4 text-center text-sm font-semibold text-white"
            >
              Order Now
            </Link>
            <Link
              href={`/r/${slug}`}
              className="rounded-2xl border border-neutral-200 px-5 py-4 text-center text-sm font-semibold text-neutral-900"
            >
              View Menu
            </Link>
          </div>

          <p className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            You scanned or tapped the official restaurant hub.
          </p>
        </section>

        <section className="border-t border-neutral-100 px-5 py-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Offers
              </p>
              <h2 className="text-xl font-bold">Today&apos;s Specials</h2>
            </div>
          </div>

          <div className="grid gap-3">
            {specials.map((special) => (
              <div
                key={special.title}
                className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
              >
                <h3 className="font-semibold">{special.title}</h3>
                <p className="mt-1 text-sm text-neutral-600">{special.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="reviews" className="border-t border-neutral-100 px-5 py-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Reviews
          </p>
          <h2 className="mt-1 text-xl font-bold">What guests are saying</h2>

          <div className="mt-4 grid gap-3">
            {reviewPlaceholders.map((review) => (
              <div
                key={review.label}
                className="flex items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3"
              >
                <span className="text-sm font-medium">{review.label}</span>
                <span className="text-sm text-neutral-500">{review.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <a
              href="#reviews"
              className="rounded-2xl border border-neutral-200 px-4 py-3 text-center text-sm font-semibold text-neutral-900"
            >
              Read Reviews
            </a>
            <a
              href="#reviews"
              className="rounded-2xl border border-neutral-200 px-4 py-3 text-center text-sm font-semibold text-neutral-900"
            >
              Leave Review
            </a>
          </div>
        </section>

        <section className="border-t border-neutral-100 px-5 py-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Restaurant Info
          </p>
          <h2 className="mt-1 text-xl font-bold">Plan your visit</h2>

          <div className="mt-4 space-y-3 text-sm">
            <InfoRow label="Address" value={menu.restaurantAddress || "Not listed"} />
            <InfoRow label="Hours" value={statusText} />
            <InfoRow label="Phone" value="Not listed" />
          </div>

          {menu.restaurantAddress ? (
            <a
              href={getDirectionsUrl(menu.restaurantAddress)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block rounded-2xl bg-neutral-900 px-5 py-4 text-center text-sm font-semibold text-white"
            >
              Directions
            </a>
          ) : null}
        </section>

        <section className="border-t border-neutral-100 px-5 py-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Social
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Instagram", "Facebook", "WhatsApp"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-500"
              >
                {label} coming soon
              </span>
            ))}
          </div>
        </section>

        <footer className="border-t border-neutral-100 px-5 py-6 text-center">
          <p className="text-sm font-bold">Powered by SaanaOS</p>
          <p className="mt-1 text-xs text-neutral-500">
            Official restaurant ordering and review hub
          </p>
        </footer>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-neutral-800">{value}</p>
    </div>
  );
}
