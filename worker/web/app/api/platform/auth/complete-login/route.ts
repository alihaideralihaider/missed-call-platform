import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPlatformAccessForUserId } from "@/lib/platform/access";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = String(body?.userId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!userId) {
      return NextResponse.json({ error: "missing_user_id" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(
      userId
    );

    const resolvedEmail =
      email || String(userData?.user?.email || "").trim().toLowerCase();

    if (userError && !resolvedEmail) {
      return NextResponse.json({ error: "auth_failed" }, { status: 500 });
    }

    const access = await getPlatformAccessForUserId(userId, resolvedEmail);

    if (!access) {
      return NextResponse.json({ error: "not_authorized" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      role: access.role,
    });
  } catch (error) {
    console.error("POST /api/platform/auth/complete-login failed:", error);

    return NextResponse.json(
      {
        error: "auth_failed",
      },
      { status: 500 }
    );
  }
}
