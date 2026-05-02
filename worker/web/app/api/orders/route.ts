import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";

import { markMissedCallRecoveryOrderPlaced } from "@/lib/attempts/universalAttemptsEngine";

type FetchLikeBinding = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

function getErrorMessage(data: unknown) {
  if (!data || typeof data !== "object") return "";

  const error = (data as { error?: unknown }).error;
  return typeof error === "string" ? error : "";
}

function buildOrderApiUrl(workerUrl: string) {
  const url = new URL(workerUrl.trim());

  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = "/api/orders";
    return url.toString();
  }

  if (!url.pathname.endsWith("/api/orders")) {
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/api/orders`;
  }

  return url.toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cloudflareEnv =
      process.env.NODE_ENV === "production"
        ? (getCloudflareContext().env as Record<string, unknown>)
        : undefined;
    const orderApiService = cloudflareEnv?.ORDER_API_SERVICE as
      | FetchLikeBinding
      | undefined;
    const workerUrl = process.env.ORDER_API_BASE_URL?.trim();

    console.log("API /orders hit", {
      hasOrderApiService: Boolean(orderApiService),
      hasOrderApiBaseUrl: Boolean(workerUrl),
      restaurantSlug:
        typeof body?.restaurantSlug === "string" ? body.restaurantSlug : null,
      itemCount: Array.isArray(body?.items) ? body.items.length : 0,
      hasPickupAt: typeof body?.pickupAt === "string" && body.pickupAt.length > 0,
      smsOptIn: body?.smsOptIn === true,
    });

    if (!orderApiService && !workerUrl) {
      console.error("Missing ORDER_API_SERVICE and ORDER_API_BASE_URL");
      return NextResponse.json(
        { error: "Missing ORDER_API_SERVICE and ORDER_API_BASE_URL" },
        { status: 500 }
      );
    }

    const requestInit: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    };

    let res: Response;

    try {
      res = orderApiService
        ? await orderApiService.fetch(new URL("/api/orders", req.url), requestInit)
        : await fetch(buildOrderApiUrl(workerUrl!), requestInit);
    } catch (proxyError) {
      console.error("API /orders proxy request failed:", {
        hasOrderApiService: Boolean(orderApiService),
        hasOrderApiBaseUrl: Boolean(workerUrl),
        error:
          proxyError instanceof Error ? proxyError.message : String(proxyError),
      });

      return NextResponse.json(
        {
          error:
            "Order service is temporarily unavailable. Please try again shortly.",
        },
        { status: 503 }
      );
    }

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    let data: unknown;

    if (isJson) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = { error: text || "Worker error" };
    }

    console.log("Worker response status:", res.status);

    if (!res.ok) {
      return NextResponse.json(
        { error: getErrorMessage(data) || "Worker error" },
        { status: res.status }
      );
    }

    const orderId =
      data && typeof data === "object" && typeof (data as { orderId?: unknown }).orderId === "string"
        ? (data as { orderId: string }).orderId
        : "";
    const orderNumber =
      data &&
      typeof data === "object" &&
      typeof (data as { orderNumber?: unknown }).orderNumber === "string"
        ? (data as { orderNumber: string }).orderNumber
        : null;
    const total =
      data && typeof data === "object" && typeof (data as { total?: unknown }).total === "number"
        ? (data as { total: number }).total
        : null;

    if (
      orderId &&
      typeof body?.restaurantSlug === "string" &&
      typeof body?.customerPhone === "string"
    ) {
      try {
        const attemptJobId = await markMissedCallRecoveryOrderPlaced({
          restaurantSlug: body.restaurantSlug,
          customerPhone: body.customerPhone,
          orderId,
          orderNumber,
          total,
        });

        console.log("attempt_outcome_order_placed", {
          attemptJobId,
          orderId,
          restaurantSlug: body.restaurantSlug,
        });
      } catch (attemptError) {
        console.error("attempt_outcome_order_placed_failed", {
          orderId,
          restaurantSlug: body.restaurantSlug,
          error:
            attemptError instanceof Error
              ? attemptError.message
              : "unknown_error",
        });
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("API /orders error:", err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
