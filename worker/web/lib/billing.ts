export const SUBSCRIPTION_PLAN_KEYS = [
  "base_monthly",
  "pro_monthly",
  "pro_plus_monthly",
] as const;
export const SERVICE_KEYS = ["website_setup", "usage_pack"] as const;
export const ADDON_KEYS = ["assisted_support", "hosting", "virtual_phone"] as const;

export type SubscriptionPlanKey = (typeof SUBSCRIPTION_PLAN_KEYS)[number];
export type ServiceKey = (typeof SERVICE_KEYS)[number];
export type AddonKey = (typeof ADDON_KEYS)[number];

type SubscriptionConfig = {
  envKey: string;
  label: string;
  priceLabel: string;
  originalPriceLabel: string;
  description: string;
};

type ServiceConfig = {
  envKey: string;
  label: string;
  priceLabel: string;
  description: string;
};

type AddOnConfig = {
  key: "assisted_support" | "hosting" | "virtual_phone";
  label: string;
  priceLabel: string;
  description: string;
  statusLabel: string;
};

type CheckoutAddOnConfig = {
  envKey: string;
  label: string;
};

const SUBSCRIPTION_CONFIG: Record<SubscriptionPlanKey, SubscriptionConfig> = {
  base_monthly: {
    envKey: "STRIPE_PRICE_BASE_MONTHLY",
    label: "Basic",
    priceLabel: "$29/month",
    originalPriceLabel: "$59/month",
    description:
      "Dedicated ordering line included. Includes 125 calls/month, 400 SMS/month, missed call to SMS link, confirmed and ready notifications, and warning at 80% usage.",
  },
  pro_monthly: {
    envKey: "STRIPE_PRICE_PRO_MONTHLY",
    label: "Pro",
    priceLabel: "$39/month",
    originalPriceLabel: "$69/month",
    description:
      "Everything in Basic plus menu image upgrades, promotions display, a better storefront experience, and the same included ordering line, calls, SMS, and usage warning.",
  },
  pro_plus_monthly: {
    envKey: "STRIPE_PRICE_PRO_PLUS_MONTHLY",
    label: "Pro Plus",
    priceLabel: "$49/month",
    originalPriceLabel: "$79/month",
    description:
      "Everything in Pro plus priority support and assisted onboarding coming soon, with founding pricing locked in for early restaurants.",
  },
};

const SERVICE_CONFIG: Record<ServiceKey, ServiceConfig> = {
  website_setup: {
    envKey: "STRIPE_PRICE_WEBSITE_SETUP",
    label: "Simple Website Setup (Menu + Checkout)",
    priceLabel: "$100 one-time",
    description:
      "We’ll set up your ordering website with your menu and checkout so you can start taking orders quickly.",
  },
  usage_pack: {
    envKey: "STRIPE_PRICE_USAGE_PACK",
    label: "Extra Usage Pack",
    priceLabel: "$10 one-time",
    description: "Includes +100 calls and +300 SMS.",
  },
};

const CHECKOUT_ADDON_CONFIG: Record<AddonKey, CheckoutAddOnConfig> = {
  assisted_support: {
    envKey: "STRIPE_PRICE_ASSISTED_SUPPORT_MONTHLY",
    label: "Assisted Support",
  },
  hosting: {
    envKey: "STRIPE_PRICE_HOSTING_MONTHLY",
    label: "Web Hosting and Maintenance",
  },
  virtual_phone: {
    envKey: "STRIPE_PRICE_VIRTUAL_PHONE_MONTHLY",
    label: "Virtual Phone & Usage",
  },
};

export const BILLING_ADD_ONS: AddOnConfig[] = [
  {
    key: "assisted_support",
    label: "Assisted Support",
    priceLabel: "$10/mo",
    description: "Hands-on support for day-to-day updates and questions.",
    statusLabel: "Coming soon",
  },
  {
    key: "hosting",
    label: "Web Hosting and Maintenance",
    priceLabel: "$20/mo",
    description: "Ongoing hosting, upkeep, and site maintenance.",
    statusLabel: "Optional add-on",
  },
  {
    key: "virtual_phone",
    label: "Virtual Phone & Usage",
    priceLabel: "$10/mo",
    description: "Includes +100 calls/month and +300 SMS/month.",
    statusLabel: "Optional add-on",
  },
];

export const SUBSCRIPTION_PLANS = SUBSCRIPTION_PLAN_KEYS.map((key) => ({
  key,
  ...SUBSCRIPTION_CONFIG[key],
}));

