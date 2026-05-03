import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ModifierSuggestionRequest = {
  restaurantSlug?: string;
  customerPhone?: string;
  cartId?: string;
  itemId?: string;
  entryChannel?: string;
  context?: {
    cartSubtotal?: number;
    orderType?: string;
  };
};

type AttachedModifierOption = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  description: string | null;
  price: number;
  groupRequired: boolean;
  minSelect: number;
  maxSelect: number | null;
  selectionMode: string | null;
};

type OptionOptimizationStats = {
  option: AttachedModifierOption;
  shownCount: number;
  acceptedCount: number;
  skippedCount: number;
  revenueAdded: number;
  acceptanceRate: number;
  revenuePerShown: number;
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

function normalizePhone(value: unknown) {
  return String(value ?? "").replace(/[^\d+]/g, "").trim();
}

function textIncludesAny(value: string, terms: string[]) {
  const haystack = value.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function isOptionalOption(option: AttachedModifierOption) {
  return !option.groupRequired && option.minSelect <= 0;
}

function suggestionResponse(row: {
  id: string;
  suggestion_type: string;
  reason: string | null;
  price_delta: number | string | null;
  modifier_group_id: string | null;
  modifier_option_id: string | null;
  metadata: Record<string, unknown> | null;
}) {
  const metadata = row.metadata || {};

  return {
    suggestion: {
      id: row.id,
      suggestionType: row.suggestion_type,
      title: String(metadata.title || "Recommended add-on"),
      message: String(metadata.message || row.reason || "Add this option?"),
      reason: row.reason,
      itemId: String(metadata.itemId || ""),
      modifierGroupId: row.modifier_group_id,
      modifierOptionId: row.modifier_option_id,
      groupName: String(metadata.groupName || ""),
      optionName: String(metadata.optionName || ""),
      priceDelta: toNumber(row.price_delta),
    },
  };
}

async function loadAttachedOptions(args: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  restaurantId: string;
  itemId: string;
}) {
  const { admin, restaurantId, itemId } = args;

  const { data: item, error: itemError } = await admin
    .schema("food_ordering")
    .from("menu_items")
    .select(
      `
      id,
      name,
      category_id,
      menu_categories!inner (
        id,
        name,
        menu_id,
        menus!inner (
          id,
          restaurant_id
        )
      )
    `
    )
    .eq("id", itemId)
    .eq("menu_categories.menus.restaurant_id", restaurantId)
    .maybeSingle();

  if (itemError || !item) {
    return { item: null, options: [] as AttachedModifierOption[] };
  }

  const { data: links, error: linksError } = await admin
    .schema("food_ordering")
    .from("menu_item_modifier_groups")
    .select("modifier_group_id")
    .eq("menu_item_id", itemId);

  if (linksError) {
    throw new Error(`Failed to load item modifier groups: ${linksError.message}`);
  }

  const groupIds = Array.from(
    new Set((links || []).map((link) => String(link.modifier_group_id || "")).filter(Boolean))
  );

  if (!groupIds.length) {
    return { item, options: [] as AttachedModifierOption[] };
  }

  const [{ data: groups, error: groupsError }, { data: options, error: optionsError }] =
    await Promise.all([
      admin
        .schema("food_ordering")
        .from("modifier_groups")
        .select("*")
        .in("id", groupIds),
      admin
        .schema("food_ordering")
        .from("modifier_group_options")
        .select("*")
        .in("modifier_group_id", groupIds),
    ]);

  if (groupsError) {
    throw new Error(`Failed to load modifier groups: ${groupsError.message}`);
  }

  if (optionsError) {
    throw new Error(`Failed to load modifier options: ${optionsError.message}`);
  }

  const groupsById = new Map(
    (groups || [])
      .filter((group) => group?.is_active !== false)
      .map((group) => [String(group.id), group])
  );

  const attachedOptions = (options || [])
    .filter((option) => option?.is_active !== false)
    .map((option): AttachedModifierOption | null => {
      const group = groupsById.get(String(option.modifier_group_id || ""));
      if (!group) return null;

      const required = Boolean(group.is_required ?? group.required ?? false);
      const minSelect = Math.max(
        Number(group.min_selections ?? group.min_select ?? (required ? 1 : 0)),
        required ? 1 : 0
      );
      const maxSelect =
        group.max_selections === null || group.max_selections === undefined
          ? group.selection_mode === "single"
            ? 1
            : null
          : Number(group.max_selections);

      return {
        groupId: String(group.id),
        groupName: String(group.name || "Modifier"),
        optionId: String(option.id),
        optionName: String(option.name || "Option"),
        description: option.description ?? null,
        price: toNumber(option.price_delta),
        groupRequired: required,
        minSelect,
        maxSelect: Number.isFinite(maxSelect) ? maxSelect : null,
        selectionMode: group.selection_mode ?? null,
      };
    })
    .filter((option): option is AttachedModifierOption => option !== null);

  return { item, options: attachedOptions };
}

async function findPastOrderSuggestion(args: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  restaurantId: string;
  customerPhone: string;
  itemId: string;
  options: AttachedModifierOption[];
}) {
  const phone = normalizePhone(args.customerPhone);
  if (!phone) return null;

  const { data: customers } = await args.admin
    .schema("food_ordering")
    .from("customers")
    .select("id")
    .eq("restaurant_id", args.restaurantId)
    .eq("phone", phone)
    .limit(5);

  const customerIds = (customers || []).map((customer) => String(customer.id));
  if (!customerIds.length) return null;

  const { data: orders } = await args.admin
    .schema("food_ordering")
    .from("orders")
    .select("id")
    .eq("restaurant_id", args.restaurantId)
    .in("customer_id", customerIds)
    .order("created_at", { ascending: false })
    .limit(25);

  const orderIds = (orders || []).map((order) => String(order.id));
  if (!orderIds.length) return null;

  const { data: orderItems } = await args.admin
    .schema("food_ordering")
    .from("order_items")
    .select("id")
    .in("order_id", orderIds)
    .eq("menu_item_id", args.itemId)
    .limit(50);

  const orderItemIds = (orderItems || []).map((item) => String(item.id));
  if (!orderItemIds.length) return null;

  const { data: selections } = await args.admin
    .schema("food_ordering")
    .from("order_item_modifier_selections")
    .select("modifier_option_id, group_name, option_name")
    .in("order_item_id", orderItemIds);

  const counts = new Map<string, number>();
  for (const selection of selections || []) {
    const modifierOptionId = String(selection.modifier_option_id || "").trim();
    const matchById = modifierOptionId
      ? args.options.find((option) => option.optionId === modifierOptionId)
      : null;

    const match =
      matchById ||
      (() => {
        const groupName = String(selection.group_name || "").trim().toLowerCase();
        const optionName = String(selection.option_name || "").trim().toLowerCase();
        return args.options.find(
          (option) =>
            option.groupName.toLowerCase() === groupName &&
            option.optionName.toLowerCase() === optionName
        );
      })();

    if (!match || !isOptionalOption(match)) continue;
    counts.set(match.optionId, (counts.get(match.optionId) || 0) + 1);
  }

  const [optionId] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || [];
  return optionId ? args.options.find((option) => option.optionId === optionId) || null : null;
}

