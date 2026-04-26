import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentPlatformAccess } from "@/lib/platform/access";

type RestaurantIpRow = {
  id: string;
  name: string;
  slug: string;
  onboarding_status: string | null;
  onboarding_source_ip: string | null;
  created_at: string | null;
};

type WatchlistRow = {
  id: string;
  ip_address: string;
  status: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(String(value || "1"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(String(value || "20"), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(parsed, 50);
}

export async function GET(req: Request) {
  const access = await getCurrentPlatformAccess();

  if (!access) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  try {
    const url = new URL(req.url);
    const query = String(url.searchParams.get("query") || "")
      .trim()
      .toLowerCase();
    const page = parsePage(url.searchParams.get("page"));
    const limit = parseLimit(url.searchParams.get("limit"));

    const { data: restaurantsData, error: restaurantsError } = await admin
      .schema("food_ordering")
      .from("restaurants")
      .select("id, name, slug, onboarding_status, onboarding_source_ip, created_at")
      .not("onboarding_source_ip", "is", null)
      .order("created_at", { ascending: false });

    if (restaurantsError) {
      throw new Error(`Failed to load onboarding IPs: ${restaurantsError.message}`);
    }

    const { data: watchlistData, error: watchlistError } = await admin
      .from("platform_ip_watchlist")
      .select("id, ip_address, status, reason, notes, created_at, updated_at")
      .order("updated_at", { ascending: false });

    if (watchlistError) {
      throw new Error(`Failed to load IP watchlist: ${watchlistError.message}`);
    }

    const restaurantRows = (restaurantsData || []) as RestaurantIpRow[];
    const watchlistRows = (watchlistData || []) as WatchlistRow[];
    const grouped = new Map<
      string,
      {
        ip_address: string;
        first_seen_at: string | null;
        last_seen_at: string | null;
        onboarding_count: number;
        restaurants: Array<{
          id: string;
          name: string;
          slug: string;
          onboarding_status: string | null;
          created_at: string | null;
        }>;
      }
    >();

    for (const row of restaurantRows) {
      const ip = String(row.onboarding_source_ip || "").trim();
      if (!ip) continue;

      const existing = grouped.get(ip) || {
        ip_address: ip,
        first_seen_at: row.created_at,
        last_seen_at: row.created_at,
        onboarding_count: 0,
        restaurants: [],
      };

      existing.onboarding_count += 1;
      existing.restaurants.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        onboarding_status: row.onboarding_status,
        created_at: row.created_at,
      });

      if (!existing.first_seen_at || (row.created_at && row.created_at < existing.first_seen_at)) {
        existing.first_seen_at = row.created_at;
      }

      if (!existing.last_seen_at || (row.created_at && row.created_at > existing.last_seen_at)) {
        existing.last_seen_at = row.created_at;
      }

      grouped.set(ip, existing);
    }

    const watchlistMap = new Map(
      watchlistRows.map((row) => [row.ip_address, row])
    );

    const records = Array.from(grouped.values())
      .map((record) => {
        const watchlist = watchlistMap.get(record.ip_address) || null;

        return {
          ...record,
          watchlist_id: watchlist?.id || null,
          watch_status: watchlist?.status || null,
          watch_reason: watchlist?.reason || null,
          watch_notes: watchlist?.notes || null,
          watch_updated_at: watchlist?.updated_at || null,
        };
      })
      .sort((a, b) => {
        if (b.onboarding_count !== a.onboarding_count) {
          return b.onboarding_count - a.onboarding_count;
        }

        return String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || ""));
      });

    const filteredRecords = query
      ? records.filter((record) => {
          const restaurantMatches = record.restaurants.some((restaurant) =>
            [restaurant.name, restaurant.slug, restaurant.onboarding_status]
              .filter(Boolean)
              .some((value) =>
                String(value).toLowerCase().includes(query)
              )
          );

          return (
            [
              record.ip_address,
              record.watch_status,
              record.watch_reason,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value).toLowerCase().includes(query)
              ) || restaurantMatches
          );
        })
      : records;

    const total = filteredRecords.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const pagedRecords = filteredRecords.slice(start, start + limit);

    return NextResponse.json({
      success: true,
      records: pagedRecords,
      pagination: {
        page: safePage,
        limit,
        total,
        total_pages: totalPages,
        has_next_page: safePage < totalPages,
        has_previous_page: safePage > 1,
      },
    });
  } catch (error) {
    console.error("GET /api/platform/trust/ip-risk failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