export const BILLING_SERVICES = SERVICE_KEYS.map((key) => ({
  key,
  ...SERVICE_CONFIG[key],
}));

export function isSubscriptionPlanKey(
  value: string
): value is SubscriptionPlanKey {
  return SUBSCRIPTION_PLAN_KEYS.includes(value as SubscriptionPlanKey);
}

export function isServiceKey(value: string): value is ServiceKey {
  return SERVICE_KEYS.includes(value as ServiceKey);
}

export function isAddonKey(value: string): value is AddonKey {
  return ADDON_KEYS.includes(value as AddonKey);
}

export function getStripeSecretKey() {
  const secretKey = String(process.env.STRIPE_SECRET_KEY || "").trim();

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return secretKey;
}

export async function stripePostForm(path: string, params: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const rawBody = await response.text();
  let parsedBody: unknown = null;

  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    parsedBody = null;
  }

  if (!response.ok) {
    const errorBody =
      typeof parsedBody === "object" && parsedBody !== null
        ? JSON.stringify(parsedBody)
        : rawBody;

    throw new Error(`Stripe API error (${response.status}): ${errorBody}`);
  }

  if (
    typeof parsedBody !== "object" ||
    parsedBody === null ||
    Array.isArray(parsedBody)
  ) {
    throw new Error("Stripe API error: invalid JSON response");
  }

  return parsedBody as Record<string, unknown>;
}

export function getSubscriptionPriceId(planKey: SubscriptionPlanKey) {
  const priceId = String(process.env[SUBSCRIPTION_CONFIG[planKey].envKey] || "").trim();

  if (!priceId) {
    throw new Error(`Missing ${SUBSCRIPTION_CONFIG[planKey].envKey}`);
  }

  return priceId;
}

export function getServicePriceId(serviceKey: ServiceKey) {
  const priceId = String(process.env[SERVICE_CONFIG[serviceKey].envKey] || "").trim();

  if (!priceId) {
    throw new Error(`Missing ${SERVICE_CONFIG[serviceKey].envKey}`);
  }

  return priceId;
}

export function getAddonPriceId(addonKey: AddonKey) {
  const priceId = String(process.env[CHECKOUT_ADDON_CONFIG[addonKey].envKey] || "").trim();

  if (!priceId) {
    throw new Error(`Missing ${CHECKOUT_ADDON_CONFIG[addonKey].envKey}`);
  }

  return priceId;
}

export function getSubscriptionLabel(planKey: string | null | undefined) {
  if (planKey === "free_internal") {
    return "Free Internal";
  }

  if (!planKey || !isSubscriptionPlanKey(planKey)) {
    return "No active plan";
  }

  return SUBSCRIPTION_CONFIG[planKey].label;
}

export function getSubscriptionPriceLabel(planKey: SubscriptionPlanKey) {
  return SUBSCRIPTION_CONFIG[planKey].priceLabel;
}

export function getSubscriptionOriginalPriceLabel(planKey: SubscriptionPlanKey) {
  return SUBSCRIPTION_CONFIG[planKey].originalPriceLabel;
}

export function getSubscriptionDescription(planKey: SubscriptionPlanKey) {
  return SUBSCRIPTION_CONFIG[planKey].description;
}

export function getServiceLabel(serviceKey: ServiceKey) {
  return SERVICE_CONFIG[serviceKey].label;
}

export function getServicePriceLabel(serviceKey: ServiceKey) {
  return SERVICE_CONFIG[serviceKey].priceLabel;
}

export function getServiceDescription(serviceKey: ServiceKey) {
  return SERVICE_CONFIG[serviceKey].description;
}

export function getAddonLabel(addonKey: string | null | undefined) {
  if (!addonKey || !isAddonKey(addonKey)) {
    return "";
  }

  return CHECKOUT_ADDON_CONFIG[addonKey].label;
}

export function getAppBaseUrl(request?: Request) {
  const requestOrigin = request ? new URL(request.url).origin : "";
  const appUrl =
    String(process.env.NEXT_PUBLIC_APP_URL || "").trim() ||
    String(process.env.NEXT_PUBLIC_SITE_URL || "").trim() ||
    String(process.env.SITE_URL || "").trim() ||
    requestOrigin ||
    "http://localhost:3000";

  return appUrl.replace(/\/+$/, "");
}

export function unixSecondsToIso(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}
