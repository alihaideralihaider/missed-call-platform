import {
  agentApiError,
  createRequestId,
  insertAgentAction,
  jsonNoStore,
  maybeLoadAgentRun,
  normalizeAgentRunId,
} from "@/lib/agent-api/v1";
import { POST as applyModifier } from "@/app/api/agent/suggestions/apply/route";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ApplyModifierV1Request = {
  agent_run_id?: string;
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
    const agentRunId = normalizeAgentRunId(body.agent_run_id);
    const actionPayload = {
      suggestion_id: body.suggestion_id,
      cart: body.cart || {},
      action,
    };
    const admin = agentRunId ? createSupabaseAdminClient() : null;

    if (!suggestionId) {
      return agentApiError(
        "invalid_request",
        "suggestion_id is required.",
        requestId
      );
    }

    if (agentRunId && admin) {
      const agentRun = await maybeLoadAgentRun(admin, agentRunId);

      if (!agentRun) {
        return agentApiError("not_found", "Agent run not found.", requestId, 404);
      }
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

    let internalResponse: Response;
    let data: InternalApplyModifierResponse;

    try {
      internalResponse = await applyModifier(internalRequest);
      data = (await internalResponse.json()) as InternalApplyModifierResponse;
    } catch (error) {
      if (agentRunId && admin) {
        await insertAgentAction(admin, {
          agentRunId,
          actionType: "apply_modifier",
          actionVersion: "v1",
          status: "failed",
          requestId,
          payload: actionPayload,
          result: {
            error: error instanceof Error ? error.message : "unknown_error",
          },
        });
      }

      throw error;
    }

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

      if (agentRunId && admin) {
        await insertAgentAction(admin, {
          agentRunId,
          actionType: "apply_modifier",
          actionVersion: "v1",
          status: "failed",
          requestId,
          payload: actionPayload,
          result: {
            status: "failed",
            error: data.error || "Could not apply modifier suggestion.",
          },
        });
      }

      return agentApiError(
        code,
        data.error || "Could not apply modifier suggestion.",
        requestId,
        status
      );
    }

    if (data.status === "skipped") {
      const responseBody = {
        status: "skipped",
        request_id: requestId,
      };

      if (agentRunId && admin) {
        await insertAgentAction(admin, {
          agentRunId,
          actionType: "apply_modifier",
          actionVersion: "v1",
          status: "completed",
          requestId,
          payload: actionPayload,
          result: {
            status: "skipped",
          },
        });
      }

      return jsonNoStore(responseBody);
    }

    const selection = data.modifierSelection;

    const modifierSelection = selection
      ? {
          group_id: selection.groupId,
          group_name: selection.groupName,
          option_id: selection.optionId,
          option_name: selection.optionName,
          price: selection.price,
        }
      : null;
    const responseBody = {
      status: "accepted",
      modifier_selection: modifierSelection,
      request_id: requestId,
    };

    if (agentRunId && admin) {
      await insertAgentAction(admin, {
        agentRunId,
        actionType: "apply_modifier",
        actionVersion: "v1",
        status: "completed",
        requestId,
        payload: actionPayload,
        result: {
          status: "accepted",
          modifier_selection: modifierSelection,
        },
      });
    }

    return jsonNoStore(responseBody);
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
