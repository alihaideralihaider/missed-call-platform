"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UpgradeModal from "./UpgradeModal";

type UpgradeType = "vibe" | "menu" | "bundle";

type Props = {
  slug: string;
  hasVibeUpgrade?: boolean;
  hasMenuUpgrade?: boolean;
};

export default function RestaurantVisualUpgrades({
  slug,
  hasVibeUpgrade = false,
  hasMenuUpgrade = false,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleChoose(type: UpgradeType) {
    try {
      setLoading(true);

      const res = await fetch(`/api/admin/restaurants/${slug}/upgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to apply upgrade.");
      }

      setOpen(false);
      router.refresh();
      alert("Upgrade applied successfully.");
    } catch (error) {
      console.error("Upgrade error:", error);
      alert("Something went wrong while applying the upgrade.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">
              Visual upgrades
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Turn on vibe and menu image upgrade options for this restaurant.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
          >
            Upgrade visuals
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              hasVibeUpgrade
                ? "bg-green-100 text-green-700"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            Vibe: {hasVibeUpgrade ? "Enabled" : "Not enabled"}
          </span>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              hasMenuUpgrade
                ? "bg-green-100 text-green-700"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            Menu: {hasMenuUpgrade ? "Enabled" : "Not enabled"}
          </span>
        </div>
      </div>

      <UpgradeModal
        open={open}
        loading={loading}
        onClose={() => {
          if (!loading) setOpen(false);
        }}
        onChoose={handleChoose}
      />
    </>
  );
}