import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

console.log("SERVICE CHECKOUT MODULE LOADED");

export async function POST(req: NextRequest) {
  console.log("SERVICE CHECKOUT POST ENTERED");
  const startedAt = Date.now();
  const logStep = (message: string, extra?: Record<string, unknown>) => {
    console.log("SERVICE CHECKOUT:", message, {
      elapsed_ms: Date.now() - startedAt,
      ...(extra || {}),
    });
  };

  try {
    logStep("request received");
    logStep("loading route dependencies");
    const [
      { getRestaurantAdminAccessBySlug },
      { getAppBaseUrl, getServicePriceId, isServiceKey, stripePostForm },
      { createSupabaseAdminClient },
    ] = await Promise.all([
      import("@/lib/admin/restaurant-access"),
      import("@/lib/billing"),
      import("@/lib/supabase/admin"),
    ]);
    logStep("route dependencies loaded");

    const body = await req.json();
    const restaurantSlug = String(body?.restaurantSlug || "").trim().toLowerCase();
    const serviceKey = String(body?.serviceKey || "").trim().toLowerCase();

    if (!restaurantSlug || !isServiceKey(serviceKey)) {
      return NextResponse.json(
        { error: "restaurantSlug and a valid serviceKey are required." },
        { status: 400 }
      );
    }

    logStep("looking up access", {
      restaurant_slug: restaurantSlug,
      service_key: serviceKey,
    });
    const access = await getRestaurantAdminAccessBySlug(restaurantSlug);
    logStep("access lookup complete", {
      authorized: Boolean(access),
    });

    if (!access) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();

    const { data: existingBilling } = await admin
      .schema("food_ordering")
      .from("restaurant_billing")
      .select("id, stripe_customer_id")
      .eq("restaurant_id", access.restaurant.id)
      .maybeSingle();

    let stripeCustomerId = String(existingBilling?.stripe_customer_id || "").trim();

    if (!stripeCustomerId) {
      logStep("creating stripe customer", {
        restaurant_id: access.restaurant.id,
      });
      const customerParams = new URLSearchParams();

      if (access.email) {
        customerParams.set("email", access.email);
      }

      customerParams.set("name", access.restaurant.name || access.restaurant.slug);
      customerParams.set("metadata[restaurant_id]", access.restaurant.id);
      customerParams.set("metadata[restaurant_slug]", access.restaurant.slug);

      const customer = await stripePostForm("customers", customerParams);

      stripeCustomerId = String(customer.id || "").trim();
      logStep("stripe customer created", {
        stripe_customer_id: stripeCustomerId,
      });

      await admin
        .schema("food_ordering")
        .from("restaurant_billing")
        .upsert(
          {
            restaurant_id: access.restaurant.id,
            stripe_customer_id: stripeCustomerId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "restaurant_id" }
        );
    } else {
      logStep("reusing stripe customer", {
        stripe_customer_id: stripeCustomerId,
      });
    }

    logStep("resolving service price", {
      service_key: serviceKey,
    });
    const servicePriceId = getServicePriceId(serviceKey);
    logStep("service price resolved", {
      service_key: serviceKey,
      price_id: servicePriceId,
    });

    const metadata = {
      restaurant_id: access.restaurant.id,
      restaurant_slug: access.restaurant.slug,
      checkout_type: "service",
      service_key: serviceKey,
    };

    logStep("creating stripe checkout session");
    const sessionParams = new URLSearchParams();
    sessionParams.set("mode", "payment");
    sessionParams.set("customer", stripeCustomerId);
    sessionParams.set("line_items[0][price]", servicePriceId);
    sessionParams.set("line_items[0][quantity]", "1");
    sessionParams.set(
      "success_url",
      `${getAppBaseUrl(req)}/admin/restaurants/${access.restaurant.slug}/billing?checkout=success`
    );
    sessionParams.set(
      "cancel_url",
      `${getAppBaseUrl(req)}/admin/restaurants/${access.restaurant.slug}/billing?checkout=cancelled`
    );
    sessionParams.set("metadata[restaurant_id]", metadata.restaurant_id);
    sessionParams.set("metadata[restaurant_slug]", metadata.restaurant_slug);
    sessionParams.set("metadata[checkout_type]", metadata.checkout_type);
    sessionParams.set("metadata[service_key]", metadata.service_key);
    sessionParams.set(
      "payment_intent_data[metadata][restaurant_id]",
      metadata.restaurant_id
    );
    sessionParams.set(
      "payment_intent_data[metadata][restaurant_slug]",
      metadata.restaurant_slug
    );
    sessionParams.set(
      "payment_intent_data[metadata][checkout_type]",
      metadata.checkout_type
    );
    sessionParams.set(
      "payment_intent_data[metadata][service_key]",
      metadata.service_key
    );

    const session = await stripePostForm("checkout/sessions", sessionParams);
    logStep("stripe checkout session created", {
      session_id: session.id,
    });
    logStep("stripe api response received", {
      has_url: Boolean(session.url),
    });

    logStep("returning response", {
      has_url: Boolean(session.url),
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("POST /api/billing/create-service-checkout failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
