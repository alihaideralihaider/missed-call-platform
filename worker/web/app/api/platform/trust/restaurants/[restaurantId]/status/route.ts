import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logPlatformActivity } from "@/lib/platform/activity";
import { getCurrentPlatformAccess } from "@/lib/platform/access";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

function buildMessage(action: string): string {
  if (action === "suspend") return "Restaurant suspended.";
  if (action === "reactivate") return "Restaurant reactivated.";
  if (action === "close") return "Restaurant closed.";
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
      .select("id, slug, onboarding_status")
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
    const nextOnboardingStatus =
      action === "close" ? "closed_by_platform" : restaurant.onboarding_status;

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
      })
      .eq("id", restaurant.id);

    if (restaurantUpdateError) {
      throw new Error(`Failed to update restaurant: ${restaurantUpdateError.message}`);
    }

    const membershipUpdatePayload: Record<string, unknown> = {
      is_active: nextMembershipActive,
    };

    if (action === "close") {
      membershipUpdatePayload.onboarding_status = "closed_by_platform";
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
      eventType: `restaurant_${action}`,
      actorUserId: access.userId,
      metadata: {
        restaurant_slug: restaurant.slug,
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
