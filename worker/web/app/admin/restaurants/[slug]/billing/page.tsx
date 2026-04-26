import { redirect } from "next/navigation";
import RestaurantBillingActions from "@/components/admin/RestaurantBillingActions";
import { getRestaurantAdminAccessBySlug } from "@/lib/admin/restaurant-access";
import {
  getAddonLabel,
  getServiceLabel,
  getSubscriptionLabel,
  isAddonKey,
} from "@/lib/billing";
import { getRestaurantUsageSummary } from "@/lib/restaurant-usage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatMoney(value: number | string | null | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? `$${number.toFixed(2)}` : "—";
}

function normalizeAddons(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry || "").trim().toLowerCase())
    .filter(
      (entry): entry is "assisted_support" | "hosting" | "virtual_phone" =>
        isAddonKey(entry)
    );
}

export default async function RestaurantBillingPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const access = await getRestaurantAdminAccessBySlug(slug);

  if (!access) {
    redirect("/login?error=not_authorized");
  }

  const query = searchParams ? await searchParams : {};
  const checkoutState = String(query?.checkout || "").trim().toLowerCase();
  const admin = createSupabaseAdminClient();

  const [{ data: billing }, { data: services }, usage] = await Promise.all([
    admin
      .schema("food_ordering")
      .from("restaurant_billing")
      .select(
        "stripe_customer_id, stripe_subscription_id, plan_key, subscription_status, current_period_end, addons"
      )
      .eq("restaurant_id", access.restaurant.id)
      .maybeSingle(),
    admin
      .schema("food_ordering")
      .from("service_purchases")
      .select("id, service_key, amount, status, created_at")
      .eq("restaurant_id", access.restaurant.id)
      .order("created_at", { ascending: false })
      .limit(5),
    getRestaurantUsageSummary(access.restaurant.id),
  ]);
  const activeAddons = normalizeAddons(billing?.addons);

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Restaurant billing
              </p>
              <h1 className="mt-1 text-2xl font-bold text-neutral-900">
                Billing
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Manage your plan, services, usage, and billing settings for {access.restaurant.slug}.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">
              Founding price locked forever
            </p>
            <p className="mt-1 text-sm text-amber-800">
              First 100 restaurants lock in founding pricing forever. All plans
              include a dedicated ordering line, 125 calls/month, 400 SMS/month,
              and a warning at 80% usage.
            </p>
          </div>

          {checkoutState === "success" ? (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Payment completed successfully.
            </div>
          ) : null}

          {checkoutState === "cancelled" ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Payment was cancelled before completion.
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm text-neutral-500">Current plan</p>
              <p className="mt-2 text-lg font-semibold text-neutral-900">
                {getSubscriptionLabel(billing?.plan_key)}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm text-neutral-500">Subscription status</p>
              <p className="mt-2 text-lg font-semibold text-neutral-900">
                {billing?.subscription_status || "No active subscription"}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm text-neutral-500">Next billing date</p>
              <p className="mt-2 text-lg font-semibold text-neutral-900">
                {formatDate(billing?.current_period_end)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm text-neutral-500">Active add-ons</p>
            {activeAddons.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {activeAddons.map((addon) => (
                  <span
                    key={addon}
                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700"
                  >
                    {getAddonLabel(addon)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold text-neutral-900">
                No active add-ons
              </p>
            )}
          </div>

          <div className="mt-6">
            <h2 className="text-base font-semibold text-neutral-900">
              Current monthly usage
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Usage is tracked for visibility only. Nothing is blocked automatically.
            </p>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    Billing period
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {formatDate(usage.periodStart)} to {formatDate(usage.periodEnd)}
                  </p>
                </div>

                {usage.status !== "ok" ? (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      usage.status === "over_limit"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {usage.status === "over_limit" ? "Over limit" : "Warning"}
                  </span>
                ) : null}
              </div>

              {usage.message ? (
                <div
                  className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                    usage.status === "over_limit"
                      ? "border border-red-200 bg-red-50 text-red-700"
                      : "border border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {usage.message}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <p className="text-sm text-neutral-500">Orders used</p>
                  <p className="mt-2 text-lg font-semibold text-neutral-900">
                    {usage.ordersCount} / {usage.limits.orders}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {usage.percentages.orders}% of included usage
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <p className="text-sm text-neutral-500">SMS used</p>
                  <p className="mt-2 text-lg font-semibold text-neutral-900">
                    {usage.smsSentCount} / {usage.limits.sms}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {usage.percentages.sms}% of included usage
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <p className="text-sm text-neutral-500">Calls used</p>
                  <p className="mt-2 text-lg font-semibold text-neutral-900">
                    {usage.callsCount} / {usage.limits.calls}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {usage.percentages.calls}% of included usage
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-sm font-medium text-neutral-900">
                  Top-up and usage policy
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                    Auto top-up: $10
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                    Adds +100 calls / +300 SMS
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                    No rollover
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                    No service interruption
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-base font-semibold text-neutral-900">
              Plans & services
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Choose the founding plan that fits your restaurant, keep your price locked in, and manage billing in one place.
            </p>

            <div className="mt-4">
              <RestaurantBillingActions
                slug={access.restaurant.slug}
                hasStripeCustomer={Boolean(billing?.stripe_customer_id)}
              />
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-base font-semibold text-neutral-900">
              Recent service purchases
            </h2>

            {services && services.length > 0 ? (
              <div className="mt-3 space-y-3">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {getServiceLabel(service.service_key)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {formatDate(service.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-neutral-900">
                          {formatMoney(service.amount)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {service.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">
                No service purchases yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
