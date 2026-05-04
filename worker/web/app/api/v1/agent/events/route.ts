import {
  agentApiError,
  createRequestId,
  jsonNoStore,
  normalizeOptionalUuid,
} from "@/lib/agent-api/v1";
import { recordUsageEvent } from "@/lib/metering/usageEvents";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AgentEventV1Request = {
  event_type?: string;
  business?: {
    id?: string;
  };
  location?: {
    id?: string;
  };
  agent_installation?: {
    id?: string;
  };
  customer?: Record<string, unknown>;
  order?: Record<string, unknown>;
  source_system?: string;
  source_account_id?: string;
  source_slug?: string;
  attempt_job_id?: string;
  metadata?: Record<string, unknown>;
};

const SUPPORTED_EVENT_TYPES = new Set([
  "missed_call",
  "message_received",
  "cart_started",
  "modifier_suggestion_requested",
  "checkout_completed",
  "payment_completed",
]);

const CHECKOUT_COMPLETED_SOURCE_SYSTEMS = new Set([
  "custom_checkout",
  "saanaos",
  "test",
]);

function createPublicId(prefix: string) {
  return createRequestId(prefix);
}

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isObjectRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasValue(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const admin = createSupabaseAdminClient();

  try {
    const body = (await request.json()) as AgentEventV1Request;
    const eventType = String(body.event_type || "").trim();
    let attemptJobId = "";
    const idempotencyKey =
      request.headers.get("Idempotency-Key")?.trim() ||
      request.headers.get("idempotency-key")?.trim() ||
      null;
    const sourceSystem = String(body.source_system || "").trim().toLowerCase() || null;
    const sourceAccountId = String(body.source_account_id || "").trim() || null;
    const sourceSlug = String(body.source_slug || "").trim().toLowerCase() || null;

    if (!eventType) {
      return agentApiError("invalid_request", "event_type is required.", requestId);
    }

    if (!SUPPORTED_EVENT_TYPES.has(eventType)) {
      return agentApiError(
        "validation_failed",
        "event_type is unsupported.",
        requestId,
        422
      );
    }

    if (eventType === "checkout_completed") {
      const customerInput = body.customer;
      const orderInput = body.order;
      const order = asRecord(orderInput);

      if (!idempotencyKey) {
        return agentApiError(
          "invalid_request",
          "Idempotency-Key header is required for checkout_completed events.",
          requestId
        );
      }

      if (!sourceSystem) {
        return agentApiError(
          "invalid_request",
          "source_system is required for checkout_completed events.",
          requestId
        );
      }

      if (!CHECKOUT_COMPLETED_SOURCE_SYSTEMS.has(sourceSystem)) {
        return agentApiError(
          "invalid_request",
          "source_system is unsupported for checkout_completed events.",
          requestId
        );
      }

      if (!sourceAccountId && !sourceSlug) {
        return agentApiError(
          "invalid_request",
          "source_account_id or source_slug is required for checkout_completed events.",
          requestId
        );
      }

      if (!isObjectRecord(customerInput)) {
        return agentApiError(
          "invalid_request",
          "customer object is required for checkout_completed events.",
          requestId
        );
      }

      if (!isObjectRecord(orderInput)) {
        return agentApiError(
          "invalid_request",
          "order object is required for checkout_completed events.",
          requestId
        );
      }

      if (!hasValue(order.id)) {
        return agentApiError(
          "invalid_request",
          "order.id is required for checkout_completed events.",
          requestId
        );
      }

      if (
        typeof order.total !== "number" ||
        !Number.isFinite(order.total)
      ) {
        return agentApiError(
          "invalid_request",
          "order.total is required for checkout_completed events.",
          requestId
        );
      }

      if (!hasValue(order.currency)) {
        return agentApiError(
          "invalid_request",
          "order.currency is required for checkout_completed events.",
          requestId
        );
      }
    }

    try {
      attemptJobId = normalizeOptionalUuid(body.attempt_job_id);
    } catch {
      return agentApiError(
        "invalid_request",
        "attempt_job_id must be a valid UUID.",
        requestId
      );
    }

    if (idempotencyKey) {
      // TODO: detect and reject conflicting payloads for reused idempotency keys.
      const { data: existingEvent, error: existingEventError } = await admin
        .from("agent_events")
        .select("id, status")
        .eq("idempotency_key", idempotencyKey)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingEventError) {
        throw new Error(existingEventError.message);
      }

      if (existingEvent) {
        const { data: existingRun, error: existingRunError } = await admin
          .from("agent_runs")
          .select("id")
          .eq("event_id", existingEvent.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingRunError) {
          throw new Error(existingRunError.message);
        }

        return jsonNoStore({
          event_id: existingEvent.id,
          agent_run_id: existingRun?.id || null,
          status: "accepted",
          request_id: requestId,
        });
      }
    }

    const eventId = createPublicId("evt");
    const agentRunId = createPublicId("run");
    const businessId = String(body.business?.id || "").trim() || null;
    const locationId = String(body.location?.id || "").trim() || null;
    const agentInstallationId =
      String(body.agent_installation?.id || "").trim() || null;
    const customer = asRecord(body.customer);
    const order = asRecord(body.order);
    const metadata = asRecord(body.metadata);
    const isCheckoutCompleted = eventType === "checkout_completed";
    const eventMetadata = isCheckoutCompleted
      ? {
          ...metadata,
          customer,
          order,
          source_account_id: sourceAccountId,
          post_checkout_revenue: true,
          run_type: "post_checkout_revenue",
        }
      : metadata;
    const runMetadata = isCheckoutCompleted
      ? {
          run_type: "post_checkout_revenue",
          source_account_id: sourceAccountId,
          order_id: String(order.id || ""),
          order_total: order.total,
          currency: String(order.currency || "").trim(),
          customer_reference: {
            name: customer.name || null,
            phone: customer.phone || null,
            email: customer.email || null,
          },
          intention: "accepted_no_offer_execution_yet",
        }
      : {};
    const usageAccountId = businessId || sourceAccountId;
    const checkoutUsageMetadata = isCheckoutCompleted
      ? {
          runType: "post_checkout_revenue",
          sourceAccountId: sourceAccountId || null,
          orderId: order.id ? String(order.id) : null,
          orderTotal: typeof order.total === "number" ? order.total : null,
          currency: order.currency ? String(order.currency).trim() : null,
        }
      : {};

    const { error: eventInsertError } = await admin.from("agent_events").insert({
      id: eventId,
      event_type: eventType,
      source_system: sourceSystem,
      source_slug: sourceSlug,
      business_id: businessId,
      location_id: locationId,
      agent_installation_id: agentInstallationId,
      customer,
      metadata: eventMetadata,
      idempotency_key: idempotencyKey,
      request_id: requestId,
      status: "accepted",
    });

    if (eventInsertError) {
      throw new Error(eventInsertError.message);
    }

    const { error: runInsertError } = await admin.from("agent_runs").insert({
      id: agentRunId,
      event_id: eventId,
      event_type: eventType,
      source_system: sourceSystem,
      source_slug: sourceSlug,
      business_id: businessId,
      location_id: locationId,
      agent_installation_id: agentInstallationId,
      attempt_job_id: attemptJobId || null,
      status: "accepted",
      request_id: requestId,
      metadata: runMetadata,
    });

    if (runInsertError) {
      throw new Error(runInsertError.message);
    }

    await Promise.all([
      recordUsageEvent({
        accountId: usageAccountId,
        projectId: locationId,
        metricKey: "accepted_event",
        sourceType: "agent_event",
        sourceId: eventId,
        idempotencyKey: `usage:accepted_event:${eventId}`,
        billable: false,
        metadata: {
          eventType,
          sourceSystem,
          sourceSlug,
          agentInstallationId,
          ...checkoutUsageMetadata,
        },
      }),
      recordUsageEvent({
        accountId: usageAccountId,
        projectId: locationId,
        metricKey: "agent_run",
        sourceType: "agent_run",
        sourceId: agentRunId,
        idempotencyKey: `usage:agent_run:${agentRunId}`,
        billable: false,
        metadata: {
          eventId,
          eventType,
          sourceSystem,
          sourceSlug,
          attemptJobId: attemptJobId || null,
          agentInstallationId,
          ...checkoutUsageMetadata,
        },
      }),
    ]);

    // TODO: route to the correct source system for real agent execution.
    // TODO: enqueue webhook delivery for agent.event.accepted / agent.run.started.
    return jsonNoStore({
      event_id: eventId,
      agent_run_id: agentRunId,
      status: "accepted",
      request_id: requestId,
    });
  } catch (error) {
    console.error("v1_agent_event_failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return agentApiError(
      "internal_error",
      "Could not accept agent event.",
      requestId,
      500
    );
  }
}
