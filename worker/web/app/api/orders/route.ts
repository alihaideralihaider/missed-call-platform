export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const workerUrl = process.env.ORDER_API_BASE_URL;

    if (!workerUrl) {
      return NextResponse.json(
        { error: "Missing ORDER_API_BASE_URL" },
        { status: 500 }
      );
    }

    const res = await fetch(`${workerUrl}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    const data = isJson
      ? await res.json()
      : { error: await res.text() || "Worker error" };

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || "Worker error" },
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