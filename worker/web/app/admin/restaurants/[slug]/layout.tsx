import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import GrowthBanner from "@/components/admin/GrowthBanner";
import RestaurantAdminNav from "@/components/admin/RestaurantAdminNav";

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

function cleanSlug(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  return s && s !== "undefined" && s !== "null" ? s : "";
}

export default async function RestaurantAdminLayout({
  children,
  params,
}: Props) {
  const { slug } = await params;
  const clean = cleanSlug(slug);

  console.log("RESTAURANT LAYOUT SLUG:", clean);

  if (!clean) {
    redirect("/login?error=not_authorized");
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("RESTAURANT LAYOUT USER:", user?.id || null);
  console.log("RESTAURANT LAYOUT USER ERROR:", userError?.message || null);

  if (!user) {
    redirect("/login");
  }

  const admin = createSupabaseAdminClient();

  const { data: restaurant, error: restaurantError } = await admin
    .schema("food_ordering")
    .from("restaurants")
    .select("id, slug, profile_completed")
    .eq("slug", clean)
    .maybeSingle();

  console.log("RESTAURANT RECORD:", restaurant);
  console.log("RESTAURANT ERROR:", restaurantError?.message || null);

  if (!restaurant?.id) {
    redirect("/login?error=not_authorized");
  }

  const { data: membership, error: membershipError } = await admin
    .from("restaurant_users")
    .select("id, phone_verified")
    .eq("restaurant_id", restaurant.id)
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  console.log("MEMBERSHIP:", membership);
  console.log("MEMBERSHIP ERROR:", membershipError?.message || null);

  if (!membership?.id) {
    redirect("/login?error=not_authorized");
  }

  if (!membership.phone_verified) {
    redirect("/verify-phone");
  }

  return (
    <>
      <GrowthBanner slug={clean} />

      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <RestaurantAdminNav slug={clean} />
        </div>
      </div>

      {children}
    </>
  );
}
