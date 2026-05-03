import {
  agentApiError,
  createRequestId,
  jsonNoStore,
} from "@/lib/agent-api/v1";
import { POST as applyModifier } from "@/app/api/agent/suggestions/apply/route";

type ApplyModifierV1Request = {
  suggestion_id?: string;
  cart?: {
    id?: string;
  };
  action?: "accept" | "skip";
};

type InternalApplyModifierResponse = {
  status?: "accepted" | "skipped";
  modifierSelection?: {
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    price: number;
  };
  error?: string;
};

export async function POST(request: Request) {
  const requestId = createRequestId();

  try {
    const body = (await request.json()) as ApplyModifierV1Request;
    const suggestionId = String(body.suggestion_id || "").trim();
    const action = body.action === "accept" ? "accept" : "skip";

    if (!suggestionId) {
      return agentApiError(
        "invalid_request",
        "suggestion_id is required.",
        requestId
      );
    }

    const internalRequest = new Request(request.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        suggestionId,
        cartId: body.cart?.id,
        action,
      }),
    });

    const internalResponse = await applyModifier(internalRequest);
    const data = (await internalResponse.json()) as InternalApplyModifierResponse;

    if (!internalResponse.ok) {
      const status = internalResponse.status;
      const code =
        status === 404
          ? "not_found"
          : status === 409
            ? "conflict"
            : status >= 500
              ? "internal_error"
              : "invalid_request";

      return agentApiError(
        code,
        data.error || "Could not apply modifier suggestion.",
        requestId,
        status
      );
    }

    if (data.status === "skipped") {
      return jsonNoStore({
        status: "skipped",
        request_id: requestId,
      });
    }

    const selection = data.modifierSelection;

    return jsonNoStore({
      status: "accepted",
      modifier_selection: selection
        ? {
            group_id: selection.groupId,
            group_name: selection.groupName,
            option_id: selection.optionId,
            option_name: selection.optionName,
            price: selection.price,
          }
        : null,
      request_id: requestId,
    });
  } catch (error) {
    console.error("v1_agent_apply_modifier_failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return agentApiError(
      "internal_error",
      "Could not apply modifier suggestion.",
      requestId,
      500
    );
  }
}

