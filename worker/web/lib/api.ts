import type { CartItem } from "@/lib/cart";

type CreateOrderInput = {
  restaurantSlug: string;
  customerName: string;
  customerPhone: string;
  pickupTime?: string;
  smsOptIn?: boolean;
  notes?: string;
  items: CartItem[];
};

function getApiBase() {
  const envBase = process.env.NEXT_PUBLIC_API_BASE?.trim();

  if (envBase) {
    return envBase.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const { hostname } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `http://${hostname}:8787`;
    }

    return window.location.origin.replace(/\/+$/, "");
  }

  return "http://127.0.0.1:8787";
}

export async function createOrder(input: CreateOrderInput) {
  const apiBase = getApiBase();

  console.log("API base being used:", apiBase);
  console.log("createOrder payload:", input);

  const res = await fetch(`${apiBase}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const data = await res.json().catch(() => ({}));
  console.log("createOrder response status:", res.status);
  console.log("createOrder response body:", data);

  if (!res.ok) {
    throw new Error(
      data.error ||
        data.detail?.message ||
        `Request failed with status ${res.status}`
    );
  }

  return data;
}
