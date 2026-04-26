import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentPlatformAccess } from "@/lib/platform/access";
import {
  getRestaurantRiskSummaries,
  maybeLogRiskLinksDetected,
} from "@/lib/platform/risk-links";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

type ActivityRow = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  event_type: string;
  actor_type: string | null;
  actor_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

export async function GET(_req: Request, context: RouteContext) {
  const access = await getCurrentPlatformAccess();

  if (!access) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  try {
    const { restaurantId } = await context.params;

    const { data: restaurant, error: restaurantError } = await admin
      .schema("food_ordering")
      .from("restaurants")
      .select(
        "id, name, slug, contact_email, contact_phone, onboarding_status, onboarding_source_ip, onboarding_user_agent, is_active, created_at"
      )
      .eq("id", restaurantId)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
    }

    const [{ data: business, error: businessError }, { data: memberships, error: membershipsError }, { data: watchlist, error: watchlistError }, { data: activities, error: activitiesError }] =
      await Promise.all([
        admin
          .from("businesses")
          .select("id, restaurant_id, status, created_at")
          .eq("restaurant_id", restaurant.id)
          .maybeSingle(),
        admin
          .from("restaurant_users")
          .select(
            "id, auth_user_id, role, is_active, phone_verified, onboarding_status"
          )
          .eq("restaurant_id", restaurant.id)
          .order("created_at", { ascending: true }),
        restaurant.onboarding_source_ip
          ? admin
              .from("platform_ip_watchlist")
              .select("id, ip_address, status, reason, notes, updated_at")
              .eq("ip_address", restaurant.onboarding_source_ip)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        admin
          .from("platform_activity_events")
          .select(
            "id, entity_type, entity_id, event_type, actor_type, actor_user_id, metadata, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

    const riskSummary = (await getRestaurantRiskSummaries([restaurant.id])).get(
      restaurant.id
    );

    if (businessError) {
      throw new Error(`Failed to load business record: ${businessError.message}`);
    }

    if (membershipsError) {
      throw new Error(`Failed to load restaurant memberships: ${membershipsError.message}`);
    }

    if (watchlistError) {
      throw new Error(`Failed to load IP watchlist entry: ${watchlistError.message}`);
    }

    if (activitiesError) {
      throw new Error(`Failed to load platform activity: ${activitiesError.message}`);
    }

    const filteredActivities = ((activities || []) as ActivityRow[]).filter((activity) => {
      const metadata = activity.metadata || {};
      const metadataRestaurantSlug = String(metadata.restaurant_slug || "").trim();
      const metadataIp = String(
        metadata.onboarding_source_ip || metadata.ip_address || ""
      ).trim();

      return (
        (activity.entity_type === "restaurant" && activity.entity_id === restaurant.id) ||
        metadataRestaurantSlug === restaurant.slug ||
        (!!restaurant.onboarding_source_ip && metadataIp === restaurant.onboarding_source_ip)
      );
    });

    if (riskSummary) {
      await maybeLogRiskLinksDetected({
        restaurantId: restaurant.id,
        summary: riskSummary,
      });
    }

    return NextResponse.json({
      success: true,
      record: {
        ...restaurant,
        business: business || null,
        memberships: memberships || [],
        ip_watchlist: watchlist || null,
        activities: filteredActivities.slice(0, 20),
        risk_links: riskSummary || {
          duplicate_ip: false,
          duplicate_phone: false,
          duplicate_email: false,
          duplicate_user_agent: false,
          repeated_ip_count: 0,
          repeated_phone_count: 0,
          repeated_email_count: 0,
          repeated_user_agent_count: 0,
          linked_restaurants_count: 0,
          risk_flags: [],
          linked_signals: [],
        },
      },
    });
  } catch (error) {
    console.error("GET /api/platform/trust/restaurants/[restaurantId] failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
