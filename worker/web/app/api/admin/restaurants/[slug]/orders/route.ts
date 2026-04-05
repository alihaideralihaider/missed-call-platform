import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

type CustomerRow = {
  id: string;
  name: string | null;
  phone: string | null;
};

type OrderRow = {
  id: string;
  customer_id: string | null;
  status: string | null;
  subtotal: number | string | null;
  tax: number | string | null;
  total: number | string | null;
  pickup_time: string | null;
  notes: string | null;
  order_number: string | null;
  public_order_code: string | null;
  payment_status: string | null;
  payment_method: string | null;
  created_at: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  price: number | string | null;
  unit_price: number | string | null;
  line_total: number | string | null;
  quantity: number | null;
  created_at: string | null;
};

function toMoney(value: number | string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(_: Request, context: RouteContext) {
  const supabase = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { slug } = await context.params;

    const { data: restaurant, error: restaurantError } = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .select("id, name, slug, profile_completed")
      .eq("slug", slug)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const { data: ordersData, error: ordersError } = await supabase
      .schema("food_ordering")
      .from("orders")
      .select(`
        id,
        customer_id,
        status,
        subtotal,
        tax,
        total,
        pickup_time,
        notes,
        order_number,
        public_order_code,
        payment_status,
        payment_method,
        created_at
      `)
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });

    if (ordersError) {
      throw new Error(`Failed to load orders: ${ordersError.message}`);
    }

    const orders = (ordersData || []) as OrderRow[];

    const customerIds = Array.from(
      new Set(
        orders
          .map((order) => order.customer_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    const orderIds = orders.map((order) => order.id);

    let customers: CustomerRow[] = [];
    if (customerIds.length > 0) {
      const { data: customersData, error: customersError } = await supabase
        .schema("food_ordering")
        .from("customers")
        .select("id, name, phone")
        .in("id", customerIds);

      if (customersError) {
        throw new Error(`Failed to load customers: ${customersError.message}`);
      }

      customers = (customersData || []) as CustomerRow[];
    }

    let orderItems: OrderItemRow[] = [];
    if (orderIds.length > 0) {
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .schema("food_ordering")
        .from("order_items")
        .select("id, order_id, menu_item_id, item_name, price, unit_price, line_total, quantity, created_at")
        .in("order_id", orderIds)
        .order("created_at", { ascending: true });

      if (orderItemsError) {
        throw new Error(
          `Failed to load order items: ${orderItemsError.message}`
        );
      }

      orderItems = (orderItemsData || []) as OrderItemRow[];
    }

    const customerMap = new Map(
      customers.map((customer) => [customer.id, customer])
    );
    const itemsByOrderId = new Map<string, OrderItemRow[]>();

    for (const item of orderItems) {
      const existing = itemsByOrderId.get(item.order_id) || [];
      existing.push(item);
      itemsByOrderId.set(item.order_id, existing);
    }

    const hydratedOrders = orders.map((order) => ({
      id: order.id,
      order_number: order.order_number || order.public_order_code || order.id,
      status: order.status || "pending",
      subtotal: toMoney(order.subtotal),
      tax: toMoney(order.tax),
      total: toMoney(order.total),
      pickup_time: order.pickup_time || "ASAP",
      notes: order.notes || "",
      payment_status: order.payment_status || "",
      payment_method: order.payment_method || "",
      created_at: order.created_at,
      customer: order.customer_id
        ? customerMap.get(order.customer_id) || null
        : null,
      items: (itemsByOrderId.get(order.id) || []).map((item) => ({
        id: item.id,
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        unit_price: toMoney(item.unit_price ?? item.price),
        price: toMoney(item.unit_price ?? item.price),
        line_total: toMoney(item.line_total),
        quantity: Number(item.quantity || 0),
        created_at: item.created_at,
      })),
    }));

    return NextResponse.json({
      success: true,
      restaurant,
      orders: hydratedOrders,
    });
  } catch (error) {
    console.error("GET /api/admin/restaurants/[slug]/orders failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}