function pickHeuristicSuggestion(args: {
  itemName: string;
  categoryName: string;
  options: AttachedModifierOption[];
  cartSubtotal: number;
}) {
  const optionalOptions = args.options.filter(isOptionalOption);
  if (!optionalOptions.length) return null;

  const itemText = `${args.itemName} ${args.categoryName}`.toLowerCase();
  const optionText = (option: AttachedModifierOption) =>
    `${option.groupName} ${option.optionName} ${option.description || ""}`.toLowerCase();

  if (itemText.includes("pizza")) {
    const pizzaSuggestion = optionalOptions.find((option) =>
      textIncludesAny(optionText(option), ["combo", "premium", "extra cheese", "topping"])
    );
    if (pizzaSuggestion) return pizzaSuggestion;
  }

  if (args.cartSubtotal > 20) {
    const paidOptions = optionalOptions.filter((option) => option.price > 0);
    if (paidOptions.length) {
      return [...paidOptions].sort((a, b) => b.price - a.price)[0];
    }
  }

  return optionalOptions.find((option) => option.price > 0) || optionalOptions[0] || null;
}

async function pickOptimizedSuggestion(args: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  restaurantId: string;
  itemId: string;
  options: AttachedModifierOption[];
}): Promise<OptionOptimizationStats | null> {
  const optionalOptions = args.options.filter(isOptionalOption);
  if (!optionalOptions.length) return null;

  const optionsById = new Map(optionalOptions.map((option) => [option.optionId, option]));

  const { data, error } = await args.admin
    .from("agent_modifier_suggestions")
    .select("modifier_option_id, status, price_delta")
    .eq("restaurant_id", args.restaurantId)
    .eq("item_id", args.itemId)
    .in("modifier_option_id", [...optionsById.keys()]);

  if (error) {
    console.error("modifier_suggestion_optimization_query_failed", {
      restaurantId: args.restaurantId,
      itemId: args.itemId,
      error: error.message,
    });
    return null;
  }

  const statsByOptionId = new Map<string, OptionOptimizationStats>();

  for (const option of optionalOptions) {
    statsByOptionId.set(option.optionId, {
      option,
      shownCount: 0,
      acceptedCount: 0,
      skippedCount: 0,
      revenueAdded: 0,
      acceptanceRate: 0,
      revenuePerShown: 0,
    });
  }

  for (const row of data || []) {
    const optionId = String(row.modifier_option_id || "");
    const stats = statsByOptionId.get(optionId);
    if (!stats) continue;

    const status = String(row.status || "").trim().toLowerCase();
    stats.shownCount += 1;

    if (status === "accepted") {
      stats.acceptedCount += 1;
      stats.revenueAdded += toNumber(row.price_delta);
    }

    if (status === "skipped") {
      stats.skippedCount += 1;
    }
  }

  const eligible = [...statsByOptionId.values()]
    .map((stats) => {
      const acceptanceRate =
        stats.shownCount > 0 ? stats.acceptedCount / stats.shownCount : 0;
      const revenuePerShown =
        stats.shownCount > 0 ? stats.revenueAdded / stats.shownCount : 0;

      return {
        ...stats,
        acceptanceRate,
        revenuePerShown,
      };
    })
    .filter(
      (stats) => stats.shownCount >= 20 && stats.acceptanceRate >= 0.1
    );

  if (!eligible.length) return null;

  return eligible.sort((a, b) => {
    if (b.revenuePerShown !== a.revenuePerShown) {
      return b.revenuePerShown - a.revenuePerShown;
    }
    if (b.acceptanceRate !== a.acceptanceRate) {
      return b.acceptanceRate - a.acceptanceRate;
    }
    return b.shownCount - a.shownCount;
  })[0];
}

