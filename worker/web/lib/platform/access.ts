import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PlatformAccess = {
  userId: string;
  email: string;
  role: string;
  source: "table" | "bootstrap_env";
};

function getBootstrapEmails(): string[] {
  return String(process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export async function getPlatformAccessForUserId(
  userId: string,
  emailInput?: string | null
): Promise<PlatformAccess | null> {
  const email = String(emailInput || "").trim().toLowerCase();
  const bootstrapEmails = getBootstrapEmails();

  if (email && bootstrapEmails.includes(email)) {
    return {
      userId,
      email,
      role: "platform_owner",
      source: "bootstrap_env",
    };
  }

  const admin = createSupabaseAdminClient();
  const { data: platformUser, error } = await admin
    .from("platform_users")
    .select("auth_user_id, role")
    .eq("auth_user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !platformUser) {
    return null;
  }

  return {
    userId,
    email,
    role: String(platformUser.role || "platform_admin"),
    source: "table",
  };
}

export async function getCurrentPlatformAccess(): Promise<PlatformAccess | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return null;
  }

  return getPlatformAccessForUserId(user.id, user.email || "");
}
