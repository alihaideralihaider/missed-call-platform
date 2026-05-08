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
  vibe_image_url?: string | null;
};

type MenuItem = {
  id: string;
  name: string;
  category_id?: string | null;
  category_name?: string | null;
  image_url?: string | null;
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

type RestaurantAsset = {
  id: string;
  menu_item_id?: string | null;
  original_file_name?: string | null;
  public_url?: string | null;
  alt_text?: string | null;
};

type PromotionTemplate =
  | ""
  | "pickup_10_percent"
  | "five_off_40"
  | "free_drink"
  | "free_side"
  | "catering_tray"
  | "mystery_next_order"
  | "custom";

type ImageSource = "existing" | "ai" | "url";

type ImageChoice = {
  id: string;
  label: string;
  url: string;
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

function getPreviewImageUrl(value?: string | null): string {
  const url = String(value || "").trim();

  if (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("/")
  ) {
    return url;
  }

  return "";
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

function formatCurrencyInput(value: string) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? `$${n.toFixed(2)}` : "";
}

function uniqueImageChoices(choices: ImageChoice[]) {
  const seen = new Set<string>();
  return choices.filter((choice) => {
    if (!choice.url || seen.has(choice.url)) return false;
    seen.add(choice.url);
    return true;
  });
}

export default function RestaurantPromotionsPage({ params }: PageProps) {
  const [slug, setSlug] = useState("");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assets, setAssets] = useState<RestaurantAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [promotionTemplate, setPromotionTemplate] = useState<PromotionTemplate>("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [promotionType, setPromotionType] = useState("percent_off");
  const [status, setStatus] = useState("draft");
  const [priority, setPriority] = useState("100");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [aiImageUrl, setAiImageUrl] = useState("");
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageSource, setImageSource] = useState<ImageSource>("existing");
  const [selectedExistingImageUrl, setSelectedExistingImageUrl] = useState("");
  const [imageSelectionTouched, setImageSelectionTouched] = useState(false);
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
      setAssets(Array.isArray(data?.assets) ? data.assets : []);

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

  const existingImageChoices = useMemo(() => {
    const choices: ImageChoice[] = [];

    if (targetType === "restaurant") {
      const vibeUrl = getPreviewImageUrl(restaurant?.vibe_image_url);

      if (vibeUrl) {
        choices.push({
          id: "restaurant-vibe",
          label: "Current restaurant vibe image",
          url: vibeUrl,
        });
      }

      assets
        .filter((asset) => !asset.menu_item_id)
        .forEach((asset) => {
          const url = getPreviewImageUrl(asset.public_url);
          if (!url) return;
          choices.push({
            id: asset.id,
            label: asset.alt_text || asset.original_file_name || "Restaurant asset",
            url,
          });
        });
    }

    if (targetType === "menu_item") {
      const selectedItem = menuItems.find((item) => item.id === targetId);
      const selectedItemImageUrl = getPreviewImageUrl(selectedItem?.image_url);

      if (selectedItemImageUrl) {
        choices.push({
          id: `${selectedItem?.id}-current-image`,
          label: `${selectedItem?.name || "Selected item"} image`,
          url: selectedItemImageUrl,
        });
      }

      assets
        .filter((asset) => asset.menu_item_id === targetId)
        .forEach((asset) => {
          const url = getPreviewImageUrl(asset.public_url);
          if (!url) return;
          choices.push({
            id: asset.id,
            label: asset.alt_text || asset.original_file_name || "Menu item asset",
            url,
          });
        });

      menuItems
        .filter((item) => item.id !== targetId)
        .forEach((item) => {
          const url = getPreviewImageUrl(item.image_url);
          if (!url) return;
          choices.push({
            id: `${item.id}-fallback-image`,
            label: `${item.name} image`,
            url,
          });
        });
    }

    if (targetType === "category") {
      menuItems
        .filter((item) => item.category_id === targetId)
        .forEach((item) => {
          const url = getPreviewImageUrl(item.image_url);
          if (!url) return;
          choices.push({
            id: `${item.id}-category-image`,
            label: item.name,
            url,
          });
        });

      const categoryItemIds = new Set(
        menuItems
          .filter((item) => item.category_id === targetId)
          .map((item) => item.id)
      );

      assets
        .filter((asset) => asset.menu_item_id && categoryItemIds.has(asset.menu_item_id))
        .forEach((asset) => {
          const url = getPreviewImageUrl(asset.public_url);
          if (!url) return;
          const linkedItem = menuItemMap.get(String(asset.menu_item_id || ""));
          choices.push({
            id: asset.id,
            label:
              asset.alt_text ||
              asset.original_file_name ||
              linkedItem?.name ||
              "Category item asset",
            url,
          });
        });
    }

    return uniqueImageChoices(choices);
  }, [assets, menuItemMap, menuItems, restaurant?.vibe_image_url, targetId, targetType]);

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

  useEffect(() => {
    if (imageSource !== "existing" || imageSelectionTouched) return;

    const suggestedUrl = existingImageChoices[0]?.url || "";
    setSelectedExistingImageUrl(suggestedUrl);
    setImageUrl(suggestedUrl);
  }, [existingImageChoices, imageSelectionTouched, imageSource]);

  function applyExistingImageSuggestion() {
    if (imageSelectionTouched) return;

    const suggestedUrl = existingImageChoices[0]?.url || "";
    setImageSource("existing");
    setSelectedExistingImageUrl(suggestedUrl);
    setImageUrl(suggestedUrl);
    setAiImageUrl("");
  }

  function handleTargetTypeChange(value: "restaurant" | "category" | "menu_item") {
    setTargetType(value);
    setTargetId("");
  }

  function handleTargetIdChange(value: string) {
    setTargetId(value);
  }

  function handleImageSourceChange(value: ImageSource) {
    setImageSource(value);
    setImageSelectionTouched(true);

    if (value === "existing") {
      const suggestedUrl = selectedExistingImageUrl || existingImageChoices[0]?.url || "";
      setSelectedExistingImageUrl(suggestedUrl);
      setImageUrl(suggestedUrl);
      setAiImageUrl("");
    } else if (value === "ai") {
      setImageUrl("");
    } else {
      setAiImageUrl("");
    }
  }

  function handleExistingImageChange(value: string) {
    setSelectedExistingImageUrl(value);
    setImageUrl(value);
    setAiImageUrl("");
    setImageSelectionTouched(true);
  }

  function getTargetLabel() {
    if (targetType === "category") {
      return categories.find((category) => category.id === targetId)?.name || "selected category";
    }

    if (targetType === "menu_item") {
      return menuItems.find((item) => item.id === targetId)?.name || "selected menu item";
    }

    return "whole restaurant";
  }

  function buildStarterAiPrompt() {
    return [
      `Create a restaurant promotion image for ${restaurant?.name || "this restaurant"}.`,
      `Promotion: ${name || "restaurant special"}.`,
      `Target: ${getTargetLabel()}.`,
      `Offer summary: ${promotionSummary.join(" ")}`,
      "Style: appetizing food marketing image, realistic restaurant photography, warm lighting.",
      "Do not include readable discount text, logos, watermarks, phone numbers, QR codes, or menus.",
    ].join(" ");
  }

  async function handleGeneratePromotionImage() {
    if (!slug || generatingImage) return;

    setSubmitError("");
    setSuccessMessage("");
    setGeneratingImage(true);

    try {
      const prompt = (aiImagePrompt || buildStarterAiPrompt()).trim();
      const res = await fetch(
        `/api/admin/restaurants/${slug}/promotions/generate-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            promotionName: name || null,
            targetLabel: getTargetLabel(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data?.error || "Failed to generate promotion image.");
        setGeneratingImage(false);
        return;
      }

      const generatedUrl = getPreviewImageUrl(data?.generatedUrl);

      if (!generatedUrl) {
        setSubmitError("Image generated but no generatedUrl was returned.");
        setGeneratingImage(false);
        return;
      }

      setAiImagePrompt(prompt);
      setAiImageUrl(generatedUrl);
      setImageUrl(generatedUrl);
      setImageSelectionTouched(true);
      setSuccessMessage("Promotion image generated. Review it, then save the promotion.");
      setGeneratingImage(false);
    } catch {
      setSubmitError("Something went wrong while generating the promotion image.");
      setGeneratingImage(false);
    }
  }

  function resetForm() {
    setEditingPromotionId(null);
    setPromotionTemplate("");
    setName("");
    setDescription("");
    setPromotionType("percent_off");
    setStatus("draft");
    setPriority("100");
    setStartsAt("");
    setEndsAt("");
    setImageUrl("");
    setAiImageUrl("");
    setAiImagePrompt("");
    setGeneratingImage(false);
    setImageSource("existing");
    setSelectedExistingImageUrl("");
    setImageSelectionTouched(false);
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
    setPromotionTemplate("custom");
    setName(promo.name || "");
    setDescription(promo.description || "");
    setPromotionType(promo.promotion_type || "percent_off");
    setStatus(promo.status || "draft");
    setPriority(String(promo.priority ?? 100));
    setStartsAt(toDateTimeLocalValue(promo.starts_at));
    setEndsAt(toDateTimeLocalValue(promo.ends_at));
    setImageUrl(promo.image_url || "");
    setAiImageUrl("");
    setAiImagePrompt("");
    setGeneratingImage(false);
    setImageSource(promo.image_url ? "url" : "existing");
    setSelectedExistingImageUrl("");
    setImageSelectionTouched(Boolean(promo.image_url));
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

  function handlePromotionTemplateChange(value: PromotionTemplate) {
    setPromotionTemplate(value);

    if (!value || value === "custom") return;

    setBuyQuantity("");
    setGetQuantity("");
    setMaxDiscountAmount("");
    setFirstOrderOnly(false);

    if (value === "pickup_10_percent") {
      setName((current) => current || "10% off pickup orders");
      setDescription((current) => current || "Customers get 10% off qualifying pickup orders.");
      setPromotionType("percent_off");
      setDiscountPercent("10");
      setDiscountAmount("");
      setMinOrderSubtotal("");
      setMaxDiscountAmount("");
      setPickupOnly(true);
      setNextOrderOnly(false);
      return;
    }

    if (value === "five_off_40") {
      setName((current) => current || "$5 off orders over $40");
      setDescription((current) => current || "Customers get $5 off pickup orders of $40 or more.");
      setPromotionType("amount_off");
      setDiscountPercent("");
      setDiscountAmount("5");
      setMinOrderSubtotal("40");
      setMaxDiscountAmount("5");
      setPickupOnly(true);
      setNextOrderOnly(false);
      return;
    }

    if (value === "free_drink") {
      setName((current) => current || "Free drink with pickup order");
      setDescription("Free drink with qualifying pickup order.");
      setPromotionType("pickup_special");
      setDiscountPercent("");
      setDiscountAmount("");
      setMinOrderSubtotal("15");
      setPickupOnly(true);
      setNextOrderOnly(false);
      return;
    }

    if (value === "free_side") {
      setName((current) => current || "Free side or sauce with pickup order");
      setDescription("Free side or sauce with qualifying pickup order.");
      setPromotionType("pickup_special");
      setDiscountPercent("");
      setDiscountAmount("");
      setMinOrderSubtotal("15");
      setPickupOnly(true);
      setNextOrderOnly(false);
      return;
    }

    if (value === "catering_tray") {
      const cateringCategory = categories.find(
        (category) => category.name.trim().toLowerCase() === "catering"
      );

      setName((current) => current || "Catering tray discount");
      setDescription((current) => current || "Customers get 10% off qualifying catering tray orders.");
      setPromotionType("percent_off");
      setDiscountPercent("10");
      setDiscountAmount("");
      setMinOrderSubtotal("100");
      setPickupOnly(true);
      setNextOrderOnly(false);

      if (cateringCategory) {
        setTargetType("category");
        setTargetId(cateringCategory.id);
      } else {
        setTargetType("restaurant");
        setTargetId("");
      }

      return;
    }

    if (value === "mystery_next_order") {
      setName((current) => current || "Mystery QR next-order offer");
      setDescription((current) => current || "Use this with Mystery Offer QR.");
      setPromotionType("percent_off");
      setDiscountPercent("10");
      setDiscountAmount("");
      setMinOrderSubtotal("");
      setMaxDiscountAmount("");
      setPickupOnly(true);
      setFirstOrderOnly(false);
      setNextOrderOnly(true);
    }
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
  const formImagePreviewUrl = getPreviewImageUrl(aiImageUrl || imageUrl);
  const promotionSummary = useMemo(() => {
    const lines: string[] = [];
    const discountPercentNumber = Number(discountPercent || 0);
    const discountAmountText = formatCurrencyInput(discountAmount);
    const minOrderText = formatCurrencyInput(minOrderSubtotal);
    const maxDiscountText = formatCurrencyInput(maxDiscountAmount);

    if (promotionType === "pickup_special" && description.trim()) {
      lines.push(`Customers can claim ${description.trim().replace(/\.$/, "").toLowerCase()}.`);
    } else if (discountPercentNumber > 0) {
      lines.push(
        `Customers get ${discountPercentNumber}% off${pickupOnly ? " pickup orders" : " orders"}.`
      );
    } else if (discountAmountText) {
      lines.push(
        `Customers get ${discountAmountText} off${pickupOnly ? " pickup orders" : " orders"}${
          minOrderText ? ` of ${minOrderText} or more` : ""
        }.`
      );
    } else {
      lines.push("Promotion details are ready for a custom offer.");
    }

    if (minOrderText && !lines[0]?.includes(minOrderText)) {
      lines.push(`Minimum order amount is ${minOrderText}.`);
    }

    if (maxDiscountText) {
      lines.push(`Maximum discount is ${maxDiscountText}.`);
    }

    if (firstOrderOnly) {
      lines.push("This is only for first-time customers.");
    }

    if (nextOrderOnly) {
      lines.push("This is only for next order offers.");
    }

    if (targetType === "category") {
      const categoryName =
        categories.find((category) => category.id === targetId)?.name ||
        "the selected category";
      lines.push(`This applies to ${categoryName}.`);
    } else if (targetType === "menu_item") {
      const itemName =
        menuItems.find((item) => item.id === targetId)?.name ||
        "the selected menu item";
      lines.push(`This applies to ${itemName}.`);
    } else {
      lines.push("This applies to the whole restaurant.");
    }

    if (startsAt || endsAt) {
      lines.push(
        `Valid ${startsAt ? `from ${formatDateTime(startsAt)}` : "immediately"}${
          endsAt ? ` to ${formatDateTime(endsAt)}` : ""
        }.`
      );
    }

    if (promotionTemplate === "mystery_next_order") {
      lines.push("Use this with Mystery Offer QR.");
    }

    return lines;
  }, [
    categories,
    description,
    discountAmount,
    discountPercent,
    endsAt,
    firstOrderOnly,
    maxDiscountAmount,
    menuItems,
    minOrderSubtotal,
    nextOrderOnly,
    pickupOnly,
    promotionTemplate,
    promotionType,
    startsAt,
    targetId,
    targetType,
  ]);

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
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <label className="mb-2 block text-sm font-semibold text-neutral-900">
                    Promotion template
                  </label>
                  <p className="mb-3 text-xs text-neutral-600">
                    Choose a template first. You can adjust the details before saving.
                  </p>
                  <select
                    value={promotionTemplate}
                    onChange={(e) =>
                      handlePromotionTemplateChange(e.target.value as PromotionTemplate)
                    }
                    disabled={!promotionsEnabled}
                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-400 disabled:opacity-60"
                  >
                    <option value="">Select a template</option>
                    <option value="pickup_10_percent">10% off pickup orders</option>
                    <option value="five_off_40">$5 off orders over $40</option>
                    <option value="free_drink">Free drink with pickup order</option>
                    <option value="free_side">Free side or sauce with pickup order</option>
                    <option value="catering_tray">Catering tray discount</option>
                    <option value="mystery_next_order">Mystery QR next-order offer</option>
                    <option value="custom">Custom promotion</option>
                  </select>
                </div>

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
                        handleTargetTypeChange(
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
                      onChange={(e) => handleTargetIdChange(e.target.value)}
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
                      onChange={(e) => handleTargetIdChange(e.target.value)}
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
                    Image source
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    Choose an existing restaurant or menu image, generate with AI, or paste a direct image URL.
                  </p>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        Image source
                      </label>
                      <select
                        value={imageSource}
                        onChange={(e) =>
                          handleImageSourceChange(e.target.value as ImageSource)
                        }
                        disabled={!promotionsEnabled}
                        className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-400 disabled:opacity-60"
                      >
                        <option value="existing">Use existing asset</option>
                        <option value="ai">Generate with AI</option>
                        <option value="url">Paste image URL</option>
                      </select>
                    </div>

                    {imageSource === "existing" ? (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-neutral-700">
                          {targetType === "menu_item"
                            ? "Menu item image"
                            : targetType === "category"
                            ? "Category image"
                            : "Restaurant image"}
                        </label>
                        {existingImageChoices.length > 0 ? (
                          <select
                            value={selectedExistingImageUrl}
                            onChange={(e) => handleExistingImageChange(e.target.value)}
                            disabled={!promotionsEnabled}
                            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-400 disabled:opacity-60"
                          >
                            {existingImageChoices.map((choice) => (
                              <option key={choice.id} value={choice.url}>
                                {choice.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-3 py-3 text-sm text-neutral-500">
                            {targetType === "menu_item"
                              ? "The selected menu item does not have an image yet. You can use AI or paste an image URL."
                              : targetType === "category"
                              ? "No item images were found in this category. You can use AI or paste an image URL."
                              : "No restaurant vibe image found. You can use AI or paste an image URL."}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {imageSource === "url" ? (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-neutral-700">
                          Promotion image URL
                        </label>
                        <input
                          type="text"
                          value={imageUrl}
                          onChange={(e) => {
                            setImageUrl(e.target.value);
                            setImageSelectionTouched(true);
                          }}
                          placeholder="https://..."
                          disabled={!promotionsEnabled}
                          className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 disabled:opacity-60"
                        />
                      </div>
                    ) : null}

                    {imageSource === "ai" ? (
                      <>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-neutral-700">
                            AI prompt
                          </label>
                          <textarea
                            value={aiImagePrompt}
                            onChange={(e) => setAiImagePrompt(e.target.value)}
                            placeholder="Describe the promotion image, e.g. Chicken over rice catering tray with warm restaurant lighting"
                            rows={4}
                            disabled={!promotionsEnabled || generatingImage}
                            className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 disabled:opacity-60"
                          />
                          <p className="mt-2 text-xs text-neutral-500">
                            Leave blank to use a starter prompt from the restaurant, promotion, target, and summary. Discount text should stay in the promotion card, not inside the image.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleGeneratePromotionImage}
                          disabled={!promotionsEnabled || generatingImage}
                          className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {generatingImage ? "Generating..." : "Generate image"}
                        </button>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-neutral-700">
                            AI-generated image URL
                          </label>
                          <input
                            type="text"
                            value={aiImageUrl}
                            onChange={(e) => {
                              setAiImageUrl(e.target.value);
                              setImageUrl(e.target.value);
                              setImageSelectionTouched(true);
                            }}
                            placeholder="Generated image URL will go here"
                            disabled={!promotionsEnabled}
                            className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 disabled:opacity-60"
                          />
                        </div>
                      </>
                    ) : null}

                    {formImagePreviewUrl ? (
                      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                        <div className="aspect-[16/9] bg-neutral-100">
                          <img
                            src={formImagePreviewUrl}
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
                  <p className="mt-1 text-xs text-neutral-500">
                    Templates fill these details for you. Keep them as-is or adjust before saving.
                  </p>

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
                        Minimum order amount
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
                        Maximum discount
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
                      <span className="text-sm text-neutral-800">First-time customer only</span>
                    </label>

                    <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
                      <input
                        type="checkbox"
                        checked={nextOrderOnly}
                        onChange={(e) => setNextOrderOnly(e.target.checked)}
                        disabled={!promotionsEnabled}
                        className="h-4 w-4 rounded border-neutral-300"
                      />
                      <span className="text-sm text-neutral-800">Only for next order offers</span>
                    </label>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Promotion summary
                  </h3>
                  <div className="mt-3 space-y-2">
                    {promotionSummary.map((line) => (
                      <p key={line} className="text-sm text-neutral-700">
                        {line}
                      </p>
                    ))}
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

                  const previewUrl = getPreviewImageUrl(promo.image_url);

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
