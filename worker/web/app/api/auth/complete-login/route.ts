import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPlatformAccessForUserId } from "@/lib/platform/access";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = (body.userId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();

    if (!userId) {
      return NextResponse.json(
        { error: "missing_user_id" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: membership, error: membershipError } = await admin
      .from("restaurant_users")
      .select("restaurant_id, role, is_active, phone_verified")
      .eq("auth_user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership?.restaurant_id) {
      const platformAccess = await getPlatformAccessForUserId(userId, email);

      console.error("Membership lookup failed:", membershipError);
      return NextResponse.json(
        { error: platformAccess ? "platform_only" : "not_authorized" },
        { status: 403 }
      );
    }

    const { data: restaurant, error: restaurantError } = await admin
      .schema("food_ordering")
      .from("restaurants")
      .select("id, slug, onboarding_status")
      .eq("id", membership.restaurant_id)
      .maybeSingle();

    if (restaurantError || !restaurant?.slug) {
      console.error("Restaurant lookup failed:", restaurantError);
      return NextResponse.json(
        { error: "not_authorized" },
        { status: 403 }
      );
    }

    if (
      restaurant.onboarding_status === "closed_by_platform" ||
      restaurant.onboarding_status === "rejected_fraud"
    ) {
      return NextResponse.json(
        { error: "not_authorized" },
        { status: 403 }
      );
    }

    if (restaurant.onboarding_status !== "active") {
      const { error: activateError } = await admin
        .schema("food_ordering")
        .from("restaurants")
        .update({
          onboarding_status: "active",
        })
        .eq("id", membership.restaurant_id);

      if (activateError) {
        console.error("Failed to activate restaurant:", activateError);
        return NextResponse.json(
          { error: "activation_failed" },
          { status: 500 }
        );
      }
    }

    // const { error: activityLogError } = await admin
    //   .from("activity_logs")
    //   .insert({
    //     restaurant_id: membership.restaurant_id,
    //     auth_user_id: userId,
    //     action: "login_success",
    //     metadata: {
    //       via: "magic_link",
    //       role: membership.role,
    //     },
    //   });

    // if (activityLogError) {
    //   console.error("Failed to write activity log:", activityLogError);
    // }

    return NextResponse.json({
      success: true,
      slug: restaurant.slug,
      redirectTo: membership.phone_verified ? "/admin" : "/verify-phone",
    });
  } catch (error) {
    console.error("POST /api/auth/complete-login failed:", error);

    return NextResponse.json(
      {
        error: "auth_failed",
      },
      { status: 500 }
    );
  }
}
