"use client";

import Link from "next/link";

type Props = {
  slug: string;
  hasVisualUpgrades?: boolean;
  hasVibeUpgrade?: boolean;
  hasMenuUpgrade?: boolean;
};

export default function RestaurantVisualUpgrades({
  slug,
  hasVisualUpgrades = false,
  hasVibeUpgrade = false,
  hasMenuUpgrade = false,
}: Props) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        hasVisualUpgrades
          ? "border-neutral-200 bg-white"
          : "border-neutral-200 bg-neutral-50"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">
            Visual upgrades
          </h3>
          <p className="mt-1 text-sm text-neutral-500">
            {hasVisualUpgrades
              ? "Vibe image placement and menu image upgrades are available with your current plan."
              : "Visual upgrades are included with Pro and Pro Plus."}
          </p>
        </div>

        {hasVisualUpgrades ? (
          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            Included in plan
          </span>
        ) : (
          <Link
            href={`/admin/restaurants/${slug}/billing`}
            className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Upgrade plan
          </Link>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            hasVibeUpgrade
              ? "bg-green-100 text-green-700"
              : "bg-neutral-200 text-neutral-600"
          }`}
        >
          Vibe image placement: {hasVibeUpgrade ? "Available" : "Locked"}
        </span>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            hasMenuUpgrade
              ? "bg-green-100 text-green-700"
              : "bg-neutral-200 text-neutral-600"
          }`}
        >
          Menu image upgrades: {hasMenuUpgrade ? "Available" : "Locked"}
        </span>
      </div>

      {!hasVisualUpgrades ? (
        <p className="mt-4 text-xs text-neutral-500">
          Upgrade your plan to unlock visual enhancements for vibe backgrounds
          and menu imagery.
        </p>
      ) : null}
    </div>
  );
}
