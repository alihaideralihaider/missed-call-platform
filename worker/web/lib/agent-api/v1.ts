import { NextResponse } from "next/server";

export type AgentApiErrorCode =
  | "invalid_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation_failed"
  | "rate_limited"
  | "internal_error";

export function createRequestId(prefix = "req") {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

  return `${prefix}_${id.replace(/-/g, "").slice(0, 24)}`;
}

export function jsonNoStore(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

export function agentApiError(
  code: AgentApiErrorCode,
  message: string,
  requestId: string,
  status = 400
) {
  return jsonNoStore(
    {
      error: {
        code,
        message,
        request_id: requestId,
      },
    },
    { status }
  );
}

export function normalizeSourceSystem(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function isSupportedSourceSystem(value: unknown) {
  return normalizeSourceSystem(value) === "saanaos";
}

