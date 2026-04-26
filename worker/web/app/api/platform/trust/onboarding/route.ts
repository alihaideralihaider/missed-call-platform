import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentPlatformAccess } from "@/lib/platform/access";

type RestaurantRow = {
  id: string;
  name: string;
  slug: string;
  contact_email: string | null;
  contact_phone: string | null;
  onboarding_status: string | null;
  onboarding_source_ip: string | null;
  onboarding_user_agent: string | null;
  is_active: boolean | null;
  created_at: string | null;
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
      .select(
        "id, name, slug, contact_email, contact_phone, onboarding_status, onboarding_source_ip, onboarding_user_agent, is_active, created_at"
      )
      .neq("onboarding_status", "active")
      .order("created_at", { ascending: false });

    if (restaurantsError) {
      throw new Error(
        `Failed to load onboarding records: ${restaurantsError.message}`
      );
    }

    const restaurants = (restaurantsData || []) as RestaurantRow[];
    const restaurantIds = restaurants.map((restaurant) => restaurant.id);

    let businessRows: Array<{ restaurant_id: string; status: string | null }> = [];
    if (restaurantIds.length > 0) {
      const { data: businessesData, error: businessesError } = await admin
        .from("businesses")
        .select("restaurant_id, status")
        .in("restaurant_id", restaurantIds);

      if (businessesError) {
        throw new Error(`Failed to load business statuses: ${businessesError.message}`);
      }

      businessRows = (businessesData || []) as Array<{
        restaurant_id: string;
        status: string | null;
      }>;
    }

    const allIps = restaurants
      .map((restaurant) => String(restaurant.onboarding_source_ip || "").trim())
      .filter(Boolean);
    const ipCountMap = new Map<string, number>();

    for (const ip of allIps) {
      ipCountMap.set(ip, (ipCountMap.get(ip) || 0) + 1);
    }

    const businessStatusMap = new Map(
      businessRows.map((row) => [row.restaurant_id, row.status || null])
    );

    const enrichedRecords = restaurants.map((restaurant) => {
      const ip = String(restaurant.onboarding_source_ip || "").trim();

      return {
        ...restaurant,
        business_status: businessStatusMap.get(restaurant.id) || null,
        repeated_ip_count: ip ? ipCountMap.get(ip) || 1 : 0,
      };
    });

    const filteredRecords = query
      ? enrichedRecords.filter((restaurant) =>
          [
            restaurant.name,
            restaurant.slug,
            restaurant.contact_email,
            restaurant.contact_phone,
            restaurant.onboarding_status,
            restaurant.business_status,
            restaurant.onboarding_source_ip,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(query)
            )
        )
      : enrichedRecords;

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
    console.error("GET /api/platform/trust/onboarding failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
