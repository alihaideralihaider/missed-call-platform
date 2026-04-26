import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";

type FetchLikeBinding = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

function getErrorMessage(data: unknown) {
  if (!data || typeof data !== "object") return "";

  const error = (data as { error?: unknown }).error;
  return typeof error === "string" ? error : "";
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

    console.log("API /orders hit");
    console.log("ORDER_API_SERVICE bound:", Boolean(orderApiService));
    console.log("ORDER_API_BASE_URL:", workerUrl);
    console.log("PROXY_PAYLOAD_ITEMS", body?.items);

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

    const res = orderApiService
      ? await orderApiService.fetch(new URL("/api/orders", req.url), requestInit)
      : await fetch(`${workerUrl!.replace(/\/+$/, "")}/api/orders`, requestInit);

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
    console.log("Worker response body:", data);

    if (!res.ok) {
      return NextResponse.json(
        { error: getErrorMessage(data) || "Worker error" },
        { status: res.status }
      );
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
