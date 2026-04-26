"use client";

import { useState } from "react";
import {
  ADDON_KEYS,
  BILLING_ADD_ONS,
  BILLING_SERVICES,
  SUBSCRIPTION_PLANS,
  type AddonKey,
  type ServiceKey,
  type SubscriptionPlanKey,
} from "@/lib/billing";

type Props = {
  slug: string;
  hasStripeCustomer: boolean;
};

type ActionKey =
  | `plan-${SubscriptionPlanKey}`
  | `service-${ServiceKey}`
  | "portal";

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Request failed.");
  }

  return data as { url?: string };
}

function buttonClass(primary = false) {
  return primary
    ? "w-full rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
    : "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60";
}

const PLAN_DETAILS: Record<
  SubscriptionPlanKey,
  {
    badge?: string;
    intro: string;
    originalPrice: string;
    features: string[];
    cta: string;
  }
> = {
  base_monthly: {
    badge: "Founding price locked forever",
    intro: "Simple launch plan for restaurants that want a clean ordering line.",
    originalPrice: "Normally $59/month",
    features: [
      "Dedicated ordering line included",
      "125 calls/month",
      "400 SMS/month",
      "Warning at 80%",
      "Missed call to SMS link",
      "Order notifications: confirmed and ready",
    ],
    cta: "Get Started",
  },
  pro_monthly: {
    badge: "Founding price locked forever",
    intro: "Everything in Basic plus stronger storefront tools.",
    originalPrice: "Normally $69/month",
    features: [
      "Dedicated ordering line included",
      "125 calls/month",
      "400 SMS/month",
      "Warning at 80%",
      "Menu image upgrades",
      "Promotions display",
      "Better storefront experience",
    ],
    cta: "Start Pro",
  },
  pro_plus_monthly: {
    badge: "Founding price locked forever",
    intro: "Everything in Pro plus more hands-on support.",
    originalPrice: "Normally $79/month",
    features: [
      "Dedicated ordering line included",
      "125 calls/month",
      "400 SMS/month",
      "Warning at 80%",
      "Priority support",
      "Assisted onboarding coming soon",
    ],
    cta: "Start Pro Plus",
  },
};

export default function RestaurantBillingActions({
  slug,
  hasStripeCustomer,
}: Props) {
  const [activeAction, setActiveAction] = useState<ActionKey | "">("");
  const [error, setError] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<AddonKey[]>([]);

  function toggleAddon(addonKey: AddonKey) {
    setSelectedAddons((current) =>
      current.includes(addonKey)
        ? current.filter((entry) => entry !== addonKey)
        : [...current, addonKey]
    );
  }

  async function startSubscription(
    planKey: SubscriptionPlanKey,
    action: ActionKey
  ) {
    setActiveAction(action);
    setError("");

    try {
      const data = await postJson("/api/billing/create-subscription-checkout", {
        restaurantSlug: slug,
        planKey,
        addons: selectedAddons.filter((entry) => ADDON_KEYS.includes(entry)),
      });

      if (!data.url) {
        throw new Error("Payment session URL was not returned.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setActiveAction("");
    }
  }

  async function startService(serviceKey: ServiceKey, action: ActionKey) {
    setActiveAction(action);
    setError("");

    try {
      const data = await postJson("/api/billing/create-service-checkout", {
        restaurantSlug: slug,
        serviceKey,
      });

      if (!data.url) {
        throw new Error("Payment session URL was not returned.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setActiveAction("");
    }
  }

  async function openPortal() {
    setActiveAction("portal");
    setError("");

    try {
      const data = await postJson("/api/billing/create-portal-session", {
        restaurantSlug: slug,
      });

      if (!data.url) {
        throw new Error("Billing portal session URL was not returned.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setActiveAction("");
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {SUBSCRIPTION_PLANS.map((plan, index) => {
          const actionKey = `plan-${plan.key}` as ActionKey;
          const isActive = activeAction === actionKey;
          const planDetails = PLAN_DETAILS[plan.key];

          return (
            <div
              key={plan.key}
              className={`rounded-2xl border p-4 ${
                index === 0
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200 bg-neutral-50"
              }`}
            >
              {planDetails.badge ? (
                <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                  {planDetails.badge}
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-neutral-900">
                    {plan.label}
                  </p>
                  <div className="mt-1 flex flex-wrap items-end gap-2">
                    <p className="text-xl font-bold text-neutral-900">
                      {plan.priceLabel}
                    </p>
                    <p className="text-sm text-neutral-500 line-through">
                      {planDetails.originalPrice}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {planDetails.intro}
              </p>
              <div className="mt-4 space-y-2">
                {planDetails.features.map((feature) => (
                  <div
                    key={feature}
                    className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700"
                  >
                    {feature}
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Optional add-ons
                </p>
                {BILLING_ADD_ONS.filter(
                  (addOn) =>
                    addOn.key === "assisted_support" ||
                    addOn.key === "hosting" ||
                    addOn.key === "virtual_phone"
                ).map((addOn) => {
                  const addonKey = addOn.key as AddonKey;

                  return (
                    <label
                      key={addOn.key}
                      className="flex items-start gap-3 text-sm text-neutral-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAddons.includes(addonKey)}
                        onChange={() => toggleAddon(addonKey)}
                        disabled={Boolean(activeAction)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium text-neutral-900">
                          {addOn.label}
                        </span>{" "}
                        <span className="text-neutral-500">({addOn.priceLabel})</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => startSubscription(plan.key, actionKey)}
                disabled={Boolean(activeAction)}
                className={`mt-4 ${buttonClass(index === 0)}`}
              >
                {isActive ? "Loading..." : planDetails.cta}
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-sm font-semibold text-neutral-900">One-time services</p>
        <p className="mt-1 text-sm text-neutral-500">
          Purchase setup or support services securely.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {BILLING_SERVICES.map((service) => {
            const actionKey = `service-${service.key}` as ActionKey;
            const isActive = activeAction === actionKey;

            return (
              <div
                key={service.key}
                className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-900">
                    {service.label}
                  </p>
                  <span className="shrink-0 text-xs font-medium text-neutral-500">
                    {service.priceLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {service.description}
                </p>
                <button
                  type="button"
                  onClick={() => startService(service.key, actionKey)}
                  disabled={Boolean(activeAction)}
                  className={`mt-4 ${buttonClass()}`}
                >
                  {isActive ? "Loading..." : `Buy ${service.label}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-sm font-semibold text-neutral-900">Monthly add-ons</p>
        <p className="mt-1 text-sm text-neutral-500">Secure payment.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {BILLING_ADD_ONS.map((addOn) => (
            <div
              key={addOn.key}
              className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-neutral-900">
                  {addOn.label}
                </p>
                <span className="shrink-0 text-xs font-medium text-neutral-500">
                  {addOn.priceLabel}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {addOn.description}
              </p>
              <p className="mt-4 text-xs font-medium text-neutral-500">
                Select this add-on from a plan card above.
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-sm font-semibold text-neutral-900">Billing portal</p>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your payment method, invoices, and subscription.
        </p>
        <button
          type="button"
          onClick={openPortal}
          disabled={Boolean(activeAction) || !hasStripeCustomer}
          className={`mt-4 ${buttonClass()}`}
        >
          {activeAction === "portal" ? "Loading..." : "Open billing portal"}
        </button>
        <p className="mt-2 text-xs text-neutral-500">
          Available after your first payment.
        </p>
      </div>
    </div>
  );
}
