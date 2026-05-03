import {
  agentApiError,
  createRequestId,
  isSupportedSourceSystem,
  jsonNoStore,
} from "@/lib/agent-api/v1";
import { POST as suggestModifier } from "@/app/api/agent/suggestions/modifier/route";

type SuggestModifierV1Request = {
  business?: {
    id?: string;
  };
  location?: {
    id?: string;
  };
  customer?: {
    id?: string;
    phone?: string;
    email?: string;
  };
  source_system?: string;
  source_slug?: string;
  item?: {
    id?: string;
  };
  cart?: {
    id?: string;
    subtotal?: number;
  };
};

type InternalModifierSuggestionResponse = {
  suggestion?: {
    id: string;
    itemId?: string;
    modifierGroupId?: string | null;
    modifierOptionId?: string | null;
    groupName?: string;
    optionName?: string;
    priceDelta?: number;
    message?: string;
    reason?: string | null;
  } | null;
};

export async function POST(request: Request) {
  const requestId = createRequestId();

  try {
    const body = (await request.json()) as SuggestModifierV1Request;

    if (!isSupportedSourceSystem(body.source_system)) {
      return agentApiError(
        "validation_failed",
        "source_system is unsupported.",
        requestId,
        422
      );
    }

    const restaurantSlug = String(body.source_slug || "").trim().toLowerCase();
    const itemId = String(body.item?.id || "").trim();

    if (!restaurantSlug) {
      return agentApiError("invalid_request", "source_slug is required.", requestId);
    }

    if (!itemId) {
      return agentApiError("invalid_request", "item.id is required.", requestId);
    }

    const internalRequest = new Request(request.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        restaurantSlug,
        customerPhone: body.customer?.phone,
        cartId: body.cart?.id,
        itemId,
        entryChannel: "v1_agent_api",
        context: {
          cartSubtotal: body.cart?.subtotal,
          orderType: "pickup",
        },
      }),
    });

    const internalResponse = await suggestModifier(internalRequest);
    const data = (await internalResponse.json()) as InternalModifierSuggestionResponse;
    const suggestion = data.suggestion;

    if (!suggestion) {
      return jsonNoStore({
        suggestion: null,
        request_id: requestId,
      });
    }

    return jsonNoStore({
      suggestion: {
        id: suggestion.id,
        item: {
          id: suggestion.itemId || itemId,
        },
        modifier_group: {
          id: suggestion.modifierGroupId,
          name: suggestion.groupName || "",
        },
        modifier_option: {
          id: suggestion.modifierOptionId,
          name: suggestion.optionName || "",
        },
        price_delta: suggestion.priceDelta || 0,
        message: suggestion.message || "",
        reason: suggestion.reason || null,
      },
      request_id: requestId,
    });
  } catch (error) {
    console.error("v1_agent_suggest_modifier_failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return agentApiError(
      "internal_error",
      "Could not create modifier suggestion.",
      requestId,
      500
    );
  }
}

