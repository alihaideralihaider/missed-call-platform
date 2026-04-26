import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const RANGE_OPTIONS = ["daily", "weekly", "monthly"] as const;
type SalesRange = (typeof RANGE_OPTIONS)[number];

function isRange(value: string): value is SalesRange {
  return RANGE_OPTIONS.includes(value as SalesRange);
}

function getRangeStart(range: SalesRange): string {
  const now = new Date();

  if (range === "daily") {
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }

  if (range === "weekly") {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    now.setDate(now.getDate() - diff);
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }

  now.setDate(1);
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function toMoney(value: number | string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: Request, context: RouteContext) {
  const supabase = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const requestedRange = String(searchParams.get("range") || "daily")
      .trim()
      .toLowerCase();
    const range: SalesRange = isRange(requestedRange) ? requestedRange : "daily";
    const rangeStart = getRangeStart(range);

    const { data: restaurant, error: restaurantError } = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .select("id, name, slug")
      .eq("slug", slug)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found." },
        { status: 404 }
      );
    }

    const { data: ordersData, error: ordersError } = await supabase
      .schema("food_ordering")
      .from("orders")
      .select("id, total, status, created_at")
      .eq("restaurant_id", restaurant.id)
      .eq("status", "completed")
      .gte("created_at", rangeStart)
      .order("created_at", { ascending: false });

    if (ordersError) {
      throw new Error(`Failed to load sales metrics: ${ordersError.message}`);
    }

    const orders = (ordersData || []) as Array<{
      id: string;
      total: number | string | null;
      status: string | null;
      created_at: string | null;
    }>;

    const totalSales = orders.reduce(
      (sum, order) => sum + toMoney(order.total),
      0
    );
    const orderCount = orders.length;
    const averageOrderValue =
      orderCount > 0 ? totalSales / orderCount : 0;

    return NextResponse.json({
      success: true,
      restaurant,
      range,
      metrics: {
        totalSales,
        orderCount,
        averageOrderValue,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/restaurants/[slug]/sales failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
