import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type SuggestionRow = {
  id: string;
  restaurant_id: string;
  item_id: string;
  modifier_group_id: string | null;
  modifier_option_id: string | null;
  suggestion_type: string;
  reason: string | null;
  status: string;
  price_delta: number | string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  responded_at: string | null;
};

type RestaurantRow = {
  id: string;
  name: string | null;
  slug: string;
};

type OptionPerformance = {
  key: string;
  modifier: string;
  group: string;
  shown: number;
  accepted: number;
  skipped: number;
  revenueAdded: number;
};

type TypePerformance = {
  type: string;
  shown: number;
  accepted: number;
  revenueAdded: number;
};

function cleanSlug(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  return s && s !== "undefined" && s !== "null" ? s : "";
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value: number): string {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

function acceptanceRate(accepted: number, shown: number): number {
  return shown > 0 ? (accepted / shown) * 100 : 0;
}

function metadataString(
  metadata: Record<string, unknown> | null,
  key: string
): string {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function optionLabel(row: SuggestionRow): string {
  return (
    metadataString(row.metadata, "optionName") ||
    row.modifier_option_id ||
    "Unknown modifier"
  );
}

function groupLabel(row: SuggestionRow): string {
  return (
    metadataString(row.metadata, "groupName") ||
    row.modifier_group_id ||
    "Unknown group"
  );
}

function statusIs(row: SuggestionRow, status: string): boolean {
  return String(row.status || "").trim().toLowerCase() === status;
}

function summarizeByOption(rows: SuggestionRow[]): OptionPerformance[] {
  const map = new Map<string, OptionPerformance>();

  for (const row of rows) {
    const key =
      row.modifier_option_id ||
      `${groupLabel(row).toLowerCase()}::${optionLabel(row).toLowerCase()}`;
    const existing =
      map.get(key) ||
      {
        key,
        modifier: optionLabel(row),
        group: groupLabel(row),
        shown: 0,
        accepted: 0,
        skipped: 0,
        revenueAdded: 0,
      };

    existing.shown += 1;
    if (statusIs(row, "accepted")) {
      existing.accepted += 1;
      existing.revenueAdded += toNumber(row.price_delta);
    }
    if (statusIs(row, "skipped")) {
      existing.skipped += 1;
    }

    map.set(key, existing);
  }

  return [...map.values()].sort((a, b) => {
    if (b.revenueAdded !== a.revenueAdded) {
      return b.revenueAdded - a.revenueAdded;
    }
    if (b.accepted !== a.accepted) {
      return b.accepted - a.accepted;
    }
    return b.shown - a.shown;
  });
}

function summarizeByType(rows: SuggestionRow[]): TypePerformance[] {
  const map = new Map<string, TypePerformance>();

  for (const row of rows) {
    const type = String(row.suggestion_type || "unknown").trim() || "unknown";
    const existing =
      map.get(type) ||
      {
        type,
        shown: 0,
        accepted: 0,
        revenueAdded: 0,
      };

    existing.shown += 1;
    if (statusIs(row, "accepted")) {
      existing.accepted += 1;
      existing.revenueAdded += toNumber(row.price_delta);
    }

    map.set(type, existing);
  }

  return [...map.values()].sort((a, b) => {
    if (b.revenueAdded !== a.revenueAdded) {
      return b.revenueAdded - a.revenueAdded;
    }
    return b.shown - a.shown;
  });
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-neutral-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-neutral-500">{helper}</p> : null}
    </div>
  );
}

export default async function RestaurantInsightsPage({ params }: PageProps) {
  const { slug } = await params;
  const clean = cleanSlug(slug);
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: restaurant, error: restaurantError } = await admin
    .schema("food_ordering")
    .from("restaurants")
    .select("id, name, slug")
    .eq("slug", clean)
    .maybeSingle<RestaurantRow>();

  if (restaurantError || !restaurant) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <div className="mx-auto max-w-6xl p-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Restaurant not found.
          </div>
        </div>
      </main>
    );
  }

  const { data, error } = await admin
    .from("agent_modifier_suggestions")
    .select(
      "id, restaurant_id, item_id, modifier_group_id, modifier_option_id, suggestion_type, reason, status, price_delta, metadata, created_at, responded_at"
    )
    .eq("restaurant_id", restaurant.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const rows = (data || []) as SuggestionRow[];
  const totalShown = rows.length;
  const totalAccepted = rows.filter((row) => statusIs(row, "accepted")).length;
  const totalSkipped = rows.filter((row) => statusIs(row, "skipped")).length;
  const revenueAdded = rows.reduce(
    (sum, row) => sum + (statusIs(row, "accepted") ? toNumber(row.price_delta) : 0),
    0
  );
  const avgPerShown = totalShown > 0 ? revenueAdded / totalShown : 0;
  const avgPerAccept = totalAccepted > 0 ? revenueAdded / totalAccepted : 0;
  const optionRows = summarizeByOption(rows);
  const typeRows = summarizeByType(rows);

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Agent Insights
          </p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900">
            Modifier suggestion analytics
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {restaurant.name || restaurant.slug} · Last 30 days
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load modifier suggestion data.
          </div>
        ) : null}

        {totalShown === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600 shadow-sm">
            No modifier suggestion data yet. Suggestions will appear here after
            customers interact with add-on recommendations.
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-5">
              <MetricCard label="Suggestions shown" value={String(totalShown)} />
              <MetricCard label="Accepted" value={String(totalAccepted)} />
              <MetricCard
                label="Acceptance rate"
                value={formatPercent(acceptanceRate(totalAccepted, totalShown))}
                helper={`${totalSkipped} skipped`}
              />
              <MetricCard label="Revenue added" value={formatMoney(revenueAdded)} />
              <MetricCard
                label="Revenue per shown"
                value={formatMoney(avgPerShown)}
                helper={`${formatMoney(avgPerAccept)} per accept`}
              />
            </div>

            <section className="mt-6 rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-200 px-5 py-4">
                <h2 className="text-base font-semibold text-neutral-900">
                  Top modifier suggestions
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                  <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-5 py-3">Modifier</th>
                      <th className="px-5 py-3">Group</th>
                      <th className="px-5 py-3 text-right">Shown</th>
                      <th className="px-5 py-3 text-right">Accepted</th>
                      <th className="px-5 py-3 text-right">Skipped</th>
                      <th className="px-5 py-3 text-right">Acceptance %</th>
                      <th className="px-5 py-3 text-right">Revenue added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {optionRows.map((row) => (
                      <tr key={row.key}>
                        <td className="px-5 py-3 font-medium text-neutral-900">
                          {row.modifier}
                        </td>
                        <td className="px-5 py-3 text-neutral-600">{row.group}</td>
                        <td className="px-5 py-3 text-right text-neutral-700">
                          {row.shown}
                        </td>
                        <td className="px-5 py-3 text-right text-neutral-700">
                          {row.accepted}
                        </td>
                        <td className="px-5 py-3 text-right text-neutral-700">
                          {row.skipped}
                        </td>
                        <td className="px-5 py-3 text-right text-neutral-700">
                          {formatPercent(acceptanceRate(row.accepted, row.shown))}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-neutral-900">
                          {formatMoney(row.revenueAdded)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-200 px-5 py-4">
                <h2 className="text-base font-semibold text-neutral-900">
                  Suggestion type performance
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                  <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3 text-right">Shown</th>
                      <th className="px-5 py-3 text-right">Accepted</th>
                      <th className="px-5 py-3 text-right">Acceptance %</th>
                      <th className="px-5 py-3 text-right">Revenue added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {typeRows.map((row) => (
                      <tr key={row.type}>
                        <td className="px-5 py-3 font-medium text-neutral-900">
                          {row.type}
                        </td>
                        <td className="px-5 py-3 text-right text-neutral-700">
                          {row.shown}
                        </td>
                        <td className="px-5 py-3 text-right text-neutral-700">
                          {row.accepted}
                        </td>
                        <td className="px-5 py-3 text-right text-neutral-700">
                          {formatPercent(acceptanceRate(row.accepted, row.shown))}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-neutral-900">
                          {formatMoney(row.revenueAdded)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
