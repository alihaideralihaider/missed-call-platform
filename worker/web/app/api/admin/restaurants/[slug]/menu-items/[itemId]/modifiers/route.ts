import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ slug: string; itemId: string }>;
};

type CreateGroupBody = {
  action: "create_group";
  name?: string;
  description?: string | null;
  required?: boolean;
  minSelect?: number | string | null;
  maxSelect?: number | string | null;
  options?: Array<{
    name?: string;
    price?: number | string;
  }>;
};

type AttachGroupBody = {
  action: "attach_group";
  groupId?: string;
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function loadRestaurantAndItem(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  slug: string,
  itemId: string
) {
  const { data: restaurant, error: restaurantError } = await admin
    .schema("food_ordering")
    .from("restaurants")
    .select("id, slug")
    .eq("slug", slug)
    .single();

  if (restaurantError || !restaurant) {
    throw new Error("Restaurant not found.");
  }

  const { data: item, error: itemError } = await admin
    .schema("food_ordering")
    .from("menu_items")
    .select(
      `
      id,
      category_id,
      menu_categories!inner (
        id,
        menu_id,
        menus!inner (
          id,
          restaurant_id
        )
      )
    `
    )
    .eq("id", itemId)
    .eq("menu_categories.menus.restaurant_id", restaurant.id)
    .single();

  if (itemError || !item) {
    throw new Error("Menu item not found for this restaurant.");
  }

  return {
    restaurant,
    item,
  };
}

async function getNextLinkSortOrder(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  itemId: string
) {
  const { data, error } = await admin
    .schema("food_ordering")
    .from("menu_item_modifier_groups")
    .select("sort_order")
    .eq("menu_item_id", itemId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to determine modifier sort order: ${error.message}`);
  }

  return typeof data?.sort_order === "number" ? data.sort_order + 1 : 0;
}

async function insertModifierGroup(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  restaurantId: string,
  payload: {
    name: string;
    description?: string | null;
    required: boolean;
    minSelect: number;
    maxSelect: number;
  }
) {
  const { data, error } = await admin
    .schema("food_ordering")
    .from("modifier_groups")
    .insert({
      restaurant_id: restaurantId,
      name: payload.name,
      description: payload.description ?? null,
      is_required: payload.required,
      selection_mode: payload.maxSelect > 1 ? "multi" : "single",
      min_selections: payload.minSelect,
      max_selections: payload.maxSelect,
      is_active: true,
    })
    .select("id")
    .single();

  if (!error && data?.id) {
    return data.id as string;
  }

  throw new Error(error?.message || "Failed to create modifier group.");
}

async function insertModifierOption(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  payload: {
    modifierGroupId: string;
    name: string;
    price: number;
    sortOrder: number;
  }
) {
  const { error } = await admin
    .schema("food_ordering")
    .from("modifier_group_options")
    .insert({
      modifier_group_id: payload.modifierGroupId,
      name: payload.name,
      price_delta: payload.price,
      sort_order: payload.sortOrder,
      is_active: true,
    });

  if (!error) {
    return;
  }

  throw new Error(error.message || "Failed to create modifier option.");
}

async function attachGroupToItem(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  itemId: string,
  groupId: string
) {
  const { data: existingLink, error: existingLinkError } = await admin
    .schema("food_ordering")
    .from("menu_item_modifier_groups")
    .select("menu_item_id")
    .eq("menu_item_id", itemId)
    .eq("modifier_group_id", groupId)
    .maybeSingle();

  if (existingLinkError) {
    throw new Error(`Failed to check existing modifier link: ${existingLinkError.message}`);
  }

  if (existingLink) {
    return;
  }

  const nextSortOrder = await getNextLinkSortOrder(admin, itemId);
  const { error: attachError } = await admin
    .schema("food_ordering")
    .from("menu_item_modifier_groups")
    .insert({
      menu_item_id: itemId,
      modifier_group_id: groupId,
      sort_order: nextSortOrder,
    });

  if (attachError) {
    throw new Error(`Failed to attach modifier group: ${attachError.message}`);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const admin = createSupabaseAdminClient();

  try {
    const { slug, itemId } = await context.params;
    const body = (await request.json()) as CreateGroupBody | AttachGroupBody;
    const { restaurant } = await loadRestaurantAndItem(admin, slug, itemId);

    if (body.action === "create_group") {
      const name = String(body.name || "").trim();
      const description = String(body.description || "").trim();
      const required = body.required === true;
      const minSelect = Math.max(
        required ? 1 : 0,
        Math.floor(toNumber(body.minSelect))
      );
      const maxSelectRaw =
        body.maxSelect === null || body.maxSelect === undefined || body.maxSelect === ""
          ? null
          : Math.floor(toNumber(body.maxSelect));
      const maxSelect = Math.max(1, maxSelectRaw ?? 1);
      const options = Array.isArray(body.options)
        ? body.options
            .map((option) => ({
              name: String(option?.name || "").trim(),
              price: roundMoney(toNumber(option?.price)),
            }))
            .filter((option) => option.name)
        : [];

      if (!name) {
        return NextResponse.json(
          { error: "Modifier group name is required." },
          { status: 400 }
        );
      }

      if (options.length === 0) {
        return NextResponse.json(
          { error: "Add at least one modifier option." },
          { status: 400 }
        );
      }

      if (maxSelect < Math.max(1, minSelect)) {
        return NextResponse.json(
          { error: "Max select must be greater than or equal to min select." },
          { status: 400 }
        );
      }

      const groupId = await insertModifierGroup(admin, restaurant.id, {
        name,
        description: description || null,
        required,
        minSelect,
        maxSelect,
      });

      for (const [index, option] of options.entries()) {
        await insertModifierOption(admin, {
          modifierGroupId: groupId,
          name: option.name,
          price: option.price,
          sortOrder: index,
        });
      }

      await attachGroupToItem(admin, itemId, groupId);

      return NextResponse.json({ success: true, groupId });
    }

    if (body.action === "attach_group") {
      const groupId = String(body.groupId || "").trim();

      if (!groupId) {
        return NextResponse.json(
          { error: "Modifier group is required." },
          { status: 400 }
        );
      }

      const { data: group, error: groupError } = await admin
        .schema("food_ordering")
        .from("modifier_groups")
        .select("id")
        .eq("id", groupId)
        .maybeSingle();

      if (groupError || !group) {
        return NextResponse.json(
          { error: "Modifier group not found." },
          { status: 404 }
        );
      }

      await attachGroupToItem(admin, itemId, groupId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Unsupported action." },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "POST /api/admin/restaurants/[slug]/menu-items/[itemId]/modifiers failed:",
      error
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
