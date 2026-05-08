import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logPlatformActivity } from "@/lib/platform/activity";
import { getCurrentPlatformAccess } from "@/lib/platform/access";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

function buildMessage(action: string): string {
  if (action === "suspend") return "Account suspended.";
  if (action === "reactivate") return "Account reactivated.";
  if (action === "close") return "Account closed.";
  return "Restaurant updated.";
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

    if (!["suspend", "reactivate", "close"].includes(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const { data: restaurant, error: restaurantError } = await admin
      .schema("food_ordering")
      .from("restaurants")
      .select("id, slug, onboarding_status, platform_review_status, is_active")
      .eq("id", restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
    }

    const nextBusinessStatus =
      action === "suspend"
        ? "suspended"
        : action === "close"
          ? "inactive"
          : "active";
    const nextRestaurantActive = action === "reactivate";
    const nextMembershipActive = action === "reactivate";
    const nextPlatformReviewStatus =
      action === "suspend"
        ? "needs_review"
        : action === "close"
          ? "closed"
          : "approved";
    const nextOnboardingStatus =
      action === "reactivate" &&
      ["closed_by_platform", "rejected_fraud"].includes(
        String(restaurant.onboarding_status || "").trim().toLowerCase()
      )
        ? "pending_owner_activation"
        : restaurant.onboarding_status;

    const { error: businessError } = await admin
      .from("businesses")
      .update({ status: nextBusinessStatus })
      .eq("restaurant_id", restaurant.id);

    if (businessError) {
      throw new Error(`Failed to update business status: ${businessError.message}`);
    }

    const { error: restaurantUpdateError } = await admin
      .schema("food_ordering")
      .from("restaurants")
      .update({
        is_active: nextRestaurantActive,
        onboarding_status: nextOnboardingStatus,
        platform_review_status: nextPlatformReviewStatus,
      })
      .eq("id", restaurant.id);

    if (restaurantUpdateError) {
      throw new Error(`Failed to update restaurant: ${restaurantUpdateError.message}`);
    }

    const membershipUpdatePayload: Record<string, unknown> = {
      is_active: nextMembershipActive,
    };

    if (action === "reactivate" && nextOnboardingStatus !== restaurant.onboarding_status) {
      membershipUpdatePayload.onboarding_status = nextOnboardingStatus;
    }

    const { error: membershipError } = await admin
      .from("restaurant_users")
      .update(membershipUpdatePayload)
      .eq("restaurant_id", restaurant.id);

    if (membershipError) {
      throw new Error(`Failed to update restaurant membership: ${membershipError.message}`);
    }

    await logPlatformActivity({
      entityType: "restaurant",
      entityId: restaurant.id,
      eventType:
        action === "suspend"
          ? "account_suspended"
          : action === "close"
            ? "account_closed"
            : "account_reactivated",
      actorUserId: access.userId,
      metadata: {
        restaurant_slug: restaurant.slug,
        previous_is_active: restaurant.is_active,
        previous_platform_review_status: restaurant.platform_review_status,
        next_platform_review_status: nextPlatformReviewStatus,
        business_status: nextBusinessStatus,
        onboarding_status: nextOnboardingStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message: buildMessage(action),
    });
  } catch (error) {
    console.error(
      "PATCH /api/platform/trust/restaurants/[restaurantId]/status failed:",
      error
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
