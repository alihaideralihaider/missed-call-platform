export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendPhoneVerification } from "@/lib/twilio-verify";
import { normalizeUsPhone } from "@/lib/phone";

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
    const rawPhone = String(body.phone || "").trim();
    const phone = normalizeUsPhone(rawPhone);

    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid phone number." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: membership, error: membershipError } = await admin
      .from("restaurant_users")
      .select("id, phone_verified")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "Restaurant access record not found." },
        { status: 403 }
      );
    }

    // 🔥 Send OTP via Twilio
    await sendPhoneVerification(phone);

    // 🔥 Store phone + move to verification stage
    const { error: updateError } = await admin
      .from("restaurant_users")
      .update({
        phone_number: phone,
        onboarding_status: "pending_phone_verification",
      })
      .eq("id", membership.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save phone number." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Verification code sent.",
    });
  } catch (error) {
    console.error("verify-phone/send error", error);

    return NextResponse.json(
      { error: "Failed to send verification code." },
      { status: 500 }
    );
  }
}