export async function POST(request: Request) {
  const admin = createSupabaseAdminClient();

  try {
    const body = (await request.json()) as ModifierSuggestionRequest;
    const restaurantSlug = String(body.restaurantSlug || "").trim().toLowerCase();
    const itemId = String(body.itemId || "").trim();

    if (!restaurantSlug || !itemId) {
      return jsonNoStore({ suggestion: null }, { status: 400 });
    }

    const { data: restaurant, error: restaurantError } = await admin
      .schema("food_ordering")
      .from("restaurants")
      .select("id, slug")
      .eq("slug", restaurantSlug)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      return jsonNoStore({ suggestion: null }, { status: 404 });
    }

    const { item, options } = await loadAttachedOptions({
      admin,
      restaurantId: restaurant.id,
      itemId,
    });

    if (!item || !options.length) {
      return jsonNoStore({ suggestion: null });
    }

    const itemRecord = item as {
      name?: string | null;
      menu_categories?: { name?: string | null } | Array<{ name?: string | null }> | null;
    };
    const itemName = String(itemRecord.name || "");
    const categoryName = Array.isArray(itemRecord.menu_categories)
      ? String(itemRecord.menu_categories[0]?.name || "")
      : String(itemRecord.menu_categories?.name || "");
    const cartSubtotal = toNumber(body.context?.cartSubtotal);
    let suggestionType = "optional_add_on";
    let reason = "Optional add-on available for this item.";
    let optimization: Record<string, number> | null = null;

    let selected = await findPastOrderSuggestion({
      admin,
      restaurantId: restaurant.id,
      customerPhone: body.customerPhone || "",
      itemId,
      options,
    });

    if (selected) {
      suggestionType = "past_order_modifier";
      reason = "You have ordered this add-on before.";
    } else {
      const optimized = await pickOptimizedSuggestion({
        admin,
        restaurantId: restaurant.id,
        itemId,
        options,
      });

      if (optimized) {
        selected = optimized.option;
        suggestionType = "optimized_modifier";
        reason = "This add-on has performed well for similar orders.";
        optimization = {
          shownCount: optimized.shownCount,
          acceptedCount: optimized.acceptedCount,
          acceptanceRate: optimized.acceptanceRate,
          revenuePerShown: optimized.revenuePerShown,
        };
      } else {
        selected = pickHeuristicSuggestion({
          itemName,
          categoryName,
          options,
          cartSubtotal,
        });

        if (selected && itemName.toLowerCase().includes("pizza")) {
          suggestionType = "pizza_add_on";
          reason = "This add-on pairs well with pizza.";
        } else if (selected && cartSubtotal > 20 && selected.price > 0) {
          suggestionType = "premium_add_on";
          reason = "A premium add-on is available for this order.";
        }
      }
    }

    if (!selected) {
      return jsonNoStore({ suggestion: null });
    }

    const metadata = {
      itemId,
      itemName,
      groupName: selected.groupName,
      optionName: selected.optionName,
      entryChannel: body.entryChannel || null,
      orderType: body.context?.orderType || null,
      title: "Recommended add-on",
      message: `${selected.optionName} is available for ${itemName}.`,
      optimization,
    };

    const { data: row, error: insertError } = await admin
      .from("agent_modifier_suggestions")
      .insert({
        restaurant_id: restaurant.id,
        customer_id: null,
        cart_id: body.cartId ? String(body.cartId) : null,
        item_id: itemId,
        modifier_group_id: selected.groupId,
        modifier_option_id: selected.optionId,
        suggestion_type: suggestionType,
        reason,
        status: "shown",
        price_delta: selected.price,
        metadata,
      })
      .select(
        "id, suggestion_type, reason, price_delta, modifier_group_id, modifier_option_id, metadata"
      )
      .single();

    if (insertError || !row) {
      console.error("modifier_suggestion_insert_failed", insertError);
      return jsonNoStore({ suggestion: null });
    }

    return jsonNoStore(suggestionResponse(row));
  } catch (error) {
    console.error("modifier_suggestion_failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return jsonNoStore({ suggestion: null });
  }
}
