import {
  agentApiError,
  createRequestId,
  jsonNoStore,
} from "@/lib/agent-api/v1";

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
  source_system?: string;
  source_slug?: string;
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

function createPublicId(prefix: string) {
  return createRequestId(prefix);
}

export async function POST(request: Request) {
  const requestId = createRequestId();

  try {
    const body = (await request.json()) as AgentEventV1Request;
    const eventType = String(body.event_type || "").trim();

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

    // TODO: persist the accepted event with idempotency support.
    // TODO: create a real agent run record and route to the correct source system.
    // TODO: enqueue webhook delivery for agent.event.accepted / agent.run.started.
    return jsonNoStore({
      event_id: createPublicId("evt"),
      agent_run_id: createPublicId("run"),
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

