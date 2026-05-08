import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSms } from "@/lib/messaging/sendSms";

type LeadPayload = {
  name: string;
  restaurant: string;
  phone: string;
  email: string;
  locations: string;
  volume: string;
  notes: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+")) return phone;
  return `+${digits}`;
}

async function sendEmailAlert(payload: LeadPayload) {
  const resendApiKey = requiredEnv("RESEND_API_KEY");
  const fromEmail = requiredEnv("LEAD_ALERT_FROM_EMAIL");
  const toEmail = requiredEnv("LEAD_ALERT_TO_EMAIL");

  const subject = `New Saana lead: ${payload.restaurant || payload.name}`;

  const html = `
    <h2>New Saana Lead</h2>
    <p><strong>Name:</strong> ${payload.name}</p>
    <p><strong>Restaurant:</strong> ${payload.restaurant}</p>
    <p><strong>Phone:</strong> ${payload.phone}</p>
    <p><strong>Email:</strong> ${payload.email}</p>
    <p><strong>Locations:</strong> ${payload.locations}</p>
    <p><strong>Pain point:</strong> ${payload.volume}</p>
    <p><strong>Notes:</strong><br>${(payload.notes || "None").replace(/\n/g, "<br>")}</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error: ${text}`);
  }
}

async function sendSmsAlert(payload: LeadPayload) {
  const toPhone = requiredEnv("LEAD_ALERT_TO_PHONE");

  const body =
    `New Saana lead\n` +
    `Name: ${payload.name}\n` +
    `Restaurant: ${payload.restaurant}\n` +
    `Phone: ${payload.phone}\n` +
    `Email: ${payload.email}\n` +
    `Locations: ${payload.locations}\n` +
    `Pain: ${payload.volume}`;

  const result = await sendSms({
    to: normalizePhone(toPhone),
    body,
    messageType: "lead_alert",
  });

  if (!result.success) {
    throw new Error(result.error || "SMS alert failed.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<LeadPayload>;

    const payload: LeadPayload = {
      name: (body.name || "").trim(),
      restaurant: (body.restaurant || "").trim(),
      phone: (body.phone || "").trim(),
      email: (body.email || "").trim(),
      locations: (body.locations || "").trim(),
      volume: (body.volume || "").trim(),
      notes: (body.notes || "").trim(),
    };

    if (
      !payload.name ||
      !payload.restaurant ||
      !payload.phone ||
      !payload.email ||
      !payload.locations ||
      !payload.volume
    ) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const supabase = createClient<any>(
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { error } = await supabase
      .schema("marketing")
      .from("leads")
      .insert({
        name: payload.name,
        restaurant: payload.restaurant,
        phone: payload.phone,
        email: payload.email,
        locations: payload.locations,
        volume: payload.volume,
        notes: payload.notes,
      });

      if (error) {
      console.error("Supabase insert error:", error);

      return NextResponse.json(
        { error: `Supabase insert error: ${error.message}` },
        { status: 500 }
      );
    }

    await Promise.all([
      sendEmailAlert(payload),
      sendSmsAlert(payload),
    ]);

    return NextResponse.json({ ok: true });
    } catch (error) {
    console.error("Lead submit route error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to process lead.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
