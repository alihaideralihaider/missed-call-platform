"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import StickyCartBar from "@/components/storefront/StickyCartBar";
import {
  addToCart,
  syncCartWithMenu,
  type CartModifierSelection,
} from "@/lib/cart";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  is_sold_out?: boolean;
  image_url?: string | null;
  description?: string | null;
  base_price?: number | null;
  compare_at_price?: number | null;
  is_featured?: boolean;
  order_count?: number | null;
  last_ordered_at?: string | null;
  category_name?: string | null;
  modifier_groups?: ModifierGroup[];
};

type ModifierOption = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  sort_order?: number | null;
};

type ModifierGroup = {
  id: string;
  name: string;
  description?: string | null;
  required?: boolean;
  min_select?: number | null;
  max_select?: number | null;
  min_selections?: number | null;
  max_selections?: number | null;
  selection_mode?: string | null;
  sort_order?: number | null;
  options: ModifierOption[];
};

type Promotion = {
  id: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  image_url?: string | null;
};

type Props = {
  items: MenuItem[];
  restaurantName: string;
  restaurantAddress?: string | null;
  hasVibeUpgrade: boolean;
  hasMenuUpgrade: boolean;
  vibeImageUrl: string | null;
  hasPromotions?: boolean;
  promotions?: Promotion[];
  isOpen?: boolean;
  closingSoon?: boolean;
  closesAtText?: string | null;
  nextOpenText?: string | null;
  statusText?: string | null;
};

function cleanSlug(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  return s && s !== "undefined" && s !== "null" ? s : "";
}

function formatPrice(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getReferencePrice(item: MenuItem): number | null {
  const compareAt = Number(item.compare_at_price);
  const basePrice = Number(item.base_price);

  if (Number.isFinite(compareAt) && compareAt > item.price) {
    return compareAt;
  }

  if (Number.isFinite(basePrice) && basePrice > item.price) {
    return basePrice;
  }

  return null;
}

function hasPriceDeal(item: MenuItem): boolean {
  return getReferencePrice(item) !== null;
}

function truncateText(text: string | null | undefined, maxLength = 50) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength).trimEnd() + "...";
}

function hasDisplayImage(imageUrl: string | null | undefined) {
  const value = String(imageUrl ?? "").trim();
  return Boolean(value && value !== "null" && value !== "undefined");
}

