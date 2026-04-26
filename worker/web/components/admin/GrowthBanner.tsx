"use client";

import Link from "next/link";

type Props = {
  slug: string;
};

export default function GrowthBanner({ slug }: Props) {
  return (
    <div className="border-b border-neutral-200 bg-neutral-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900">
            SaanaOS growth space
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Future promotions and platform announcements will appear here.
          </p>
        </div>

        <Link
          href={`/admin/restaurants/${slug}/billing`}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Manage plan
        </Link>
      </div>
    </div>
  );
}
