import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getPlatformAccessForUserId } from "@/lib/platform/access";
import { getAppBaseUrl } from "@/lib/app-url";

const resend = new Resend(process.env.RESEND_API_KEY);

async function findAuthUserByEmail(supabase: SupabaseClient, email: string) {
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

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await req.json();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const authUser = await findAuthUserByEmail(supabase, email);

    if (!authUser?.id) {
      return NextResponse.json(
        { error: "This account is not allowed to access Platform Admin." },
        { status: 403 }
      );
    }

    const platformAccess = await getPlatformAccessForUserId(authUser.id, email);

    if (!platformAccess) {
      return NextResponse.json(
        { error: "This account is not allowed to access Platform Admin." },
        { status: 403 }
      );
    }

    const redirectTo = `${getAppBaseUrl(
      req
    )}/auth/callback?next=/platform&source=platform`;

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo,
          data: {
            platform_role: platformAccess.role,
          },
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      throw new Error(
        `Failed to generate platform login link: ${
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
      subject: "Your Platform Admin login link",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
          <h2 style="margin-bottom: 12px;">Platform Admin login</h2>
          <p style="margin: 0 0 12px;">
            Click the button below to sign in to SaanaOS Platform Admin.
          </p>
          <p style="margin: 0 0 20px;">
            <a
              href="${actionLink}"
              style="display: inline-block; padding: 12px 18px; background: #000; color: #fff; text-decoration: none; border-radius: 8px;"
            >
              Open Platform Admin
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
      throw new Error(`Failed to send platform login email: ${emailError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/platform/auth/send-login-link failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send platform login link.",
      },
      { status: 500 }
    );
  }
}
