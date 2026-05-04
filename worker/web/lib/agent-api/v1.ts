import { NextResponse } from "next/server";

import { recordUsageEvent } from "@/lib/metering/usageEvents";

type AgentApiSupabaseClient = {
  from: (table: string) => any;
};

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

export function createAgentActionId() {
  return createRequestId("act");
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

export function normalizeAgentRunId(value: unknown) {
  return String(value || "").trim();
}

export function normalizeOptionalUuid(value: unknown) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return "";
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(normalized)) {
    throw new Error("invalid_uuid");
  }

  return normalized;
}

export async function maybeLoadAgentRun(
  admin: AgentApiSupabaseClient,
  agentRunId: string
) {
  const normalizedRunId = normalizeAgentRunId(agentRunId);

  if (!normalizedRunId) {
    return null;
  }

  const { data, error } = await admin
    .from("agent_runs")
    .select("id")
    .eq("id", normalizedRunId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? { id: String(data.id) } : null;
}

export async function insertAgentAction(
  admin: AgentApiSupabaseClient,
  input: {
    agentRunId: string;
    actionType: string;
    status: "completed" | "failed";
    requestId: string;
    payload: Record<string, unknown>;
    result: Record<string, unknown>;
    actionVersion?: string;
  }
) {
  const actionId = createAgentActionId();
  const { error } = await admin.from("agent_actions").insert({
    id: actionId,
    agent_run_id: input.agentRunId,
    action_type: input.actionType,
    action_version: input.actionVersion || "v1",
    status: input.status,
    request_id: input.requestId,
    payload: input.payload,
    result: input.result,
    completed_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") {
      return;
    }

    throw new Error(error.message);
  }

  await recordUsageEvent({
    metricKey: "action_execution",
    sourceType: "agent_action",
    sourceId: actionId,
    idempotencyKey: `usage:action_execution:${actionId}`,
    billable: false,
    metadata: {
      action_type: input.actionType,
      action_version: input.actionVersion || "v1",
      agent_run_id: input.agentRunId,
      status: input.status,
    },
  });
}
