import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logPlatformActivity } from "@/lib/platform/activity";
import { getCurrentPlatformAccess } from "@/lib/platform/access";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

function buildActionResponseMessage(action: string): string {
  if (action === "approve") return "Onboarding approved for platform review.";
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

    if (
      !["approve", "close", "reject_fraud", "reactivate", "block_ip"].includes(
        action
      )
    ) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const { data: restaurant, error: restaurantError } = await admin
      .schema("food_ordering")
      .from("restaurants")
      .select(
        "id, slug, onboarding_status, platform_review_status, onboarding_source_ip, is_active"
      )
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

    const previousPlatformReviewStatus = String(
      restaurant.platform_review_status || "unreviewed"
    ).trim() || "unreviewed";
    const nextPlatformReviewStatus =
      action === "approve"
        ? "approved"
        : action === "close"
        ? "closed"
        : action === "reject_fraud"
        ? "rejected_fraud"
        : "needs_review";

    const restaurantUpdatePayload: Record<string, unknown> = {
      platform_review_status: nextPlatformReviewStatus,
    };

    if (["approve", "close", "reject_fraud"].includes(action)) {
      restaurantUpdatePayload.onboarding_reviewed_at = new Date().toISOString();
    }

    if (action === "reject_fraud") {
      restaurantUpdatePayload.is_active = false;
      restaurantUpdatePayload.onboarding_status = "rejected_fraud";
    } else if (
      action === "reactivate" &&
      ["closed_by_platform", "rejected_fraud"].includes(
        String(restaurant.onboarding_status || "").trim().toLowerCase()
      )
    ) {
      restaurantUpdatePayload.onboarding_status = "pending_owner_activation";
      restaurantUpdatePayload.is_active = true;
    }

    const { error: restaurantUpdateError } = await admin
      .schema("food_ordering")
      .from("restaurants")
      .update(restaurantUpdatePayload)
      .eq("id", restaurant.id);

    if (restaurantUpdateError) {
      throw new Error(`Failed to update restaurant: ${restaurantUpdateError.message}`);
    }

    const membershipUpdatePayload: Record<string, unknown> = {};

    if (action === "reject_fraud") {
      membershipUpdatePayload.is_active = false;
      membershipUpdatePayload.onboarding_status = "rejected_fraud";
    } else if (action === "reactivate") {
      membershipUpdatePayload.is_active = true;

      if (
        ["closed_by_platform", "rejected_fraud"].includes(
          String(restaurant.onboarding_status || "").trim().toLowerCase()
        )
      ) {
        membershipUpdatePayload.onboarding_status = "pending_owner_activation";
      }
    }

    const { error: membershipUpdateError } = Object.keys(membershipUpdatePayload)
      .length
      ? await admin
          .from("restaurant_users")
          .update(membershipUpdatePayload)
          .eq("restaurant_id", restaurant.id)
      : { error: null };

    if (membershipUpdateError) {
      throw new Error(`Failed to update membership: ${membershipUpdateError.message}`);
    }

    const businessUpdatePayload: Record<string, unknown> = {};

    if (action === "reject_fraud") {
      businessUpdatePayload.status = "suspended";
    } else if (action === "reactivate") {
      businessUpdatePayload.status = "active";
    }

    const { error: businessUpdateError } = Object.keys(businessUpdatePayload).length
      ? await admin
          .from("businesses")
          .update(businessUpdatePayload)
          .eq("restaurant_id", restaurant.id)
      : { error: null };

    if (businessUpdateError) {
      throw new Error(`Failed to update business: ${businessUpdateError.message}`);
    }

    await logPlatformActivity({
      entityType: "restaurant",
      entityId: restaurant.id,
      eventType:
        action === "approve"
          ? "platform_review_approved"
          : action === "close"
          ? "platform_review_closed"
          : action === "reject_fraud"
          ? "platform_review_rejected_fraud"
          : `onboarding_${action}`,
      actorUserId: access.userId,
      metadata: {
        restaurant_slug: restaurant.slug,
        previous_platform_review_status: previousPlatformReviewStatus,
        next_platform_review_status: nextPlatformReviewStatus,
        previous_onboarding_status: restaurant.onboarding_status,
        current_onboarding_status:
          action === "reject_fraud"
            ? "rejected_fraud"
            : action === "reactivate" &&
              ["closed_by_platform", "rejected_fraud"].includes(
                String(restaurant.onboarding_status || "").trim().toLowerCase()
              )
            ? "pending_owner_activation"
            : restaurant.onboarding_status,
        previous_is_active: restaurant.is_active,
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
