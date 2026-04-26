import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RestaurantAdminAccess = {
  userId: string;
  email: string;
  restaurant: {
    id: string;
    slug: string;
    name: string | null;
  };
};

function cleanSlug(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  return s && s !== "undefined" && s !== "null" ? s : "";
}

export async function getRestaurantAdminAccessBySlug(
  slugInput: unknown
): Promise<RestaurantAdminAccess | null> {
  const slug = cleanSlug(slugInput);

  if (!slug) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return null;
  }

  const admin = createSupabaseAdminClient();

  const { data: restaurant } = await admin
    .schema("food_ordering")
    .from("restaurants")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!restaurant?.id) {
    return null;
  }

  const { data: membership } = await admin
    .from("restaurant_users")
    .select("id, phone_verified")
    .eq("restaurant_id", restaurant.id)
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!membership?.id || !membership.phone_verified) {
    return null;
  }

  return {
    userId: user.id,
    email: String(user.email || "").trim().toLowerCase(),
    restaurant: {
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name || null,
    },
  };
}
