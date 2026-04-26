import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logPlatformActivity } from "@/lib/platform/activity";
import { getCurrentPlatformAccess } from "@/lib/platform/access";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

function buildActionResponseMessage(action: string): string {
  if (action === "close") return "Onboarding closed.";
  if (action === "reject_fraud") return "Onboarding rejected as fraud.";
  if (action === "reactivate") return "Onboarding reactivated.";
  if (action === "block_ip") return "Onboarding IP added to blocklist.";
  return "Onboarding updated.";
}

export async function PATCH(req: Request, context: RouteContext) {
  const access = await getCurrentPlatformAccess();

  if (!access) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  try {
    const { restaurantId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim().toLowerCase();

    if (!["close", "reject_fraud", "reactivate", "block_ip"].includes(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const { data: restaurant, error: restaurantError } = await admin
      .schema("food_ordering")
      .from("restaurants")
      .select("id, slug, onboarding_status, onboarding_source_ip")
      .eq("id", restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
    }

    if (action === "block_ip") {
      const ip = String(restaurant.onboarding_source_ip || "").trim();

      if (!ip) {
        return NextResponse.json(
          { error: "No onboarding IP found for this restaurant." },
          { status: 400 }
        );
      }

      const { error: watchlistError } = await admin
        .from("platform_ip_watchlist")
        .upsert(
          {
            ip_address: ip,
            status: "blocked",
            reason: "Manual onboarding fraud block",
            created_by: access.userId,
          },
          { onConflict: "ip_address" }
        );

      if (watchlistError) {
        throw new Error(`Failed to block IP: ${watchlistError.message}`);
      }

      await logPlatformActivity({
        entityType: "restaurant",
        entityId: restaurant.id,
        eventType: "blocked_onboarding_ip",
        actorUserId: access.userId,
        metadata: {
          restaurant_slug: restaurant.slug,
          onboarding_source_ip: ip,
        },
      });

      return NextResponse.json({
        success: true,
        message: buildActionResponseMessage(action),
      });
    }

    const nextOnboardingStatus =
      action === "close"
        ? "closed_by_platform"
        : action === "reject_fraud"
        ? "rejected_fraud"
        : "pending_owner_activation";
    const nextRestaurantActive = action === "reactivate";
    const nextBusinessStatus =
      action === "close"
        ? "inactive"
        : action === "reject_fraud"
        ? "suspended"
        : "active";
    const nextMembershipActive = action === "reactivate";

    const { error: restaurantUpdateError } = await admin
      .schema("food_ordering")
      .from("restaurants")
      .update({
        onboarding_status: nextOnboardingStatus,
        is_active: nextRestaurantActive,
      })
      .eq("id", restaurant.id);

    if (restaurantUpdateError) {
      throw new Error(`Failed to update restaurant: ${restaurantUpdateError.message}`);
    }

    const { error: membershipUpdateError } = await admin
      .from("restaurant_users")
      .update({
        is_active: nextMembershipActive,
        onboarding_status: nextOnboardingStatus,
      })
      .eq("restaurant_id", restaurant.id);

    if (membershipUpdateError) {
      throw new Error(`Failed to update membership: ${membershipUpdateError.message}`);
    }

    const { error: businessUpdateError } = await admin
      .from("businesses")
      .update({
        status: nextBusinessStatus,
      })
      .eq("restaurant_id", restaurant.id);

    if (businessUpdateError) {
      throw new Error(`Failed to update business: ${businessUpdateError.message}`);
    }

    await logPlatformActivity({
      entityType: "restaurant",
      entityId: restaurant.id,
      eventType: `onboarding_${action}`,
      actorUserId: access.userId,
      metadata: {
        restaurant_slug: restaurant.slug,
        previous_onboarding_status: restaurant.onboarding_status,
        next_onboarding_status: nextOnboardingStatus,
        business_status: nextBusinessStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message: buildActionResponseMessage(action),
    });
  } catch (error) {
    console.error("PATCH /api/platform/trust/onboarding/[restaurantId] failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
