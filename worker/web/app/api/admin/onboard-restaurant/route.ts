import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getAppBaseUrl } from "@/lib/app-url";

const resend = new Resend(process.env.RESEND_API_KEY);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getRequestIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const firstForwarded = forwardedFor.split(",")[0]?.trim();

  return (
    firstForwarded ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    ""
  ).trim();
}

function isMissingColumnError(message: string, column: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("schema cache") && normalized.includes(column);
}

async function findAuthUserByEmail(
  supabase: SupabaseClient,
  email: string
) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const users = data?.users ?? [];
    const match = users.find(
      (user) => (user.email || "").trim().toLowerCase() === email
    );

    if (match) {
      return match;
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

async function generateUniqueSlug(
  supabase: SupabaseClient,
  baseSlug: string
): Promise<string> {
  const normalizedBase = slugify(baseSlug) || "restaurant";

  let candidate = normalizedBase;
  let counter = 2;

  while (true) {
    const { data, error } = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(`Restaurant lookup failed: ${error.message}`);
    }

    if (!data) {
      return candidate;
    }

    candidate = `${normalizedBase}-${counter}`;
    counter += 1;
  }
}

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await req.json();
    const sourceIp = getRequestIp(req);
    const userAgent = (req.headers.get("user-agent") || "").trim();

    const name = (body.name || "").trim();
    let slug = (body.slug || "").trim().toLowerCase();
    const contactName = (body.contactName || "").trim();
    const contactPhone = (body.contactPhone || "").trim();
    const contactEmail = (body.contactEmail || "").trim().toLowerCase();
    const partnerId = (body.partnerId || "").trim();

    const salesTaxRateRaw = body.salesTaxRate;
    const taxMode = (body.taxMode || "exclusive").trim();
    const taxLabel = (body.taxLabel || "Sales Tax").trim();

    let salesTaxRate = Number(salesTaxRateRaw);

    if (!Number.isFinite(salesTaxRate)) {
      salesTaxRate = 0;
    }

    // normalize percent vs decimal
    if (salesTaxRate > 1) {
      salesTaxRate = salesTaxRate / 100;
    }

    if (!name) {
      return NextResponse.json(
        { error: "Restaurant name is required" },
        { status: 400 }
      );
    }

    if (!contactEmail) {
      return NextResponse.json(
        { error: "Contact email is required for owner login setup" },
        { status: 400 }
      );
    }

    if (!slug) {
      slug = slugify(name);
    }

    if (sourceIp) {
      const { data: blockedIp, error: blockedIpError } = await supabase
        .from("platform_ip_watchlist")
        .select("id")
        .eq("ip_address", sourceIp)
        .eq("status", "blocked")
        .maybeSingle();

      if (blockedIpError) {
        console.warn("Optional IP watchlist lookup failed during onboarding:", {
          ip: sourceIp,
          message: blockedIpError.message,
        });
      } else if (blockedIp?.id) {
        return NextResponse.json(
          { error: "This onboarding request has been blocked." },
          { status: 403 }
        );
      }
    }

    slug = await generateUniqueSlug(supabase, slug);

    // Verify partner exists and is active only when partnerId is provided
    let partner: {
      id: string;
      name: string;
      status: string;
      office_id: string | null;
    } | null = null;

    if (partnerId) {
      const { data: partnerData, error: partnerError } = await supabase
        .schema("partners")
        .from("partners")
        .select("id, name, status, office_id")
        .eq("id", partnerId)
        .maybeSingle();

      if (partnerError) {
        throw new Error(`Partner lookup failed: ${partnerError.message}`);
      }

      if (!partnerData) {
        return NextResponse.json(
          { error: "Selected partner was not found" },
          { status: 400 }
        );
      }

      if (partnerData.status !== "active") {
        return NextResponse.json(
          { error: "Selected partner is not active" },
          { status: 400 }
        );
      }

      partner = partnerData;
    }

    // 1) Create restaurant
    const restaurantInsertPayload = {
      name,
      slug,
      contact_name: contactName || null,
      contact_phone: contactPhone || null,
      contact_email: contactEmail,
      is_active: true,
      onboarding_status: "pending_owner_activation",
      onboarding_source_ip: sourceIp || null,
      onboarding_user_agent: userAgent || null,
      default_prep_minutes: 25,
    };

    const restaurantInsertPayloadMutable = {
      ...restaurantInsertPayload,
    } as Record<string, string | boolean | number | null>;

    let restaurantInsert = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .insert(restaurantInsertPayloadMutable)
      .select("id, slug")
      .single();

    while (restaurantInsert.error) {
      const restaurantInsertMessage = restaurantInsert.error.message || "";
      const missingOnboardingSourceIp = isMissingColumnError(
        restaurantInsertMessage,
        "onboarding_source_ip"
      );
      const missingOnboardingUserAgent = isMissingColumnError(
        restaurantInsertMessage,
        "onboarding_user_agent"
      );

      if (!missingOnboardingSourceIp && !missingOnboardingUserAgent) {
        break;
      }

      console.warn(
        "Optional onboarding metadata columns missing on restaurants insert; retrying without them.",
        {
          missingOnboardingSourceIp,
          missingOnboardingUserAgent,
          message: restaurantInsertMessage,
        }
      );

      if (missingOnboardingSourceIp) {
        delete restaurantInsertPayloadMutable.onboarding_source_ip;
      }

      if (missingOnboardingUserAgent) {
        delete restaurantInsertPayloadMutable.onboarding_user_agent;
      }

      restaurantInsert = await supabase
        .schema("food_ordering")
        .from("restaurants")
        .insert(restaurantInsertPayloadMutable)
        .select("id, slug")
        .single();
    }

    const { data: restaurant, error: restaurantError } = restaurantInsert;

    if (restaurantError || !restaurant) {
      throw new Error(
        `Failed to create restaurant: ${
          restaurantError?.message ?? "unknown error"
        }`
      );
    }

    // 2) Create tax settings
    const { error: taxError } = await supabase
      .schema("food_ordering")
      .from("tax_settings")
      .upsert({
        restaurant_id: restaurant.id,
        sales_tax_rate: salesTaxRate,
        tax_mode: taxMode,
        tax_label: taxLabel,
      });

    if (taxError) {
      throw new Error(`Failed to create tax settings: ${taxError.message}`);
    }

    // 3) Create default menu
    const { data: menu, error: menuError } = await supabase
      .schema("food_ordering")
      .from("menus")
      .insert({
        restaurant_id: restaurant.id,
        name: "Main Menu",
      })
      .select("id")
      .single();

    if (menuError || !menu) {
      throw new Error(
        `Failed to create menu: ${menuError?.message ?? "unknown error"}`
      );
    }

    // 4) Create default categories
    const categoryPayload = [
      { menu_id: menu.id, name: "Popular", sort_order: 0, is_active: true },
      { menu_id: menu.id, name: "Mains", sort_order: 1, is_active: true },
      { menu_id: menu.id, name: "Drinks", sort_order: 2, is_active: true },
    ];

    const { error: categoryError } = await supabase
      .schema("food_ordering")
      .from("menu_categories")
      .insert(categoryPayload);

    if (categoryError) {
      throw new Error(`Failed to create categories: ${categoryError.message}`);
    }

    // 5) Create business
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .insert({
        name,
        slug,
        vertical: "restaurant",
        status: "active",
        timezone: "America/New_York",
        default_destination_type: "order",
        default_destination_url: `/r/${slug}`,
        sms_enabled: true,
        sms_from_number: null,
        sms_template:
          "Sorry we missed your call. Order here at menu price: {{order_link}}",
        send_on_missed: true,
        send_on_busy: false,
        send_on_no_answer: true,
        send_on_after_hours: false,
        send_on_answered: false,
        duplicate_window_minutes: 30,
        max_sms_per_caller_per_day: 3,
        restaurant_id: restaurant.id,
      })
      .select("id, slug")
      .single();

    if (businessError || !business) {
      throw new Error(
        `Failed to create business: ${
          businessError?.message ?? "unknown error"
        }`
      );
    }

    // 6) Create business ↔ restaurant map
    const { error: businessMapError } = await supabase
      .from("business_restaurant_map")
      .insert({
        business_id: business.id,
        restaurant_id: restaurant.id,
      });

    if (businessMapError) {
      throw new Error(
        `Failed to create business/restaurant mapping: ${businessMapError.message}`
      );
    }

    // 7) Create partner attribution only when partner is provided
    if (partner) {
      const { error: attributionError } = await supabase
        .schema("partners")
        .from("business_partner_attribution")
        .insert({
          business_id: business.id,
          partner_id: partner.id,
          attribution_type: "owner",
          is_active: true,
          starts_at: new Date().toISOString(),
          ends_at: null,
        });

      if (attributionError) {
        throw new Error(
          `Failed to create partner attribution: ${attributionError.message}`
        );
      }
    }

    // 8) Create/find auth user
    let authUser = await findAuthUserByEmail(supabase, contactEmail);
    let authUserCreated = false;

    if (!authUser) {
      const { data: createdUserData, error: createUserError } =
        await supabase.auth.admin.createUser({
          email: contactEmail,
          email_confirm: true,
          user_metadata: {
            contact_name: contactName || null,
            restaurant_slug: restaurant.slug,
            restaurant_id: restaurant.id,
            business_id: business.id,
          },
        });

      if (createUserError || !createdUserData.user) {
        throw new Error(
          `Failed to create auth user: ${
            createUserError?.message ?? "unknown error"
          }`
        );
      }

      authUser = createdUserData.user;
      authUserCreated = true;
    } else {
      const { error: updateUserError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        {
          user_metadata: {
            ...(authUser.user_metadata || {}),
            contact_name: contactName || null,
            restaurant_slug: restaurant.slug,
            restaurant_id: restaurant.id,
            business_id: business.id,
          },
        }
      );

      if (updateUserError) {
        throw new Error(
          `Failed to update auth user metadata: ${updateUserError.message}`
        );
      }
    }

    // 9) Create restaurant auth mapping
    const { error: bridgeError } = await supabase
      .from("restaurant_users")
      .upsert(
        {
          restaurant_id: restaurant.id,
          auth_user_id: authUser.id,
          role: "owner",
          is_active: true,
          phone_verified: false,
          onboarding_status: "pending_owner_activation",
        },
        {
          onConflict: "restaurant_id,auth_user_id",
        }
      );

    if (bridgeError) {
      throw new Error(
        `Failed to create restaurant auth mapping: ${bridgeError.message}`
      );
    }

    // 10) Generate magic link
    const redirectTo = `${getAppBaseUrl(req)}/auth/callback`;

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: contactEmail,
        options: {
          redirectTo,
          data: {
            contact_name: contactName || null,
            restaurant_slug: restaurant.slug,
            restaurant_id: restaurant.id,
            business_id: business.id,
          },
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      throw new Error(
        `Failed to generate magic link: ${
          linkError?.message ?? "missing action link"
        }`
      );
    }

    const actionLink = linkData.properties.action_link;

    // 11) Send branded activation email
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "SaanaOS <alerts@mail.authtoolkit.com>";

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [contactEmail],
      subject: "Activate your restaurant account",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
          <h2 style="margin-bottom: 12px;">Activate your restaurant account</h2>
          <p style="margin: 0 0 12px;">
            Your restaurant has been created and is ready for activation.
          </p>
          <p style="margin: 0 0 20px;">
            Click the button below to activate your account and continue to the dashboard.
          </p>
          <p style="margin: 0 0 20px;">
            <a
              href="${actionLink}"
              style="display: inline-block; padding: 12px 18px; background: #000; color: #fff; text-decoration: none; border-radius: 8px;"
            >
              Activate Account
            </a>
          </p>
          <p style="margin: 0 0 8px; font-size: 13px; color: #555;">
            If the button does not work, copy and paste this link into your browser:
          </p>
          <p style="margin: 0; font-size: 13px; word-break: break-all; color: #555;">
            ${actionLink}
          </p>
        </div>
      `,
    });

    if (emailError) {
      throw new Error(`Failed to send activation email: ${emailError.message}`);
    }

    return NextResponse.json({
      success: true,
      slug: restaurant.slug,
      restaurantId: restaurant.id,
      menuId: menu.id,
      businessId: business.id,
      partner: partner
        ? {
            id: partner.id,
            name: partner.name,
            officeId: partner.office_id ?? null,
          }
        : null,
      owner: {
        email: contactEmail,
        authUserId: authUser.id,
        authUserCreated,
        role: "owner",
      },
    });
  } catch (error) {
    console.error("POST /api/admin/onboard-restaurant failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
