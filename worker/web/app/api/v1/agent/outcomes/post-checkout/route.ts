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
  delivery?: {
    webhook_url?: string;
    webhook_secret?: string;
  };
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

function normalizeWebhookUrl(value: unknown) {
  const rawUrl = optionalString(value);

  if (!rawUrl) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("invalid_webhook_url");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("invalid_webhook_url");
  }

  const hostname = parsed.hostname.toLowerCase();
  const isPrivateIpv4 =
    hostname === "127.0.0.1" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

  if (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    isPrivateIpv4
  ) {
    throw new Error("invalid_webhook_url");
  }

  return parsed.toString();
}

async function hasLoggedAgentAction(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  requestId: string
) {
  const { data, error } = await admin
    .from("agent_actions")
    .select("id")
    .eq("request_id", requestId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
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
    let webhookUrl: string | null = null;
    const webhookSecret = optionalString(body.delivery?.webhook_secret);

    try {
      webhookUrl = normalizeWebhookUrl(body.delivery?.webhook_url);
    } catch {
      return agentApiError(
        "invalid_request",
        "delivery.webhook_url must be a public https URL.",
        requestId
      );
    }

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

    if (webhookUrl) {
      const webhookActionRequestId = `idempotency:${idempotencyKey}:send_webhook`;
      const webhookPayload = {
        event_type: "post_checkout_outcome_recorded",
        agent_run_id: agentRunId,
        outcome_type: outcomeType,
        outcome_id: outcomeId,
        original_order_id: originalOrderId,
        addon_offer_id: addonOfferId,
        addon_amount: hasAddonAmount ? body.addon_amount : null,
        currency,
        status: "recorded",
        timestamp: new Date().toISOString(),
        metadata,
      };

      try {
        const alreadyLogged = await hasLoggedAgentAction(admin, webhookActionRequestId);

        if (!alreadyLogged) {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "User-Agent": "AuthToolkit-PostCheckout-Agent/1.0",
            "X-AuthToolkit-Event-Type": "post_checkout_outcome_recorded",
            "X-AuthToolkit-Agent-Run-Id": agentRunId,
            "X-AuthToolkit-Request-Id": requestId,
          };

          if (webhookSecret) {
            // TODO: replace this test header with HMAC webhook signing before production use.
            headers["X-AuthToolkit-Webhook-Secret"] = webhookSecret;
          }

          const webhookResponse = await fetch(webhookUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(webhookPayload),
          });
          const delivered = webhookResponse.ok;

          await insertAgentAction(admin, {
            agentRunId,
            actionType: "send_webhook",
            actionVersion: "v1",
            status: delivered ? "completed" : "failed",
            requestId: webhookActionRequestId,
            payload: {
              webhook_url: webhookUrl,
              event_type: "post_checkout_outcome_recorded",
              agent_run_id: agentRunId,
              outcome_type: outcomeType,
            },
            result: {
              delivered,
              status_code: webhookResponse.status,
            },
          });

          if (delivered) {
            await recordUsageEvent({
              metricKey: "webhook_delivery",
              sourceType: "agent_run",
              sourceId: agentRunId,
              idempotencyKey: `usage:webhook_delivery:${agentRunId}:${outcomeType}:${
                outcomeId || requestId
              }`,
              billable: false,
              metadata: {
                runType: "post_checkout_revenue",
                webhook_url: webhookUrl,
                status_code: webhookResponse.status,
                outcome_type: outcomeType,
                delivered: true,
              },
            });
          } else {
            console.warn("post_checkout_outcome_webhook_delivery_failed", {
              requestId,
              agentRunId,
              webhookUrl,
              statusCode: webhookResponse.status,
            });
          }
        }
      } catch (error) {
        console.warn("post_checkout_outcome_webhook_delivery_failed", {
          requestId,
          agentRunId,
          webhookUrl,
          error: error instanceof Error ? error.message : "unknown_error",
        });

        try {
          await insertAgentAction(admin, {
            agentRunId,
            actionType: "send_webhook",
            actionVersion: "v1",
            status: "failed",
            requestId: webhookActionRequestId,
            payload: {
              webhook_url: webhookUrl,
              event_type: "post_checkout_outcome_recorded",
              agent_run_id: agentRunId,
              outcome_type: outcomeType,
            },
            result: {
              delivered: false,
              error: error instanceof Error ? error.message : "unknown_error",
            },
          });
        } catch (actionError) {
          console.warn("post_checkout_outcome_webhook_action_log_failed", {
            requestId,
            agentRunId,
            error:
              actionError instanceof Error ? actionError.message : "unknown_error",
          });
        }
      }
    }

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
