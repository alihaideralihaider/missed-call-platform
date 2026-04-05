export const runtime = "edge";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function getAppBaseUrl(): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000";

  return appUrl.replace(/\/+$/, "");
}

async function findAuthUserByEmail(
  supabase: any,
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
    (user: any) => (user.email || "").trim().toLowerCase() === email
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

export async function POST(req: Request) {
  const supabase = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const authUser = await findAuthUserByEmail(supabase, email);

    if (!authUser) {
      return NextResponse.json(
        { error: "This account is not linked to any restaurant admin access." },
        { status: 403 }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("restaurant_users")
      .select("restaurant_id, is_active")
      .eq("auth_user_id", authUser.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership?.restaurant_id) {
      return NextResponse.json(
        { error: "This account is not linked to any restaurant admin access." },
        { status: 403 }
      );
    }

    const redirectTo = `${getAppBaseUrl()}/auth/callback`;

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo,
          data: {
            restaurant_id: membership.restaurant_id,
          },
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      throw new Error(
        `Failed to generate login link: ${
          linkError?.message ?? "missing action link"
        }`
      );
    }

    const actionLink = linkData.properties.action_link;

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "SaanaOS <alerts@mail.authtoolkit.com>";

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "Your secure login link",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
          <h2 style="margin-bottom: 12px;">Secure login</h2>
          <p style="margin: 0 0 12px;">
            Click the button below to sign in to your restaurant admin.
          </p>
          <p style="margin: 0 0 20px;">
            <a
              href="${actionLink}"
              style="display: inline-block; padding: 12px 18px; background: #000; color: #fff; text-decoration: none; border-radius: 8px;"
            >
              Log In
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
      throw new Error(`Failed to send login email: ${emailError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/send-login-link failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send login link.",
      },
      { status: 500 }
    );
  }
}