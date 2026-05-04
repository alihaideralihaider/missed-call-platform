import {
  agentApiError,
  createRequestId,
  insertAgentAction,
  jsonNoStore,
  normalizeAgentRunId,
} from "@/lib/agent-api/v1";
import { recordUsageEvent } from "@/lib/metering/usageEvents";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PostCheckoutOutcomeRequest = {
  agent_run_id?: string;
  outcome_type?: string;
  outcome_id?: string;
  original_order_id?: string;
  addon_offer_id?: string;
  addon_amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
};

const SUPPORTED_POST_CHECKOUT_OUTCOMES = new Set([
  "add_on_purchased",
  "offer_expired",
  "offer_suppressed",
  "failed",
]);

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const admin = createSupabaseAdminClient();

  try {
    const body = (await request.json()) as PostCheckoutOutcomeRequest;
    const idempotencyKey =
      request.headers.get("Idempotency-Key")?.trim() ||
      request.headers.get("idempotency-key")?.trim() ||
      null;
    const agentRunId = normalizeAgentRunId(body.agent_run_id);
    const outcomeType = String(body.outcome_type || "").trim();
    const outcomeId = optionalString(body.outcome_id);
    const originalOrderId = optionalString(body.original_order_id);
    const addonOfferId = optionalString(body.addon_offer_id);
    const currency = optionalString(body.currency);
    const metadata = asRecord(body.metadata);
    const hasAddonAmount = body.addon_amount !== undefined && body.addon_amount !== null;

    if (!idempotencyKey) {
      return agentApiError(
        "invalid_request",
        "Idempotency-Key header is required.",
        requestId
      );
    }

    if (!agentRunId) {
      return agentApiError("invalid_request", "agent_run_id is required.", requestId);
    }

    if (!outcomeType) {
      return agentApiError("invalid_request", "outcome_type is required.", requestId);
    }

    if (!SUPPORTED_POST_CHECKOUT_OUTCOMES.has(outcomeType)) {
      return agentApiError(
        "invalid_request",
        "outcome_type is unsupported.",
        requestId
      );
    }

    if (
      hasAddonAmount &&
      (typeof body.addon_amount !== "number" || !Number.isFinite(body.addon_amount))
    ) {
      return agentApiError(
        "invalid_request",
        "addon_amount must be numeric when provided.",
        requestId
      );
    }

    if (hasAddonAmount && !currency) {
      return agentApiError(
        "invalid_request",
        "currency is required when addon_amount is provided.",
        requestId
      );
    }

    const { data: agentRun, error: runError } = await admin
      .from("agent_runs")
      .select("id, metadata")
      .eq("id", agentRunId)
      .maybeSingle();

    if (runError) {
      throw new Error(runError.message);
    }

    if (!agentRun) {
      return agentApiError("not_found", "Agent run not found.", requestId, 404);
    }

    const runMetadata = asRecord(agentRun.metadata);

    if (runMetadata.run_type !== "post_checkout_revenue") {
      return agentApiError(
        "invalid_request",
        "agent_run_id is not a post_checkout_revenue run.",
        requestId
      );
    }

    const actionPayload = {
      agent_run_id: agentRunId,
      outcome_type: outcomeType,
      outcome_id: outcomeId,
      original_order_id: originalOrderId,
      addon_offer_id: addonOfferId,
      addon_amount: hasAddonAmount ? body.addon_amount : null,
      currency,
    };
    const actionResult = {
      outcome_type: outcomeType,
      outcome_id: outcomeId,
      status: "recorded",
      metadata,
    };

    await insertAgentAction(admin, {
      agentRunId,
      actionType: "record_post_checkout_outcome",
      actionVersion: "v1",
      status: "completed",
      requestId: `idempotency:${idempotencyKey}:record_post_checkout_outcome`,
      payload: actionPayload,
      result: actionResult,
    });

    await recordUsageEvent({
      metricKey: "outcome_recorded",
      sourceType: "agent_run",
      sourceId: agentRunId,
      idempotencyKey: `usage:outcome_recorded:${agentRunId}:${outcomeType}:${
        outcomeId || idempotencyKey
      }`,
      billable: false,
      metadata: {
        runType: "post_checkout_revenue",
        outcome_type: outcomeType,
        outcome_id: outcomeId,
        original_order_id: originalOrderId,
        addon_offer_id: addonOfferId,
        addon_amount: hasAddonAmount ? body.addon_amount : null,
        currency,
      },
    });

    return jsonNoStore({
      agent_run_id: agentRunId,
      outcome_type: outcomeType,
      status: "recorded",
      request_id: requestId,
    });
  } catch (error) {
    console.error("v1_post_checkout_outcome_failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return agentApiError(
      "internal_error",
      "Could not record post-checkout outcome.",
      requestId,
      500
    );
  }
}
