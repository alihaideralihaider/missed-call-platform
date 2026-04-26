import { NextRequest, NextResponse } from "next/server";
import { normalizeUsPhone } from "@/lib/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendPhoneVerification } from "@/lib/twilio-verify";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = normalizeUsPhone(String(body?.phone || "").trim());

    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid phone number." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: membership, error: membershipError } = await admin
      .from("restaurant_users")
      .select("id")
      .eq("phone_number", phone)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership?.id) {
      return NextResponse.json(
        { error: "No active restaurant admin account was found for that phone number." },
        { status: 404 }
      );
    }

    await sendPhoneVerification(phone);

    return NextResponse.json({
      ok: true,
      message: "Verification code sent.",
    });
  } catch (error) {
    console.error("POST /api/auth/send-otp failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send verification code.",
      },
      { status: 500 }
    );
  }
}
