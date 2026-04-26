import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminHomePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createSupabaseAdminClient();

  const { data: membership } = await admin
    .from("restaurant_users")
    .select("restaurant_id, phone_verified")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!membership?.restaurant_id) {
    redirect("/login?error=not_authorized");
  }

  if (!membership.phone_verified) {
    redirect("/verify-phone");
  }

  const { data: restaurant } = await admin
    .schema("food_ordering")
    .from("restaurants")
    .select("slug")
    .eq("id", membership.restaurant_id)
    .maybeSingle();

  if (!restaurant?.slug) {
    redirect("/login?error=not_authorized");
  }

  redirect(`/admin/restaurants/${restaurant.slug}/orders`);
}