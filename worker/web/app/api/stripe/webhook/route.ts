import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  isAddonKey,
  unixSecondsToIso,
} from "@/lib/billing";
import {
  getStripeWebhookClient,
  getStripeWebhookSecret,
} from "@/lib/stripe-webhook";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "edge";

function asString(value: unknown) {
  const text = String(value || "").trim();
  return text || null;
}

function parseAddons(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(
      (entry): entry is "assisted_support" | "hosting" | "virtual_phone" =>
        isAddonKey(entry)
    );
}

async function findRestaurantIdFromBilling(
  customerId: string | null,
  subscriptionId: string | null
) {
  const admin = createSupabaseAdminClient();

  if (subscriptionId) {
    const { data } = await admin
      .schema("food_ordering")
      .from("restaurant_billing")
      .select("restaurant_id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();

    if (data?.restaurant_id) {
      return data.restaurant_id as string;
    }
  }

  if (customerId) {
    const { data } = await admin
      .schema("food_ordering")
      .from("restaurant_billing")
      .select("restaurant_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (data?.restaurant_id) {
      return data.restaurant_id as string;
    }
  }

  return null;
}

async function resolveRestaurantIdForEvent(
  stripe: Stripe,
  event: Stripe.Event
) {
  const object = event.data.object as {
    metadata?: Record<string, string> | null;
    customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null;
    subscription?: string | Stripe.Subscription | null;
  };

  const metadataRestaurantId = asString(object?.metadata?.restaurant_id);
  if (metadataRestaurantId) {
    return metadataRestaurantId;
  }

  const customerId =
    typeof object?.customer === "string"
      ? object.customer
      : asString(object?.customer?.id);
  const subscriptionId =
    typeof object?.subscription === "string"
      ? object.subscription
      : asString(object?.subscription?.id);

  const fromBilling = await findRestaurantIdFromBilling(customerId, subscriptionId);
  if (fromBilling) {
    return fromBilling;
  }

  if (customerId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) {
      const customerRestaurantId = asString(customer.metadata?.restaurant_id);
      if (customerRestaurantId) {
        return customerRestaurantId;
      }
    }
  }

  return null;
}

async function upsertRestaurantBilling(input: {
  restaurantId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  planKey?: string | null;
  addons?: string[];
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
}) {
  const admin = createSupabaseAdminClient();

  const payload: Record<string, unknown> = {
    restaurant_id: input.restaurantId,
    updated_at: new Date().toISOString(),
  };

  if (input.stripeCustomerId !== undefined) {
    payload.stripe_customer_id = input.stripeCustomerId;
  }

  if (input.stripeSubscriptionId !== undefined) {
    payload.stripe_subscription_id = input.stripeSubscriptionId;
  }

  if (input.planKey !== undefined) {
    payload.plan_key = input.planKey;
  }

  if (input.addons !== undefined) {
    payload.addons = input.addons;
  }

  if (input.subscriptionStatus !== undefined) {
    payload.subscription_status = input.subscriptionStatus;
  }

  if (input.currentPeriodEnd !== undefined) {
    payload.current_period_end = input.currentPeriodEnd;
  }

  const { error } = await admin
    .schema("food_ordering")
    .from("restaurant_billing")
    .upsert(payload, { onConflict: "restaurant_id" });

  if (error) {
    throw new Error(`Failed to upsert restaurant billing: ${error.message}`);
  }
}

async function upsertServicePurchase(input: {
  restaurantId: string;
  serviceKey: string;
  checkoutSessionId?: string | null;
  paymentIntentId?: string | null;
  amount?: number | null;
  status: string;
}) {
  const admin = createSupabaseAdminClient();

  const payload = {
    restaurant_id: input.restaurantId,
    service_key: input.serviceKey,
    stripe_checkout_session_id: input.checkoutSessionId || null,
    stripe_payment_intent_id: input.paymentIntentId || null,
    amount: input.amount ?? null,
    status: input.status,
    updated_at: new Date().toISOString(),
  };

  const { data: existingBySession } = input.checkoutSessionId
    ? await admin
        .schema("food_ordering")
        .from("service_purchases")
        .select("id")
        .eq("stripe_checkout_session_id", input.checkoutSessionId)
        .maybeSingle()
    : { data: null };

  const { data: existingByIntent } = !existingBySession?.id && input.paymentIntentId
    ? await admin
        .schema("food_ordering")
        .from("service_purchases")
        .select("id")
        .eq("stripe_payment_intent_id", input.paymentIntentId)
        .maybeSingle()
    : { data: null };

  if (existingBySession?.id || existingByIntent?.id) {
    const targetId = existingBySession?.id || existingByIntent?.id;
    const { error } = await admin
      .schema("food_ordering")
      .from("service_purchases")
      .update(payload)
      .eq("id", targetId);

    if (error) {
      throw new Error(`Failed to update service purchase: ${error.message}`);
    }

    return;
  }

  const { error } = await admin
    .schema("food_ordering")
    .from("service_purchases")
    .insert(payload);

  if (error) {
    throw new Error(`Failed to insert service purchase: ${error.message}`);
  }
}

