import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPlatformPromotionBySlug,
  getPlatformPromotionHref,
} from "@/lib/platformPromotions";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PlatformPromoDetailPage({ params }: Props) {
  const { slug } = await params;
  const promo = getPlatformPromotionBySlug(slug);

  if (!promo) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <Link
          href="/admin"
          className="text-sm font-medium text-neutral-500"
        >
          ← Back to admin
        </Link>

        <div className="mt-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            SaanaOS Platform Promotion
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">
            {promo.title}
          </h1>

          <p className="mt-4 text-sm leading-6 text-neutral-600">
            This is a platform-controlled destination that can later power feature
            launches, upgrade campaigns, internal announcements, third-party
            offers, and SaanaOS education content.
          </p>

          <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm font-semibold text-neutral-900">Why this matters</p>
            <p className="mt-2 text-sm text-neutral-600">
              Stronger storefront presentation usually improves menu trust, click
              depth, and repeat ordering. This detail page is the lightweight
              destination layer behind the new promo placements.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm font-semibold text-neutral-900">Current foundation</p>
            <p className="mt-2 text-sm text-neutral-600">
              Promotion cards support title, body, icon, placement key, active
              state, CTA label, and either an internal route or external URL.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Back to admin
            </Link>

            {promo.target_type === "external" ? (
              <a
                href={getPlatformPromotionHref(promo)}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900"
              >
                {promo.cta_label || "Open"}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
