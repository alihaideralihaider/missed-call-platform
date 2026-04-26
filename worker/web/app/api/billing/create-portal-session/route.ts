import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const logStep = (message: string, extra?: Record<string, unknown>) => {
    console.log("BILLING PORTAL:", message, {
      elapsed_ms: Date.now() - startedAt,
      ...(extra || {}),
    });
  };

  try {
    logStep("request received");
    logStep("loading route dependencies");
    const [
      { getRestaurantAdminAccessBySlug },
      { getAppBaseUrl, stripePostForm },
      { createSupabaseAdminClient },
    ] = await Promise.all([
      import("@/lib/admin/restaurant-access"),
      import("@/lib/billing"),
      import("@/lib/supabase/admin"),
    ]);
    logStep("route dependencies loaded");

    const body = await req.json();
    const restaurantSlug = String(body?.restaurantSlug || "").trim().toLowerCase();

    if (!restaurantSlug) {
      return NextResponse.json(
        { error: "restaurantSlug is required." },
        { status: 400 }
      );
    }

    logStep("looking up access", {
      restaurant_slug: restaurantSlug,
    });
    const access = await getRestaurantAdminAccessBySlug(restaurantSlug);
    logStep("access lookup complete", {
      authorized: Boolean(access),
    });

    if (!access) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const { data: billing } = await admin
      .schema("food_ordering")
      .from("restaurant_billing")
      .select("stripe_customer_id")
      .eq("restaurant_id", access.restaurant.id)
      .maybeSingle();

    const stripeCustomerId = String(billing?.stripe_customer_id || "").trim();
    logStep("customer lookup complete", {
      has_customer: Boolean(stripeCustomerId),
    });

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing customer found for this restaurant." },
        { status: 400 }
      );
    }

    logStep("creating billing portal session", {
      stripe_customer_id: stripeCustomerId,
    });
    const sessionParams = new URLSearchParams();
    sessionParams.set("customer", stripeCustomerId);
    sessionParams.set(
      "return_url",
      `${getAppBaseUrl(req)}/admin/restaurants/${access.restaurant.slug}/billing`
    );

    const session = await stripePostForm("billing_portal/sessions", sessionParams);
    logStep("billing portal session created", {
      session_url_present: Boolean(session.url),
    });
    logStep("stripe api response received", {
      has_url: Boolean(session.url),
    });

    logStep("returning response");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("POST /api/billing/create-portal-session failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
