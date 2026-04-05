export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkPhoneVerification } from "@/lib/twilio-verify";

async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
            cookiesToSet: { name: string; value: string; options: CookieOptions }[]
            ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignored in route contexts where set is not available
          }
        },
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const code = String(body.code || "").trim();

    if (!/^\d{4,10}$/.test(code)) {
      return NextResponse.json(
        { error: "Enter a valid verification code." },
        { status: 400 }
      );
    }

    const admin = await createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {},
        },
      }
    );

    const { data: membership, error: membershipError } = await admin
      .from("restaurant_users")
      .select("id, restaurant_id, phone_number")
      .eq("auth_user_id", user.id)
      .single();

    if (membershipError || !membership || !membership.phone_number) {
      return NextResponse.json(
        { error: "Phone verification session not found." },
        { status: 403 }
      );
    }

    const result = await checkPhoneVerification(membership.phone_number, code);

    if (result.status !== "approved") {
      return NextResponse.json(
        { error: "Invalid or expired code." },
        { status: 400 }
      );
    }

    const { error: updateError } = await admin
      .from("restaurant_users")
      .update({
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
        onboarding_status: "active",
      })
      .eq("id", membership.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to activate account." },
        { status: 500 }
      );
    }

    const { data: restaurantUser, error: slugError } = await admin
      .schema("food_ordering")
      .from("restaurants")
      .select("slug, profile_completed")
      .eq("id", membership.restaurant_id)
      .single();

    if (slugError || !restaurantUser?.slug) {
      return NextResponse.json(
        { ok: true, redirectTo: "/admin" },
        { status: 200 }
      );
    }

    const slug = restaurantUser.slug;
    const profileCompleted = Boolean(restaurantUser.profile_completed);

    return NextResponse.json({
      ok: true,
      redirectTo: profileCompleted
        ? `/admin/restaurants/${slug}/orders`
        : `/admin/restaurants/${slug}/setup`,
    });
  } catch (error) {
    console.error("verify-phone/check error", error);
    return NextResponse.json(
      { error: "Failed to verify code." },
      { status: 500 }
    );
  }
}