function makeCategoryId(categoryName: string) {
  return `menu-category-${categoryName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

function normalizeModifierGroup(group: ModifierGroup): ModifierGroup {
  const minSelect = Math.max(
    Number(group.min_selections ?? group.min_select ?? (group.required ? 1 : 0)),
    group.required ? 1 : 0
  );
  const maxSelectSource =
    group.max_selections ?? group.max_select ?? (group.selection_mode === "single" ? 1 : group.options.length);
  const maxSelect = Math.max(1, Math.min(Number(maxSelectSource), group.options.length));

  return {
    ...group,
    required: Boolean(group.required),
    min_select: minSelect,
    max_select: maxSelect,
    min_selections: minSelect,
    max_selections: maxSelect,
    selection_mode:
      group.selection_mode || (maxSelect <= 1 ? "single" : "multi"),
    options: [...(group.options || [])].sort(
      (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)
    ),
  };
}

function isSingleSelectGroup(group: ModifierGroup) {
  return group.selection_mode === "single";
}

function getItemModifierGroups(item: MenuItem) {
  if (!Array.isArray(item.modifier_groups)) {
    return [];
  }

  return item.modifier_groups
    .filter((group) => group && Array.isArray(group.options) && group.options.length > 0)
    .map(normalizeModifierGroup);
}

function itemHasModifiers(item: MenuItem) {
  return getItemModifierGroups(item).length > 0;
}

export default function RestaurantMenuClient({
  items,
  restaurantName,
  restaurantAddress = null,
  hasVibeUpgrade,
  hasMenuUpgrade,
  vibeImageUrl,
  hasPromotions = false,
  promotions = [],
  isOpen = true,
  closingSoon = false,
  closesAtText = null,
  nextOpenText = null,
  statusText = null,
}: Props) {
  const params = useParams<{ slug: string }>();
  const safeSlug = cleanSlug(params?.slug);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [selectedOptionsByGroup, setSelectedOptionsByGroup] = useState<
    Record<string, string[]>
  >({});
  const [modifierError, setModifierError] = useState("");

  const safeItems = useMemo(() => {
    return Array.isArray(items) ? items : [];
  }, [items]);

  useEffect(() => {
    if (!safeSlug || !safeItems.length) return;
    syncCartWithMenu(safeSlug, safeItems);
  }, [safeSlug, safeItems]);

  const popularItems = useMemo(() => {
    return [...safeItems]
      .sort((a, b) => {
        const aFeatured = a.is_featured ? 1 : 0;
        const bFeatured = b.is_featured ? 1 : 0;

        if (bFeatured !== aFeatured) {
          return bFeatured - aFeatured;
        }

        const aOrders = Number(a.order_count || 0);
        const bOrders = Number(b.order_count || 0);

        if (bOrders !== aOrders) {
          return bOrders - aOrders;
        }

        const aLastOrdered = a.last_ordered_at
          ? new Date(a.last_ordered_at).getTime()
          : 0;
        const bLastOrdered = b.last_ordered_at
          ? new Date(b.last_ordered_at).getTime()
          : 0;

        return bLastOrdered - aLastOrdered;
      })
      .slice(0, 6);
  }, [safeItems]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const values: string[] = [];

    for (const item of safeItems) {
      const name = String(item.category_name || "").trim();
      if (!name) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      values.push(name);
    }

    return values;
  }, [safeItems]);

  const itemsByCategory = useMemo(() => {
    const grouped = new Map<string, MenuItem[]>();

    for (const item of safeItems) {
      const categoryName = String(item.category_name || "Menu").trim() || "Menu";
      const current = grouped.get(categoryName) || [];
      current.push(item);
      grouped.set(categoryName, current);
    }

    return grouped;
  }, [safeItems]);

  const showVibeHero = Boolean(hasVibeUpgrade && vibeImageUrl);
  const showPromotions = Boolean(hasPromotions && promotions.length > 0);
  const activeItemModifierGroups = useMemo(
    () => (activeItem ? getItemModifierGroups(activeItem) : []),
    [activeItem]
  );
  const selectedModifierEntries = useMemo(() => {
    if (!activeItem) return [];

    const groups = getItemModifierGroups(activeItem);

    return groups.flatMap((group) =>
      (selectedOptionsByGroup[group.id] || [])
        .map((optionId) => {
          const option = group.options.find((entry) => entry.id === optionId);
          if (!option) return null;

          return {
            groupId: group.id,
            groupName: group.name,
            optionId: option.id,
            optionName: option.name,
            price: Number(option.price || 0),
          } satisfies CartModifierSelection;
        })
        .filter(
          (modifier): modifier is CartModifierSelection => modifier !== null
        )
    );
  }, [activeItem, selectedOptionsByGroup]);
  const activeItemTotal = useMemo(() => {
    if (!activeItem) return 0;

    const modifierTotal = selectedModifierEntries.reduce(
      (sum, modifier) => sum + Number(modifier.price || 0),
      0
    );

    return Number(activeItem.price || 0) + modifierTotal;
  }, [activeItem, selectedModifierEntries]);
  const selectedModifierSummary = useMemo(() => {
    if (selectedModifierEntries.length === 0) return "";
    return selectedModifierEntries.map((modifier) => modifier.optionName).join(", ");
  }, [selectedModifierEntries]);

  function canAddItem(item: MenuItem) {
    return Boolean(safeSlug && !item.is_sold_out && isOpen);
  }

  function addSimpleItem(item: MenuItem) {
    if (!canAddItem(item)) {
      if (!safeSlug) {
        console.error("Missing restaurant slug in RestaurantMenuClient");
      }
      return;
    }

    addToCart(safeSlug, {
      id: item.id,
      name: item.name,
      price: item.price,
      is_sold_out: item.is_sold_out,
    });
  }

  function openItemModal(item: MenuItem) {
    setActiveItem(item);
    setSelectedOptionsByGroup({});
    setModifierError("");
  }

  function closeItemModal() {
    setActiveItem(null);
    setSelectedOptionsByGroup({});
    setModifierError("");
  }

  function handleAddItem(item: MenuItem) {
    if (!canAddItem(item)) {
      if (!safeSlug) {
        console.error("Missing restaurant slug in RestaurantMenuClient");
      }
      return;
    }

    if (itemHasModifiers(item)) {
      openItemModal(item);
      return;
    }

    addSimpleItem(item);
  }

  function toggleModifierOption(group: ModifierGroup, option: ModifierOption) {
    setModifierError("");
    setSelectedOptionsByGroup((current) => {
      const selected = current[group.id] || [];
      const isSelected = selected.includes(option.id);
      const singleSelect = isSingleSelectGroup(group);
      const maxSelect = Number(group.max_select || group.options.length || 1);

      if (singleSelect) {
        return {
          ...current,
          [group.id]: isSelected ? [] : [option.id],
        };
      }

      if (isSelected) {
        return {
          ...current,
          [group.id]: selected.filter((entry) => entry !== option.id),
        };
      }

      if (selected.length >= maxSelect) {
        return current;
      }

      return {
        ...current,
        [group.id]: [...selected, option.id],
      };
    });
  }

  function validateActiveItemModifiers() {
    for (const group of activeItemModifierGroups) {
      const selected = selectedOptionsByGroup[group.id] || [];
      const minSelect = Number(group.min_select || 0);
      const maxSelect = Number(group.max_select || group.options.length || 1);

      if (selected.length < minSelect) {
        return `Select at least ${minSelect} option${minSelect > 1 ? "s" : ""} for ${group.name}.`;
      }

      if (selected.length > maxSelect) {
        return `Select no more than ${maxSelect} option${maxSelect > 1 ? "s" : ""} for ${group.name}.`;
      }
    }

    return "";
  }

  function handleAddActiveItem() {
    if (!activeItem || !canAddItem(activeItem)) return;

    const validationError = validateActiveItemModifiers();

    if (validationError) {
      setModifierError(validationError);
      return;
    }

    addToCart(safeSlug, {
      id: activeItem.id,
      name: activeItem.name,
      price: activeItemTotal,
      is_sold_out: activeItem.is_sold_out,
      modifiers: selectedModifierEntries,
    });

    closeItemModal();
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <main className="mx-auto min-h-screen max-w-md bg-white shadow-sm">
        <header className="border-b border-neutral-100 px-3 pb-2 pt-3 sm:px-4 sm:pb-3 sm:pt-4">
          {showVibeHero ? (
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl">
              <img
                src={vibeImageUrl!}
                alt={`${restaurantName} vibe`}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/20" />
              <div className="relative p-3 sm:p-4">
                <HeaderContent
                  restaurantName={restaurantName}
                  restaurantAddress={restaurantAddress}
                  isVibe
                  isOpen={isOpen}
                  closingSoon={closingSoon}
                  statusText={statusText}
                />
              </div>
            </div>
          ) : (
            <div>
              <HeaderContent
                restaurantName={restaurantName}
                restaurantAddress={restaurantAddress}
                isOpen={isOpen}
                closingSoon={closingSoon}
                statusText={statusText}
              />
            </div>
          )}

          {!isOpen ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 sm:mt-4 sm:rounded-2xl sm:px-4 sm:py-3">
              <p className="text-sm font-semibold text-red-700">
                Store is currently closed
              </p>
              <p className="mt-1 text-xs text-red-600">
                {nextOpenText ||
                  "You can browse the menu, but ordering is unavailable right now."}
              </p>
            </div>
          ) : null}

          {isOpen && closingSoon && closesAtText ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 sm:mt-4 sm:rounded-2xl sm:px-4 sm:py-3">
              <p className="text-sm font-semibold text-amber-800">
                Closing soon
              </p>
              <p className="mt-1 text-xs text-amber-700">
                Orders are currently open. Store closes at {closesAtText}.
              </p>
            </div>
          ) : null}

          <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 sm:mt-4 sm:rounded-2xl sm:px-4 sm:py-3">
            <p className="text-[11px] leading-4 text-neutral-600 sm:text-xs sm:leading-5">
              SMS order updates are available at checkout.
            </p>
          </div>
        </header>

        <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
          <div className="overflow-x-auto">
            <div className="flex gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
              {showPromotions ? (
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("promotions-section")
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                  }
                  className="whitespace-nowrap rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 sm:px-4 sm:py-2 sm:text-sm"
                >
                  Promotions
                </button>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  document.getElementById("popular-section")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
                className="whitespace-nowrap rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 sm:px-4 sm:py-2 sm:text-sm"
              >
                Popular
              </button>

              <button
                type="button"
                onClick={() =>
                  document.getElementById("menu-section")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
                className="whitespace-nowrap rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 sm:px-4 sm:py-2 sm:text-sm"
              >
                Menu
              </button>
            </div>
          </div>
        </div>

        <div className="pb-28">
          {showPromotions ? (
            <section
              id="promotions-section"
              className="scroll-mt-36 border-b border-neutral-100 px-4 py-4"
            >
              <h2 className="text-lg font-semibold text-neutral-900">
                Promotions
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Special offers and featured deals
              </p>

              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {promotions.map((promo) => (
                  <div
                    key={promo.id}
                    className="w-[280px] shrink-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
                  >
                    <div className="relative h-16 w-full bg-neutral-100">
                      {promo.image_url ? (
                        <img
                          src={promo.image_url}
                          alt={promo.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs font-medium text-neutral-400">
                          Promotion image
                        </div>
                      )}

                      {promo.badge ? (
                        <span className="absolute left-3 top-3 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                          {promo.badge}
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0 p-4">
                      <p className="truncate text-base font-semibold text-neutral-900">
                        {promo.title}
                      </p>
                      {promo.subtitle ? (
                        <p className="mt-1 truncate text-sm text-neutral-500">
                          {promo.subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section
            id="popular-section"
            className="scroll-mt-36 border-b border-neutral-100 px-4 py-4"
          >
            <h2 className="text-lg font-semibold text-neutral-900">Popular</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Quick picks for fast ordering
            </p>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {popularItems.map((item) => {
                const referencePrice = getReferencePrice(item);
                const showDeal = hasPriceDeal(item);

                return (
                  <div key={`popular-wrap-${item.id}`} className="w-[200px] shrink-0">
                    <div
                      role="button"
                      tabIndex={canAddItem(item) ? 0 : -1}
                      aria-disabled={!canAddItem(item)}
                      onClick={() => handleAddItem(item)}
                      onKeyDown={(event) => {
                        if (!canAddItem(item)) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleAddItem(item);
                        }
                      }}
                      className={`w-full overflow-hidden rounded-2xl border text-left shadow-sm transition ${
                        canAddItem(item)
                          ? "cursor-pointer border-neutral-200 bg-white active:scale-[0.99]"
                          : "cursor-not-allowed border-neutral-200 bg-neutral-100 opacity-60"
                      }`}
                    >
                      <div className="relative h-24 bg-neutral-100">
                        {hasDisplayImage(item.image_url) ? (
                          <img
                            src={item.image_url!}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs font-medium text-neutral-400">
                            {hasMenuUpgrade ? "Menu image" : "Item image"}
                          </div>
                        )}

                        {item.is_featured ? (
                          <span className="absolute left-3 top-3 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                            Popular
                          </span>
                        ) : null}

                        {itemHasModifiers(item) ? (
                          <span className="absolute left-3 bottom-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-900">
                            Customize
                          </span>
                        ) : null}

                        <button
                          type="button"
                          disabled={!canAddItem(item)}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleAddItem(item);
                          }}
                          className={`absolute bottom-1 right-1 z-10 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-[0.98] ${
                            item.is_sold_out
                              ? "cursor-not-allowed bg-neutral-300 text-neutral-500"
                              : !isOpen
                              ? "cursor-not-allowed bg-neutral-300 text-neutral-500"
                              : "bg-neutral-900 text-white hover:bg-black"
                          }`}
                        >
                          {item.is_sold_out ? "Sold Out" : !isOpen ? "Closed" : "Add"}
                        </button>
                      </div>

                      <div className="min-w-0 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900">
                            {item.name}
                          </p>

                          <p className="shrink-0 text-sm font-semibold leading-none text-neutral-900">
                            {formatPrice(item.price)}
                          </p>
                        </div>

                        {item.description ? (
                          <p className="mt-1 truncate text-[11px] text-neutral-500">
                            {truncateText(item.description, 50)}
                          </p>
                        ) : null}

                        {item.is_sold_out ? (
                          <span className="mt-2 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            Sold Out
                          </span>
                        ) : null}

                        {!item.is_sold_out && !isOpen ? (
                          <span className="mt-2 inline-block rounded bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700">
                            Closed
                          </span>
                        ) : null}

                        {showDeal ? (
                          <span className="mt-2 inline-block rounded bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                            Deal
                          </span>
                        ) : null}

                        {referencePrice ? (
                          <p className="mt-2 text-[11px] text-neutral-400 line-through">
                            {formatPrice(referencePrice)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section id="menu-section" className="scroll-mt-36 px-4 py-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-neutral-900">Menu</h2>
              <p className="mt-1 text-sm text-neutral-500">
                {isOpen
                  ? closingSoon && closesAtText
                    ? `Closing soon • Closes at ${closesAtText}`
                    : "Tap add to build your order"
                  : nextOpenText || "Store is closed. Browse menu items for now"}
              </p>
            </div>

            {categories.length > 0 ? (
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      document.getElementById(makeCategoryId(category))?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                    }
                    className="whitespace-nowrap rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700"
                  >
                    {category}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="space-y-6">
              {(categories.length > 0 ? categories : ["Menu"]).map((category) => {
                const categoryItems = itemsByCategory.get(category) || [];

                if (categoryItems.length === 0) return null;

                return (
                  <div
                    key={category}
                    id={makeCategoryId(category)}
                    className="scroll-mt-40"
                  >
                    <div className="mb-3">
                      <h3 className="text-base font-semibold text-neutral-900">
                        {category}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {categoryItems.map((item) => {
                        const referencePrice = getReferencePrice(item);
                        const showDeal = hasPriceDeal(item);

                        return (
                          <div
                            role="button"
                            tabIndex={canAddItem(item) ? 0 : -1}
                            aria-disabled={!canAddItem(item)}
                            key={item.id}
                            onClick={() => handleAddItem(item)}
                            onKeyDown={(event) => {
                              if (!canAddItem(item)) return;
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleAddItem(item);
                              }
                            }}
                            className={`overflow-hidden rounded-2xl border shadow-sm ${
                              canAddItem(item)
                                ? "cursor-pointer border-neutral-200 bg-white"
                                : "cursor-not-allowed border-neutral-200 bg-neutral-100 opacity-70"
                            }`}
                          >
                            <div className="relative h-24 w-full bg-neutral-100">
                              {hasDisplayImage(item.image_url) ? (
                                <img
                                  src={item.image_url!}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs font-medium text-neutral-400">
                                  {hasMenuUpgrade ? "Menu image" : "Item image"}
                                </div>
                              )}

                              {item.is_featured ? (
                                <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                  Popular
                                </span>
                              ) : null}

                              {itemHasModifiers(item) ? (
                                <span className="absolute left-2 bottom-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-900">
                                  Customize
                                </span>
                              ) : null}

                              <button
                                type="button"
                                disabled={!canAddItem(item)}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleAddItem(item);
                                }}
                                className={`absolute bottom-1 right-1 z-10 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-[0.98] ${
                                  item.is_sold_out
                                    ? "cursor-not-allowed bg-neutral-300 text-neutral-500"
                                    : !isOpen
                                    ? "cursor-not-allowed bg-neutral-300 text-neutral-500"
                                    : "bg-neutral-900 text-white hover:bg-black"
                                }`}
                              >
                                {item.is_sold_out ? "Sold Out" : !isOpen ? "Closed" : "Add"}
                              </button>
                            </div>

                            <div className="px-3 pb-2.5 pt-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900">
                                  {item.name}
                                </p>

                                <p className="shrink-0 text-sm font-semibold text-neutral-900">
                                  {formatPrice(item.price)}
                                </p>
                              </div>

                              {referencePrice ? (
                                <p className="mt-0.5 text-[11px] text-neutral-400 line-through">
                                  {formatPrice(referencePrice)}
                                </p>
                              ) : null}

                              <div className="mt-1 h-[30px] overflow-hidden">
                                <p className="line-clamp-2 text-xs leading-[15px] text-neutral-500">
                                  {item.description || "Freshly prepared for pickup"}
                                </p>
                              </div>

                              {showDeal ? (
                                <span className="mt-2 inline-block rounded bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                                  Deal
                                </span>
                              ) : null}

                              {item.is_sold_out ? (
                                <span className="mt-2 ml-1 inline-block rounded bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                                  Sold Out
                                </span>
                              ) : null}

                              {!item.is_sold_out && !isOpen ? (
                                <span className="mt-2 ml-1 inline-block rounded bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-700">
                                  Closed
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {activeItem ? (
          <div className="fixed inset-0 z-50 flex items-end bg-black/45 sm:items-center sm:justify-center">
            <div className="relative z-10 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-md sm:rounded-[28px]">
              <div className="shrink-0">
                <div className="relative h-48 bg-neutral-100">
                  {hasDisplayImage(activeItem.image_url) ? (
                    <img
                      src={activeItem.image_url!}
                      alt={activeItem.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-neutral-400">
                      {hasMenuUpgrade ? "Menu image" : "Item image"}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={closeItemModal}
                    className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-900 shadow-sm"
                  >
                    Close
                  </button>
                </div>

                <div className="border-b border-neutral-200 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-semibold text-neutral-900">
                      {activeItem.name}
                    </h2>
                    <span className="shrink-0 text-base font-semibold text-neutral-900">
                      {formatPrice(activeItem.price)}
                    </span>
                  </div>
                  {activeItem.description ? (
                    <p className="mt-2 text-sm leading-6 text-neutral-500">
                      {activeItem.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="space-y-5">
                  {activeItemModifierGroups.map((group) => {
                    const selected = selectedOptionsByGroup[group.id] || [];
                    const singleSelect = group.selection_mode === "single";

                    return (
                      <div key={group.id} className="rounded-2xl border border-neutral-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-neutral-900">
                              {group.name}
                            </h3>
                            <p className="mt-1 text-xs text-neutral-500">
                              {group.required
                                ? `Required${group.min_select && group.min_select > 1 ? ` · Choose at least ${group.min_select}` : ""}`
                                : "Optional"}
                              {group.max_select && group.max_select > 1
                                ? ` · Choose up to ${group.max_select}`
                                : ""}
                            </p>
                          </div>
                        </div>

                        {group.description ? (
                          <p className="mt-2 text-xs text-neutral-500">
                            {group.description}
                          </p>
                        ) : null}

                        <div className="mt-3 space-y-2">
                          {group.options.map((option) => {
                            const checked = selected.includes(option.id);

                            return (
                              <label
                                key={option.id}
                                className={`flex cursor-pointer items-start justify-between gap-3 rounded-2xl border px-3 py-3 transition ${
                                  checked
                                    ? "border-neutral-900 bg-neutral-100"
                                    : "border-neutral-200 bg-white"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type={singleSelect ? "radio" : "checkbox"}
                                    name={`modifier-${group.id}`}
                                    checked={checked}
                                    onChange={() => toggleModifierOption(group, option)}
                                    className="mt-1"
                                  />
                                  <div>
                                    <p className="text-sm font-medium text-neutral-900">
                                      {option.name}
                                    </p>
                                    {option.description ? (
                                      <p className="mt-1 text-xs text-neutral-500">
                                        {option.description}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                                <span className="shrink-0 text-sm font-medium text-neutral-700">
                                  {option.price > 0 ? `+${formatPrice(option.price)}` : formatPrice(0)}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {modifierError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {modifierError}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="sticky bottom-0 border-t border-neutral-200 bg-white p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
                {selectedModifierSummary ? (
                  <div className="mb-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                    <span className="font-medium text-neutral-900">Selected:</span>{" "}
                    {selectedModifierSummary}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={handleAddActiveItem}
                  disabled={!canAddItem(activeItem)}
                  className="flex w-full items-center justify-center rounded-2xl bg-neutral-900 px-4 py-4 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    {activeItem.is_sold_out
                      ? "Sold Out"
                      : !isOpen
                        ? "Closed"
                        : `Add to order · ${formatPrice(activeItemTotal)}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <StickyCartBar slug={safeSlug} />
      </main>
    </div>
  );
}

function HeaderContent({
  restaurantName,
  restaurantAddress,
  isVibe,
  isOpen = true,
  closingSoon = false,
  statusText = null,
}: {
  restaurantName: string;
  restaurantAddress?: string | null;
  isVibe?: boolean;
  isOpen?: boolean;
  closingSoon?: boolean;
  statusText?: string | null;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-[10px] font-medium uppercase tracking-[0.18em] sm:text-xs sm:tracking-wide ${
              isVibe ? "text-white/80" : "text-neutral-500"
            }`}
          >
            Pickup only
          </p>
          <h1
            className={`mt-0.5 truncate text-xl font-bold tracking-tight sm:mt-1 sm:text-2xl ${
              isVibe ? "text-white" : "text-neutral-900"
            }`}
          >
            {restaurantName}
          </h1>
          <p
            className={`mt-0.5 text-xs sm:mt-1 sm:text-sm ${
              isVibe ? "text-white/90" : "text-neutral-500"
            }`}
          >
            Order ahead for pickup
          </p>

          {statusText ? (
            <p
              className={`mt-1 text-[11px] font-medium sm:text-xs ${
                isVibe ? "text-white/90" : "text-neutral-700"
              }`}
            >
              {statusText}
            </p>
          ) : null}

          {restaurantAddress ? (
            <p
              className={`mt-1 line-clamp-2 text-[11px] sm:text-xs ${
                isVibe ? "text-white/85" : "text-neutral-600"
              }`}
            >
              {restaurantAddress}
            </p>
          ) : null}
        </div>

        <div
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 sm:px-3 sm:text-xs ${
            closingSoon
              ? "bg-amber-50 text-amber-800 ring-amber-200"
              : isOpen
              ? "bg-green-50 text-green-700 ring-green-200"
              : "bg-red-50 text-red-700 ring-red-200"
          }`}
        >
          {closingSoon ? "Closing Soon" : isOpen ? "Open" : "Closed"}
        </div>
      </div>

      <div className="mt-3 flex gap-2 sm:mt-4">
        <button
          type="button"
          className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm"
        >
          Pickup
        </button>
        <button
          type="button"
          disabled
          className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-400 sm:px-4 sm:py-2 sm:text-sm"
        >
          Delivery
        </button>
      </div>
    </>
  );
}
