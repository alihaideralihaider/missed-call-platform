import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

type ModifierOption = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sort_order: number;
};

type ModifierGroup = {
  id: string;
  name: string;
  description: string | null;
  required: boolean;
  min_select: number;
  max_select: number | null;
  selection_mode?: string | null;
  sort_order: number;
  options: ModifierOption[];
};

export async function GET(_: Request, context: RouteContext) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { slug } = await context.params;

    const { data: restaurant, error: restaurantError } = await supabase
      .schema("food_ordering")
      .from("restaurants")
      .select("id, name, slug")
      .eq("slug", slug)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const { data: menu, error: menuError } = await supabase
      .schema("food_ordering")
      .from("menus")
      .select("id, name")
      .eq("restaurant_id", restaurant.id)
      .eq("name", "Main Menu")
      .single();

    if (menuError || !menu) {
      return NextResponse.json(
        { error: "Menu not found" },
        { status: 404 }
      );
    }

    const { data: categories, error: categoriesError } = await supabase
      .schema("food_ordering")
      .from("menu_categories")
      .select("id, name, sort_order")
      .eq("menu_id", menu.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (categoriesError) {
      throw new Error(categoriesError.message);
    }

    const categoryIds = (categories || []).map((category) => category.id);

    let items: Array<{
      id: string;
      category_id: string;
      name: string;
      description: string | null;
      price: number;
      sort_order: number | null;
      is_sold_out: boolean;
      image_url: string | null;
      modifier_groups: ModifierGroup[];
    }> = [];
    let modifierGroups: ModifierGroup[] = [];

    if (categoryIds.length > 0) {
      const { data: itemRows, error: itemsError } = await supabase
        .schema("food_ordering")
        .from("menu_items")
        .select(
          "id, category_id, name, description, price, sort_order, is_sold_out, image_url"
        )
        .in("category_id", categoryIds)
        .order("sort_order", { ascending: true });

      if (itemsError) {
        throw new Error(itemsError.message);
      }

      items =
        itemRows?.map((item) => ({
          id: item.id,
          category_id: item.category_id,
          name: item.name,
          description: item.description,
          price: Number(item.price ?? 0),
          sort_order: item.sort_order,
          is_sold_out: item.is_sold_out ?? false,
          image_url: item.image_url ?? null,
          modifier_groups: [],
        })) || [];

      const itemIds = items.map((item) => item.id);

      if (itemIds.length > 0) {
        const { data: menuItemModifierGroups, error: linksError } = await supabase
          .schema("food_ordering")
          .from("menu_item_modifier_groups")
          .select("menu_item_id, modifier_group_id, sort_order")
          .in("menu_item_id", itemIds);

        if (linksError) {
          throw new Error(linksError.message);
        }

        const links = menuItemModifierGroups || [];
        const modifierGroupIds = Array.from(
          new Set(links.map((link) => String(link.modifier_group_id || "")).filter(Boolean))
        );

        if (modifierGroupIds.length > 0) {
          const [{ data: groupRows, error: groupsError }, { data: optionRows, error: optionsError }] =
            await Promise.all([
              supabase
                .schema("food_ordering")
                .from("modifier_groups")
                .select("*")
                .in("id", modifierGroupIds),
              supabase
                .schema("food_ordering")
                .from("modifier_group_options")
                .select("*")
                .in("modifier_group_id", modifierGroupIds),
            ]);

          if (groupsError) {
            throw new Error(groupsError.message);
          }

          if (optionsError) {
            throw new Error(optionsError.message);
          }

          const optionsByGroupId = new Map<string, ModifierOption[]>();

          for (const option of optionRows || []) {
            if (option?.is_active === false) continue;

            const groupId = String(option.modifier_group_id || "");
            if (!groupId) continue;

            const existing = optionsByGroupId.get(groupId) || [];
            existing.push({
              id: option.id,
              name: option.name ?? "",
              description: option.description ?? null,
              price: Number(option.price_delta ?? 0),
              sort_order: Number(option.sort_order || 0),
            });
            optionsByGroupId.set(groupId, existing);
          }

          const groupsById = new Map<string, ModifierGroup>();

          for (const group of groupRows || []) {
            if (group?.is_active === false) continue;

            groupsById.set(String(group.id), {
              id: group.id,
              name: group.name ?? "",
              description: group.description ?? null,
              required: Boolean(group.is_required ?? false),
              min_select: Number(group.min_selections ?? 0),
              max_select:
                group.max_selections === null || group.max_selections === undefined
                  ? null
                  : Number(group.max_selections),
              selection_mode: group.selection_mode ?? null,
              sort_order: Number(group.sort_order || 0),
              options: (optionsByGroupId.get(String(group.id)) || []).sort(
                (a, b) => a.sort_order - b.sort_order
              ),
            });
          }

          const modifierGroupsByItemId = new Map<string, ModifierGroup[]>();

          for (const link of links) {
            const group = groupsById.get(String(link.modifier_group_id || ""));
            if (!group) continue;

            const existing = modifierGroupsByItemId.get(String(link.menu_item_id)) || [];
            existing.push({
              ...group,
              sort_order:
                link.sort_order === null || link.sort_order === undefined
                  ? group.sort_order
                  : Number(link.sort_order),
            });
            modifierGroupsByItemId.set(String(link.menu_item_id), existing);
          }

          items = items.map((item) => ({
            ...item,
            modifier_groups: (modifierGroupsByItemId.get(item.id) || []).sort(
              (a, b) => a.sort_order - b.sort_order
            ),
          }));

          modifierGroups = Array.from(groupsById.values()).sort(
            (a, b) => a.name.localeCompare(b.name)
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      restaurant,
      menu,
      categories: categories || [],
      items,
      modifierGroups,
    });
  } catch (error) {
    console.error("GET /api/admin/restaurants/[slug]/menu failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
