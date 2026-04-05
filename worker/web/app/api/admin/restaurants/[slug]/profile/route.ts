export const runtime = "edge";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RestaurantHourInput = {
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
};

function normalizeHours(hours: unknown): RestaurantHourInput[] {
  if (!Array.isArray(hours)) return [];

  return hours
    .map((row) => ({
      day_of_week: Number((row as any)?.day_of_week),
      is_closed: Boolean((row as any)?.is_closed),
      open_time: (row as any)?.open_time || null,
      close_time: (row as any)?.close_time || null,
    }))
    .filter(
      (row) =>
        Number.isInteger(row.day_of_week) &&
        row.day_of_week >= 0 &&
        row.day_of_week <= 6
    )
    .sort((a, b) => a.day_of_week - b.day_of_week);
}

function validateHours(hours: RestaurantHourInput[]) {
  if (hours.length === 0) return null;
  if (hours.length !== 7) {
    return "Hours must include exactly 7 rows.";
  }

  const seen = new Set<number>();

  for (const row of hours) {
    if (seen.has(row.day_of_week)) {
      return `Duplicate day_of_week: ${row.day_of_week}`;
    }
    seen.add(row.day_of_week);

    if (row.is_closed) {
      continue;
    }

    if (!row.open_time || !row.close_time) {
      return `Open and close times are required for day ${row.day_of_week}`;
    }

    if (row.open_time === row.close_time) {
      return `open_time and close_time cannot be the same for day ${row.day_of_week}`;
    }
  }

  return null;
}

export async function GET(_: Request, { params }: any) {
  const { slug } = await params;
  const admin = createSupabaseAdminClient();

  const { data: restaurant, error: restaurantError } = await admin
    .schema("food_ordering")
    .from("restaurants")
    .select(
      "id, name, slug, address, address_line_1, address_line_2, city, state, postal_code, pickup_instructions, timezone"
    )
    .eq("slug", slug)
    .single();

  if (restaurantError || !restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: taxSettings } = await admin
    .schema("food_ordering")
    .from("tax_settings")
    .select("sales_tax_rate, tax_mode, tax_label")
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();

  const { data: hours, error: hoursError } = await admin
    .schema("food_ordering")
    .from("restaurant_hours")
    .select("day_of_week, is_closed, open_time, close_time")
    .eq("restaurant_id", restaurant.id)
    .order("day_of_week", { ascending: true });

  if (hoursError) {
    return NextResponse.json({ error: hoursError.message }, { status: 500 });
  }

  return NextResponse.json({
    restaurant,
    taxSettings: taxSettings || null,
    hours: hours || [],
  });
}

export async function POST(req: Request, { params }: any) {
  const { slug } = await params;
  const body = await req.json();
  const admin = createSupabaseAdminClient();

  const { data: restaurant, error: restaurantError } = await admin
    .schema("food_ordering")
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .single();

  if (restaurantError || !restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hours = normalizeHours(body.hours);
  const hoursValidationError = validateHours(hours);

  if (hoursValidationError) {
    return NextResponse.json({ error: hoursValidationError }, { status: 400 });
  }

  const restaurantUpdate: Record<string, any> = {};

  if (typeof body.pickupAddress === "string") {
    restaurantUpdate.address = body.pickupAddress;
  }

  if (typeof body.addressLine1 === "string") {
    restaurantUpdate.address_line_1 = body.addressLine1;
  }

  if (typeof body.addressLine2 === "string") {
    restaurantUpdate.address_line_2 = body.addressLine2;
  }

  if (typeof body.city === "string") {
    restaurantUpdate.city = body.city;
  }

  if (typeof body.state === "string") {
    restaurantUpdate.state = body.state;
  }

  if (typeof body.postalCode === "string") {
    restaurantUpdate.postal_code = body.postalCode;
  }

  if (typeof body.pickupInstructions === "string") {
    restaurantUpdate.pickup_instructions = body.pickupInstructions;
  }

  if (typeof body.timezone === "string" && body.timezone.trim()) {
    restaurantUpdate.timezone = body.timezone.trim();
  }

  if (Object.keys(restaurantUpdate).length > 0) {
    const { error: updateRestaurantError } = await admin
      .schema("food_ordering")
      .from("restaurants")
      .update(restaurantUpdate)
      .eq("id", restaurant.id);

    if (updateRestaurantError) {
      return NextResponse.json(
        { error: updateRestaurantError.message },
        { status: 500 }
      );
    }
  }

  if (
    body.salesTaxRate !== undefined ||
    body.taxMode !== undefined ||
    body.taxLabel !== undefined
  ) {
    const { error: taxError } = await admin
      .schema("food_ordering")
      .from("tax_settings")
      .upsert(
        {
          restaurant_id: restaurant.id,
          sales_tax_rate: body.salesTaxRate ?? 0,
          tax_mode: body.taxMode ?? "exclusive",
          tax_label: body.taxLabel ?? "Tax",
        },
        { onConflict: "restaurant_id" }
      );

    if (taxError) {
      return NextResponse.json({ error: taxError.message }, { status: 500 });
    }
  }

  if (hours.length > 0) {
    const rows = hours.map((row) => ({
      restaurant_id: restaurant.id,
      day_of_week: row.day_of_week,
      is_closed: row.is_closed,
      open_time: row.is_closed ? null : row.open_time,
      close_time: row.is_closed ? null : row.close_time,
    }));

    const { error: hoursUpsertError } = await admin
      .schema("food_ordering")
      .from("restaurant_hours")
      .upsert(rows, { onConflict: "restaurant_id,day_of_week" });

    if (hoursUpsertError) {
      return NextResponse.json(
        { error: hoursUpsertError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}