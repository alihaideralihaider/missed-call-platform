"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  has_vibe_upgrade?: boolean;
  has_menu_upgrade?: boolean;
  has_promotions_upgrade?: boolean;
};

type MenuItem = {
  id: string;
  name: string;
  category_name?: string | null;
};

type Promotion = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  promotion_type: string | null;
  status: string | null;
  priority: number | null;
  starts_at: string | null;
  ends_at: string | null;
  channels?: string[] | string | null;
  image_url?: string | null;
  rule?: PromotionRule | null;
  target?: PromotionTarget | null;
};

type PromotionRule = {
  id?: string;
  promotion_id?: string;
  buy_quantity?: number | null;
  get_quantity?: number | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  min_order_subtotal?: number | null;
  max_discount_amount?: number | null;
  first_order_only?: boolean | null;
  next_order_only?: boolean | null;
  pickup_only?: boolean | null;
  metadata?: Record<string, unknown> | null;
};

type PromotionTarget = {
  id?: string;
  promotion_id?: string;
  target_type: "restaurant" | "category" | "menu_item";
  target_id?: string | null;
};

type Category = {
  id: string;
  name: string;
};

function cleanSlug(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  return s && s !== "undefined" && s !== "null" ? s : "";
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");

  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function summarizeRule(rule?: PromotionRule | null) {
  if (!rule) return "No rule configured.";

  const parts: string[] = [];

  if (rule.buy_quantity && rule.get_quantity) {
    parts.push(`Buy ${rule.buy_quantity}, get ${rule.get_quantity}`);
  } else if (rule.discount_percent) {
    parts.push(`${rule.discount_percent}% off`);
  } else if (rule.discount_amount) {
    parts.push(`$${Number(rule.discount_amount).toFixed(2)} off`);
  }

  if (rule.min_order_subtotal) {
    parts.push(`min order $${Number(rule.min_order_subtotal).toFixed(2)}`);
  }

  if (rule.pickup_only) parts.push("pickup only");
  if (rule.first_order_only) parts.push("first order only");
  if (rule.next_order_only) parts.push("next order only");

  return parts.length ? parts.join(" • ") : "No rule configured.";
}

function summarizeTarget(
  target: PromotionTarget | null | undefined,
  menuItemMap: Map<string, MenuItem>,
  categoryMap: Map<string, Category>
) {
  if (!target) return "Whole restaurant";

  if (target.target_type === "restaurant") {
    return "Whole restaurant";
  }

  if (target.target_type === "menu_item") {
    return `Menu item: ${menuItemMap.get(String(target.target_id || ""))?.name || "Unknown item"}`;
  }

  if (target.target_type === "category") {
    return `Category: ${categoryMap.get(String(target.target_id || ""))?.name || "Unknown category"}`;
  }

  return "Target not set";
}

export default function RestaurantPromotionsPage({ params }: PageProps) {
  const [slug, setSlug] = useState("");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [promotionType, setPromotionType] = useState("percent_off");
  const [status, setStatus] = useState("draft");
  const [priority, setPriority] = useState("100");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [aiImageUrl, setAiImageUrl] = useState("");
  const [targetType, setTargetType] = useState<"restaurant" | "category" | "menu_item">("restaurant");
  const [targetId, setTargetId] = useState("");

  const [buyQuantity, setBuyQuantity] = useState("");
  const [getQuantity, setGetQuantity] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [minOrderSubtotal, setMinOrderSubtotal] = useState("");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("");
  const [pickupOnly, setPickupOnly] = useState(false);
  const [firstOrderOnly, setFirstOrderOnly] = useState(false);
  const [nextOrderOnly, setNextOrderOnly] = useState(false);

  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadPage(nextSlugFromState?: string, isRefresh = false) {
    const targetSlug = nextSlugFromState || slug;
    if (!targetSlug) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setLoadingError("");

    try {
      const res = await fetch(`/api/admin/restaurants/${targetSlug}/promotions`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load promotions.");
      }

      setRestaurant(data?.restaurant || null);
      setPromotions(Array.isArray(data?.promotions) ? data.promotions : []);
      setMenuItems(Array.isArray(data?.menuItems) ? data.menuItems : []);
      setCategories(Array.isArray(data?.categories) ? data.categories : []);

      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      setLoadingError(
        error instanceof Error
          ? error.message
          : "Something went wrong while loading promotions."
      );
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    async function init() {
      const resolved = await params;
      const nextSlug = cleanSlug(resolved?.slug);
      setSlug(nextSlug);
      await loadPage(nextSlug);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const menuItemMap = useMemo(() => {
    return new Map(menuItems.map((item) => [item.id, item]));
  }, [menuItems]);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((item) => [item.id, item]));
  }, [categories]);

  const filteredPromotions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return promotions;

    return promotions.filter((promo) => {
      return (
        String(promo.name || "").toLowerCase().includes(q) ||
        String(promo.description || "").toLowerCase().includes(q) ||
        String(promo.promotion_type || "").toLowerCase().includes(q) ||
        String(promo.status || "").toLowerCase().includes(q)
      );
    });
  }, [promotions, query]);

  function resetForm() {
    setEditingPromotionId(null);
    setName("");
    setDescription("");
    setPromotionType("percent_off");
    setStatus("draft");
    setPriority("100");
    setStartsAt("");
    setEndsAt("");
    setImageUrl("");
    setAiImageUrl("");
    setTargetType("restaurant");
    setTargetId("");
    setBuyQuantity("");
    setGetQuantity("");
    setDiscountPercent("");
    setDiscountAmount("");
    setMinOrderSubtotal("");
    setMaxDiscountAmount("");
    setPickupOnly(false);
    setFirstOrderOnly(false);
    setNextOrderOnly(false);
    setSubmitError("");
    setSuccessMessage("");
  }

  function startEdit(promo: Promotion) {
    setEditingPromotionId(promo.id);
    setName(promo.name || "");
    setDescription(promo.description || "");
    setPromotionType(promo.promotion_type || "percent_off");
    setStatus(promo.status || "draft");
    setPriority(String(promo.priority ?? 100));
    setStartsAt(toDateTimeLocalValue(promo.starts_at));
    setEndsAt(toDateTimeLocalValue(promo.ends_at));
    setImageUrl(promo.image_url || "");
    setAiImageUrl("");
    setTargetType((promo.target?.target_type as "restaurant" | "category" | "menu_item") || "restaurant");
    setTargetId(String(promo.target?.target_id || ""));
    setBuyQuantity(promo.rule?.buy_quantity ? String(promo.rule.buy_quantity) : "");
    setGetQuantity(promo.rule?.get_quantity ? String(promo.rule.get_quantity) : "");
    setDiscountPercent(
      promo.rule?.discount_percent ? String(promo.rule.discount_percent) : ""
    );
    setDiscountAmount(
      promo.rule?.discount_amount ? String(promo.rule.discount_amount) : ""
    );
    setMinOrderSubtotal(
      promo.rule?.min_order_subtotal ? String(promo.rule.min_order_subtotal) : ""
    );
    setMaxDiscountAmount(
      promo.rule?.max_discount_amount ? String(promo.rule.max_discount_amount) : ""
    );
    setPickupOnly(Boolean(promo.rule?.pickup_only));
    setFirstOrderOnly(Boolean(promo.rule?.first_order_only));
    setNextOrderOnly(Boolean(promo.rule?.next_order_only));
    setSubmitError("");
    setSuccessMessage("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!slug || submitting) return;

    setSubmitError("");
    setSuccessMessage("");
    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        promotionType,
        status,
        priority: priority ? Number(priority) : 100,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        imageUrl: imageUrl.trim() || null,
        aiImageUrl: aiImageUrl.trim() || null,
        targetType,
        targetId: targetType === "restaurant" ? null : targetId || null,
        rule: {
          buyQuantity: buyQuantity ? Number(buyQuantity) : null,
          getQuantity: getQuantity ? Number(getQuantity) : null,
          discountPercent: discountPercent ? Number(discountPercent) : null,
          discountAmount: discountAmount ? Number(discountAmount) : null,
          minOrderSubtotal: minOrderSubtotal ? Number(minOrderSubtotal) : null,
          maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
          pickupOnly,
          firstOrderOnly,
          nextOrderOnly,
        },
      };

      const url = editingPromotionId
        ? `/api/admin/restaurants/${slug}/promotions/${editingPromotionId}`
        : `/api/admin/restaurants/${slug}/promotions`;

      const method = editingPromotionId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data?.error || "Failed to save promotion.");
        setSubmitting(false);
        return;
      }

      setSuccessMessage(
        editingPromotionId
          ? "Promotion updated successfully."
          : "Promotion created successfully."
      );

      await loadPage(slug, true);
      resetForm();
      setSubmitting(false);
    } catch {
      setSubmitError("Something went wrong while saving the promotion.");
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(promo: Promotion) {
    if (!slug) return;

    const nextStatus =
      String(promo.status || "").toLowerCase() === "active" ? "paused" : "active";

    try {
      const res = await fetch(
        `/api/admin/restaurants/${slug}/promotions/${promo.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data?.error || "Failed to update promotion status.");
        return;
      }

      setSuccessMessage("Promotion status updated.");
      await loadPage(slug, true);
    } catch {
      setSubmitError("Something went wrong while updating promotion status.");
    }
  }

  const promotionsEnabled = restaurant?.has_promotions_upgrade ?? true;

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Restaurant promotions
            </p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900">
              {loading ? "Loading..." : restaurant?.name || "Promotions"}
            </h1>
            {!loading && restaurant?.slug ? (
              <p className="mt-1 text-sm text-neutral-500">
                Slug: {restaurant.slug}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => loadPage(slug, true)}
            disabled={loading || refreshing}
            className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh promotions"}
          </button>
        </div>

        {loadingError ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadingError}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">
                    {editingPromotionId ? "Edit promotion" : "Create promotion"}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Create and manage limited-time offers, item deals, and pickup promotions.
                  </p>
                </div>

                {editingPromotionId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700"
                  >
                    New
                  </button>
                ) : null}
              </div>

              {!promotionsEnabled ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Promotions are available on the premium plan.
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Promotion name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Family Dinner Deal"
                    disabled={!promotionsEnabled}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Save on pickup orders this weekend."
                    rows={3}
                    disabled={!promotionsEnabled}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 disabled:opacity-60"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700">
                      Promotion type
                    </label>
                    <select
                      value={promotionType}
                      onChange={(e) => setPromotionType(e.target.value)}
                      disabled={!promotionsEnabled}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-400 disabled:opacity-60"
                    >
                      <option value="percent_off">Percent off</option>
                      <option value="amount_off">Amount off</option>
                      <option value="buy_x_get_y">Buy X get Y</option>
                      <option value="pickup_special">Pickup special</option>
                      <option value="first_order">First order</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={!promotionsEnabled}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-400 disabled:opacity-60"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700">
                      Priority
                    </label>
                    <input
                      type="number"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      disabled={!promotionsEnabled}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-neutral-400 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700">
                      Target type
                    </label>
                    <select
                      value={targetType}
                      onChange={(e) =>
                        setTargetType(
                          e.target.value as "restaurant" | "category" | "menu_item"
                        )
                      }
                      disabled={!promotionsEnabled}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-400 disabled:opacity-60"
                    >
                      <option value="restaurant">Whole restaurant</option>
                      <option value="category">Category</option>
                      <option value="menu_item">Menu item</option>
                    </select>
                  </div>
                </div>

                {targetType === "category" ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700">
                      Category
                    </label>
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      disabled={!promotionsEnabled}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-400 disabled:opacity-60"
                    >
                      <option value="">Select category</option>
                      {categories.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {targetType === "menu_item" ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700">
                      Menu item
                    </label>
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      disabled={!promotionsEnabled}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-400 disabled:opacity-60"
                    >
                      <option value="">Select menu item</option>
                      {menuItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                          {item.category_name ? ` — ${item.category_name}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700">
                      Starts at
                    </label>
                    <input
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      disabled={!promotionsEnabled}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-neutral-400 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700">
                      Ends at
                    </label>
                    <input
                      type="datetime-local"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      disabled={!promotionsEnabled}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-neutral-400 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Promotion images
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    Add a direct image URL now. AI-generated promo image URL is included so we can wire generated promo creatives into this page next.
                  </p>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        Promotion image URL
                      </label>
                      <input
                        type="text"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://..."
                        disabled={!promotionsEnabled}
                        className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        AI-generated image URL
                      </label>
                      <input
                        type="text"
                        value={aiImageUrl}
                        onChange={(e) => setAiImageUrl(e.target.value)}
                        placeholder="Generated image URL will go here"
                        disabled={!promotionsEnabled}
                        className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 disabled:opacity-60"
                      />
                    </div>

                    {imageUrl || aiImageUrl ? (
                      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                        <div className="aspect-[16/9] bg-neutral-100">
                          <img
                            src={aiImageUrl || imageUrl}
                            alt="Promotion preview"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Promotion rule
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        Discount %
                      </label>
                      <input
                        type="number"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                        disabled={!promotionsEnabled}
                        className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-neutral-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        Discount amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        disabled={!promotionsEnabled}
                        className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-neutral-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        Buy quantity
                      </label>
                      <input
                        type="number"
                        value={buyQuantity}
                        onChange={(e) => setBuyQuantity(e.target.value)}
                        disabled={!promotionsEnabled}
                        className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-neutral-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        Get quantity
                      </label>
                      <input
                        type="number"
                        value={getQuantity}
                        onChange={(e) => setGetQuantity(e.target.value)}
                        disabled={!promotionsEnabled}
                        className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-neutral-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        Min order subtotal
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={minOrderSubtotal}
                        onChange={(e) => setMinOrderSubtotal(e.target.value)}
                        disabled={!promotionsEnabled}
                        className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-neutral-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        Max discount amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={maxDiscountAmount}
                        onChange={(e) => setMaxDiscountAmount(e.target.value)}
                        disabled={!promotionsEnabled}
                        className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-neutral-400 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
                      <input
                        type="checkbox"
                        checked={pickupOnly}
                        onChange={(e) => setPickupOnly(e.target.checked)}
                        disabled={!promotionsEnabled}
                        className="h-4 w-4 rounded border-neutral-300"
                      />
                      <span className="text-sm text-neutral-800">Pickup only</span>
                    </label>

                    <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
                      <input
                        type="checkbox"
                        checked={firstOrderOnly}
                        onChange={(e) => setFirstOrderOnly(e.target.checked)}
                        disabled={!promotionsEnabled}
                        className="h-4 w-4 rounded border-neutral-300"
                      />
                      <span className="text-sm text-neutral-800">First order only</span>
                    </label>

                    <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
                      <input
                        type="checkbox"
                        checked={nextOrderOnly}
                        onChange={(e) => setNextOrderOnly(e.target.checked)}
                        disabled={!promotionsEnabled}
                        className="h-4 w-4 rounded border-neutral-300"
                      />
                      <span className="text-sm text-neutral-800">Next order only</span>
                    </label>
                  </div>
                </div>

                {submitError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                    {submitError}
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-700">
                    {successMessage}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting || !promotionsEnabled}
                  className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting
                    ? editingPromotionId
                      ? "Saving..."
                      : "Creating..."
                    : editingPromotionId
                    ? "Save promotion"
                    : "Create promotion"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-neutral-900">Quick stats</h2>

              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Total promotions
                  </p>
                  <p className="mt-1 text-2xl font-bold text-neutral-900">
                    {loading ? "—" : promotions.length}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Active
                  </p>
                  <p className="mt-1 text-2xl font-bold text-neutral-900">
                    {loading
                      ? "—"
                      : promotions.filter(
                          (item) =>
                            String(item.status || "").toLowerCase() === "active"
                        ).length}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Draft / paused
                  </p>
                  <p className="mt-1 text-2xl font-bold text-neutral-900">
                    {loading
                      ? "—"
                      : promotions.filter(
                          (item) =>
                            String(item.status || "").toLowerCase() !== "active"
                        ).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">
                  Promotions list
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Create and manage offers for this restaurant.
                </p>
              </div>

              <div className="w-full md:w-[280px]">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search promotions..."
                  className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                />
              </div>
            </div>

            {loading ? (
              <p className="mt-6 text-sm text-neutral-500">Loading promotions...</p>
            ) : filteredPromotions.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
                <p className="text-sm font-medium text-neutral-700">
                  No promotions found.
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  Create your first promotion on the left.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                {filteredPromotions.map((promo) => {
                  const isActive =
                    String(promo.status || "").toLowerCase() === "active";

                  const previewUrl = promo.image_url || null;

                  return (
                    <div
                      key={promo.id}
                      className={`overflow-hidden rounded-2xl border bg-neutral-50 ${
                        isActive
                          ? "border-emerald-300 ring-2 ring-emerald-100"
                          : "border-neutral-200"
                      }`}
                    >
                      <div className="aspect-[16/9] bg-white">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={promo.name || "Promotion"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                            No image yet
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 p-4">
                        <p
                          className="text-sm font-semibold leading-5 text-neutral-900"
                          style={{ overflowWrap: "anywhere" }}
                        >
                          {promo.name || "Untitled promotion"}
                        </p>

                        <div className="flex flex-wrap gap-1">
                          <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-700">
                            {promo.promotion_type || "promotion"}
                          </span>

                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                              isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-neutral-200 text-neutral-700"
                            }`}
                          >
                            {promo.status || "draft"}
                          </span>

                          {promo.image_url ? (
                            <span className="shrink-0 rounded-full bg-purple-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-purple-700">
                              Has Image
                            </span>
                          ) : null}
                        </div>

                        {promo.description ? (
                          <p className="text-sm text-neutral-600">
                            {promo.description}
                          </p>
                        ) : null}

                        <div className="space-y-1 text-xs text-neutral-500">
                          <p>Rule: {summarizeRule(promo.rule)}</p>
                          <p>
                            Target:{" "}
                            {summarizeTarget(promo.target, menuItemMap, categoryMap)}
                          </p>
                          <p>Starts: {formatDateTime(promo.starts_at)}</p>
                          <p>Ends: {formatDateTime(promo.ends_at)}</p>
                        </div>

                        <div className="grid gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => startEdit(promo)}
                            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-xs font-semibold text-neutral-800"
                          >
                            Edit promotion
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(promo)}
                            className={`w-full rounded-xl px-4 py-3 text-xs font-semibold text-white ${
                              isActive ? "bg-neutral-700" : "bg-emerald-600"
                            }`}
                          >
                            {isActive ? "Pause promotion" : "Activate promotion"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}