import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ApplySuggestionRequest = {
  suggestionId?: string;
  cartId?: string;
  action?: "accept" | "skip";
};

function jsonNoStore(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function validateAttachedModifier(args: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  restaurantId: string;
  itemId: string;
  groupId: string;
  optionId: string;
}) {
  const { data: link, error: linkError } = await args.admin
    .schema("food_ordering")
    .from("menu_item_modifier_groups")
    .select("menu_item_id")
    .eq("menu_item_id", args.itemId)
    .eq("modifier_group_id", args.groupId)
    .maybeSingle();

  if (linkError || !link) return null;

  const [{ data: group }, { data: option }] = await Promise.all([
    args.admin
      .schema("food_ordering")
      .from("modifier_groups")
      .select("id, name, restaurant_id, is_active")
      .eq("id", args.groupId)
      .eq("restaurant_id", args.restaurantId)
      .maybeSingle(),
    args.admin
      .schema("food_ordering")
      .from("modifier_group_options")
      .select("id, modifier_group_id, name, price_delta, is_active")
      .eq("id", args.optionId)
      .eq("modifier_group_id", args.groupId)
      .maybeSingle(),
  ]);

  if (!group || group.is_active === false || !option || option.is_active === false) {
    return null;
  }

  return {
    groupId: String(group.id),
    groupName: String(group.name || "Modifier"),
    optionId: String(option.id),
    optionName: String(option.name || "Option"),
    price: toNumber(option.price_delta),
  };
}

export async function POST(request: Request) {
  const admin = createSupabaseAdminClient();

  try {
    const body = (await request.json()) as ApplySuggestionRequest;
    const suggestionId = String(body.suggestionId || "").trim();
    const action = body.action === "accept" ? "accept" : "skip";

    if (!suggestionId) {
      return jsonNoStore({ error: "suggestionId is required." }, { status: 400 });
    }

    const { data: suggestion, error: suggestionError } = await admin
      .from("agent_modifier_suggestions")
      .select(
        "id, restaurant_id, cart_id, item_id, modifier_group_id, modifier_option_id, status, metadata"
      )
      .eq("id", suggestionId)
      .maybeSingle();

    if (suggestionError || !suggestion) {
      return jsonNoStore({ error: "Suggestion not found." }, { status: 404 });
    }

    if (action === "skip") {
      const { error: updateError } = await admin
        .from("agent_modifier_suggestions")
        .update({
          status: "skipped",
          cart_id: body.cartId ? String(body.cartId) : suggestion.cart_id,
          responded_at: new Date().toISOString(),
        })
        .eq("id", suggestionId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      return jsonNoStore({ success: true, status: "skipped" });
    }

    const groupId = String(suggestion.modifier_group_id || "");
    const optionId = String(suggestion.modifier_option_id || "");
    const itemId = String(suggestion.item_id || "");

    if (!groupId || !optionId || !itemId) {
      return jsonNoStore({ error: "Suggestion is incomplete." }, { status: 409 });
    }

    const modifierSelection = await validateAttachedModifier({
      admin,
      restaurantId: String(suggestion.restaurant_id),
      itemId,
      groupId,
      optionId,
    });

    if (!modifierSelection) {
      return jsonNoStore(
        { error: "Suggested modifier is no longer available for this item." },
        { status: 409 }
      );
    }

    const { error: updateError } = await admin
      .from("agent_modifier_suggestions")
      .update({
        status: "accepted",
        cart_id: body.cartId ? String(body.cartId) : suggestion.cart_id,
        responded_at: new Date().toISOString(),
      })
      .eq("id", suggestionId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return jsonNoStore({
      success: true,
      status: "accepted",
      itemId,
      modifierSelection,
    });
  } catch (error) {
    console.error("modifier_suggestion_apply_failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return jsonNoStore(
      { error: "Could not apply suggestion." },
      { status: 500 }
    );
  }
}
