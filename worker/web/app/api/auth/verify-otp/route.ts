import { NextRequest, NextResponse } from "next/server";
import { normalizeUsPhone } from "@/lib/phone";
import { getAppBaseUrl } from "@/lib/app-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkPhoneVerification } from "@/lib/twilio-verify";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = normalizeUsPhone(String(body?.phone || "").trim());
    const code = String(body?.code || "").trim();

    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid phone number." },
        { status: 400 }
      );
    }

    if (!/^\d{4,10}$/.test(code)) {
      return NextResponse.json(
        { error: "Enter a valid verification code." },
        { status: 400 }
      );
    }

    const verifyResult = await checkPhoneVerification(phone, code);

    if (verifyResult.status !== "approved") {
      return NextResponse.json(
        { error: "Invalid or expired code." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: membership, error: membershipError } = await admin
      .from("restaurant_users")
      .select("auth_user_id, restaurant_id")
      .eq("phone_number", phone)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership?.auth_user_id) {
      return NextResponse.json(
        { error: "No active restaurant admin account was found for that phone number." },
        { status: 404 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await admin.auth.admin.getUserById(membership.auth_user_id);

    if (userError || !user?.email) {
      return NextResponse.json(
        { error: "This account is missing a valid email login record." },
        { status: 403 }
      );
    }

    const redirectTo = `${getAppBaseUrl(req)}/auth/callback`;
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email: user.email,
        options: {
          redirectTo,
          data: {
            restaurant_id: membership.restaurant_id,
          },
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      throw new Error(
        `Failed to generate login link: ${
          linkError?.message ?? "missing action link"
        }`
      );
    }

    return NextResponse.json({
      ok: true,
      redirectTo: linkData.properties.action_link,
    });
  } catch (error) {
    console.error("POST /api/auth/verify-otp failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to verify code.",
      },
      { status: 500 }
    );
  }
}