async function logBillingEvent(input: {
  event: Stripe.Event;
  restaurantId: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .schema("food_ordering")
    .from("billing_events")
    .insert({
      restaurant_id: input.restaurantId,
      stripe_event_id: input.event.id,
      event_type: input.event.type,
      payload: input.event as unknown as Record<string, unknown>,
    });

  if (error) {
    throw new Error(`Failed to log billing event: ${error.message}`);
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const logStep = (message: string, extra?: Record<string, unknown>) => {
    console.log("STRIPE WEBHOOK:", message, {
      elapsed_ms: Date.now() - startedAt,
      ...(extra || {}),
    });
  };

  logStep("request received");
  logStep("constructing stripe client");
  const stripe = getStripeWebhookClient();
  logStep("stripe client ready");
  const webhookSecret = getStripeWebhookSecret();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    logStep("verifying signature");
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    logStep("signature verified", {
      event_type: event.type,
      event_id: event.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid signature.",
      },
      { status: 400 }
    );
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data: existingEvent } = await admin
      .schema("food_ordering")
      .from("billing_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existingEvent?.id) {
      logStep("duplicate event ignored", {
        event_id: event.id,
      });
      return NextResponse.json({ received: true, duplicate: true });
    }

    const restaurantId = await resolveRestaurantIdForEvent(stripe, event);
    logStep("restaurant resolved", {
      event_id: event.id,
      event_type: event.type,
      restaurant_id: restaurantId,
    });

    switch (event.type) {
      case "checkout.session.completed": {
        logStep("handling checkout.session.completed", {
          event_id: event.id,
        });
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = asString(session.customer);
        const subscriptionId = asString(session.subscription);
        const checkoutType = asString(session.metadata?.checkout_type);

        if (restaurantId && checkoutType === "subscription") {
          let subscriptionStatus: string | null = "active";
          let currentPeriodEnd: string | null = null;

          if (subscriptionId) {
            const subscription = (await stripe.subscriptions.retrieve(
              subscriptionId
            )) as Stripe.Subscription;
            subscriptionStatus = subscription.status;
            currentPeriodEnd = unixSecondsToIso(
              (subscription as { current_period_end?: number | null })
                .current_period_end
            );
          }

          await upsertRestaurantBilling({
            restaurantId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            planKey: asString(session.metadata?.plan_key),
            addons: parseAddons(asString(session.metadata?.addons)),
            subscriptionStatus,
            currentPeriodEnd,
          });
        }

        if (restaurantId && checkoutType === "service") {
          const serviceKey = asString(session.metadata?.service_key);

          if (serviceKey) {
            await upsertServicePurchase({
              restaurantId,
              serviceKey,
              checkoutSessionId: session.id,
              paymentIntentId: asString(session.payment_intent),
              amount:
                typeof session.amount_total === "number"
                  ? session.amount_total / 100
                  : null,
              status: "completed",
            });
          }
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        logStep("handling subscription event", {
          event_id: event.id,
          event_type: event.type,
        });
        const subscription = event.data.object as Stripe.Subscription;

        if (restaurantId) {
          await upsertRestaurantBilling({
            restaurantId,
            stripeCustomerId: asString(subscription.customer),
            stripeSubscriptionId: subscription.id,
            planKey: asString(subscription.metadata?.plan_key),
            addons: parseAddons(asString(subscription.metadata?.addons)),
            subscriptionStatus: subscription.status,
            currentPeriodEnd: unixSecondsToIso(
              (subscription as { current_period_end?: number | null })
                .current_period_end
            ),
          });
        }

        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        logStep("handling invoice event", {
          event_id: event.id,
          event_type: event.type,
        });
        const invoice = event.data.object as Stripe.Invoice;

        if (restaurantId) {
          await upsertRestaurantBilling({
            restaurantId,
            stripeCustomerId: asString(invoice.customer),
            stripeSubscriptionId: asString(
              (invoice as { subscription?: string | null }).subscription
            ),
            subscriptionStatus:
              event.type === "invoice.payment_failed" ? "past_due" : "active",
          });
        }

        break;
      }

      case "payment_intent.succeeded": {
        logStep("handling payment_intent.succeeded", {
          event_id: event.id,
        });
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const serviceKey = asString(paymentIntent.metadata?.service_key);

        if (restaurantId && serviceKey) {
          await upsertServicePurchase({
            restaurantId,
            serviceKey,
            checkoutSessionId: null,
            paymentIntentId: paymentIntent.id,
            amount:
              typeof paymentIntent.amount === "number"
                ? paymentIntent.amount / 100
                : null,
            status: "completed",
          });
        }

        break;
      }

      default:
        break;
    }

    await logBillingEvent({
      event,
      restaurantId,
    });
    logStep("billing event logged", {
      event_id: event.id,
    });

    logStep("returning response", {
      event_id: event.id,
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("POST /api/stripe/webhook failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
