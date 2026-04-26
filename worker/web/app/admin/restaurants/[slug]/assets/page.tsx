"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import RestaurantVisualUpgrades from "@/components/admin/RestaurantVisualUpgrades";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  plan_key?: string | null;
  has_vibe_upgrade?: boolean;
  has_menu_upgrade?: boolean;
  vibe_image_url?: string | null;
};

type MenuItem = {
  id: string;
  name: string;
  category_name?: string | null;
  image_url?: string | null;
};

type Asset = {
  id: string;
  restaurant_id: string;
  menu_item_id: string | null;
  original_file_name: string | null;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  public_url: string | null;
  alt_text: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function cleanSlug(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  return s && s !== "undefined" && s !== "null" ? s : "";
}

function formatBytes(bytes?: number | null): string {
  const value = Number(bytes || 0);

  if (!value) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function isEnhancedAsset(asset: Asset) {
  return String(asset.storage_path || "").includes("/enhanced/");
}

function hasPlanVisualUpgrades(planKey?: string | null) {
  return planKey === "pro_monthly" || planKey === "pro_plus_monthly";
}

export default function RestaurantAssetsPage({ params }: PageProps) {
  const [slug, setSlug] = useState("");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [menuItemId, setMenuItemId] = useState("");
  const [altText, setAltText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  const [settingVibeUrl, setSettingVibeUrl] = useState("");
  const [enhancingVibeUrl, setEnhancingVibeUrl] = useState("");
  const [enhancingMenuUrl, setEnhancingMenuUrl] = useState("");
  const [settingMenuImageItemId, setSettingMenuImageItemId] = useState("");
  const [copiedUrl, setCopiedUrl] = useState("");
  const [previewPair, setPreviewPair] = useState<{
    original: string;
    enhanced: string;
  } | null>(null);

  const hasVisualUpgrades = hasPlanVisualUpgrades(restaurant?.plan_key);
  const canUseVibeUpgrade =
    hasVisualUpgrades || Boolean(restaurant?.has_vibe_upgrade);
  const canUseMenuUpgrade =
    hasVisualUpgrades || Boolean(restaurant?.has_menu_upgrade);

  async function loadMenuItems(targetSlug: string) {
    const res = await fetch(`/api/admin/restaurants/${targetSlug}/menu`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Failed to load menu items.");
    }

    const flattenedItems: MenuItem[] = [];
    const categories = Array.isArray(data?.categories) ? data.categories : [];
    const items = Array.isArray(data?.items) ? data.items : [];

    const categoryNameMap = new Map<string, string>();
    for (const category of categories) {
      categoryNameMap.set(String(category.id), String(category.name || ""));
    }

    for (const item of items) {
      flattenedItems.push({
        id: String(item.id),
        name: String(item.name || ""),
        category_name: categoryNameMap.get(String(item.category_id)) || null,
        image_url: item.image_url || null,
      });
    }

    return flattenedItems.sort((a, b) => a.name.localeCompare(b.name));
  }

  async function loadAssetsPage(nextSlugFromState?: string, isRefresh = false) {
    const targetSlug = nextSlugFromState || slug;
    if (!targetSlug) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setLoadingError("");

    try {
      const [assetsRes, menuItemsData] = await Promise.all([
        fetch(`/api/admin/restaurants/${targetSlug}/assets`, {
          cache: "no-store",
        }),
        loadMenuItems(targetSlug),
      ]);

      const assetsData = await assetsRes.json();

      if (!assetsRes.ok) {
        throw new Error(assetsData?.error || "Failed to load assets.");
      }

      setRestaurant(assetsData?.restaurant || null);
      setAssets(Array.isArray(assetsData?.assets) ? assetsData.assets : []);
      setMenuItems(menuItemsData);

      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      setLoadingError(
        error instanceof Error
          ? error.message
          : "Something went wrong while loading assets."
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
      await loadAssetsPage(nextSlug);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const menuItemMap = useMemo(() => {
    return new Map(menuItems.map((item) => [item.id, item]));
  }, [menuItems]);

  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;

    return assets.filter((asset) => {
      const linkedItem = asset.menu_item_id
        ? menuItemMap.get(asset.menu_item_id)
        : null;

      return (
        String(asset.original_file_name || "").toLowerCase().includes(q) ||
        String(asset.alt_text || "").toLowerCase().includes(q) ||
        String(linkedItem?.name || "").toLowerCase().includes(q)
      );
    });
  }, [assets, menuItemMap, query]);

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!slug || submitting) return;

    setSubmitError("");
    setSuccessMessage("");

    if (!selectedFiles.length) {
      setSubmitError("Please choose at least one image file.");
      return;
    }

    if (selectedFiles.length > 1 && menuItemId) {
      setSubmitError(
        "Linking to a menu item is only available for single-image uploads. Clear the link field or upload one image."
      );
      return;
    }

    setSubmitting(true);
    setUploadProgress({
      current: 0,
      total: selectedFiles.length,
    });

    try {
      for (const [index, file] of selectedFiles.entries()) {
        setUploadProgress({
          current: index + 1,
          total: selectedFiles.length,
        });

        const formData = new FormData();
        formData.append("file", file);

        if (menuItemId) {
          formData.append("menuItemId", menuItemId);
        }

        if (altText.trim()) {
          formData.append("altText", altText.trim());
        }

        const res = await fetch(`/api/admin/restaurants/${slug}/assets`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setSubmitError(
            data?.error ||
              `Failed to upload image ${index + 1} of ${selectedFiles.length}.`
          );
          setSubmitting(false);
          setUploadProgress(null);
          return;
        }
      }

      setSelectedFiles([]);
      setMenuItemId("");
      setAltText("");
      setSuccessMessage(
        selectedFiles.length === 1
          ? "Image uploaded successfully."
          : `${selectedFiles.length} images uploaded successfully.`
      );

      const fileInput = document.getElementById(
        "asset-file-input"
      ) as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";

      await loadAssetsPage(slug, true);
      setSubmitting(false);
      setUploadProgress(null);
    } catch {
      setSubmitError("Something went wrong while uploading the image.");
      setSubmitting(false);
      setUploadProgress(null);
    }
  }

  async function handleCopyUrl(url?: string | null) {
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setSuccessMessage("Image URL copied to clipboard.");

      window.setTimeout(() => {
        setCopiedUrl((current) => (current === url ? "" : current));
      }, 2000);
    } catch {
      setSubmitError("Failed to copy image URL.");
    }
  }

  async function handleDeleteAsset(assetId: string) {
    if (!confirm("Delete this image?")) return;

    try {
      const res = await fetch(`/api/admin/assets/${assetId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSubmitError(data?.error || "Failed to delete image.");
        return;
      }

      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      setSuccessMessage("Image deleted.");
    } catch {
      setSubmitError("Failed to delete image.");
    }
  }

  async function handleSetAsVibe(imageUrl?: string | null) {
    if (!slug || !imageUrl || settingVibeUrl) return;

    setSubmitError("");
    setSuccessMessage("");
    setSettingVibeUrl(imageUrl);

    try {
      const res = await fetch(`/api/admin/restaurants/${slug}/set-vibe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data?.error || "Failed to set vibe background.");
        setSettingVibeUrl("");
        return;
      }

      setRestaurant((current) =>
        current
          ? {
              ...current,
              vibe_image_url: imageUrl,
            }
          : current
      );

      setSuccessMessage("Vibe background updated.");
      setSettingVibeUrl("");
    } catch {
      setSubmitError("Something went wrong while setting the vibe background.");
      setSettingVibeUrl("");
    }
  }

  async function handleSetAsMenuImage(asset: Asset) {
    if (!slug || !asset.public_url || !asset.menu_item_id || settingMenuImageItemId) {
      return;
    }

    setSubmitError("");
    setSuccessMessage("");
    setSettingMenuImageItemId(asset.menu_item_id);

    try {
      const res = await fetch(`/api/admin/restaurants/${slug}/set-menu-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          menuItemId: asset.menu_item_id,
          imageUrl: asset.public_url,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data?.error || "Failed to set menu image.");
        setSettingMenuImageItemId("");
        return;
      }

      setMenuItems((current) =>
        current.map((item) =>
          item.id === asset.menu_item_id
            ? { ...item, image_url: asset.public_url }
            : item
        )
      );

      setSuccessMessage("Menu image updated.");
      setSettingMenuImageItemId("");
    } catch {
      setSubmitError("Something went wrong while setting the menu image.");
      setSettingMenuImageItemId("");
    }
  }

  async function handleEnhanceAsVibe(asset: Asset) {
    if (!slug || !asset.public_url || enhancingVibeUrl) return;

    setSubmitError("");
    setSuccessMessage("");
    setEnhancingVibeUrl(asset.public_url);

    try {
      const res = await fetch(`/api/admin/restaurants/${slug}/assets/enhance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: asset.public_url,
          mode: "vibe",
          menuItemId: asset.menu_item_id,
          originalFileName: asset.original_file_name,
          sourceAssetId: asset.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data?.error || "Failed to enhance image.");
        setEnhancingVibeUrl("");
        return;
      }

      const enhancedUrl = data?.enhancedUrl;

      if (!enhancedUrl) {
        setSubmitError("Enhancement finished but no enhancedUrl was returned.");
        setEnhancingVibeUrl("");
        return;
      }

      setSuccessMessage(
        "Image enhanced successfully. The enhanced result has been saved to storage and set as the vibe background."
      );

      const syntheticAsset: Asset = {
        id: `enhanced-vibe-${Date.now()}`,
        restaurant_id: asset.restaurant_id,
        menu_item_id: asset.menu_item_id,
        original_file_name:
          data?.displayFileName ||
          data?.enhancedPath?.split("/").pop() ||
          `enhanced-${asset.original_file_name || "image"}`,
        storage_bucket: asset.storage_bucket,
        storage_path: data?.enhancedPath || "",
        mime_type: data?.mimeType || "image/jpeg",
        file_size_bytes: null,
        public_url: enhancedUrl,
        alt_text: asset.alt_text,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setAssets((current) => {
        const exists = current.some((item) => item.public_url === enhancedUrl);
        if (exists) return current;
        return [syntheticAsset, ...current];
      });

      setPreviewPair({
        original: asset.public_url,
        enhanced: enhancedUrl,
      });

      await handleSetAsVibe(enhancedUrl);
      setEnhancingVibeUrl("");
    } catch {
      setSubmitError("Something went wrong while enhancing the image.");
      setEnhancingVibeUrl("");
    }
  }

  async function handleEnhanceAsMenu(asset: Asset) {
    if (!slug || !asset.public_url || !asset.menu_item_id || enhancingMenuUrl) {
      return;
    }

    setSubmitError("");
    setSuccessMessage("");
    setEnhancingMenuUrl(asset.public_url);

    try {
      const res = await fetch(`/api/admin/restaurants/${slug}/assets/enhance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: asset.public_url,
          mode: "menu",
          menuItemId: asset.menu_item_id,
          originalFileName: asset.original_file_name,
          sourceAssetId: asset.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data?.error || "Failed to enhance menu image.");
        setEnhancingMenuUrl("");
        return;
      }

      const enhancedUrl = data?.enhancedUrl;

      if (!enhancedUrl) {
        setSubmitError("Enhancement finished but no enhancedUrl was returned.");
        setEnhancingMenuUrl("");
        return;
      }

      const syntheticAsset: Asset = {
        id: `enhanced-menu-${Date.now()}`,
        restaurant_id: asset.restaurant_id,
        menu_item_id: asset.menu_item_id,
        original_file_name:
          data?.displayFileName ||
          data?.enhancedPath?.split("/").pop() ||
          `enhanced-${asset.original_file_name || "image"}`,
        storage_bucket: asset.storage_bucket,
        storage_path: data?.enhancedPath || "",
        mime_type: data?.mimeType || "image/jpeg",
        file_size_bytes: null,
        public_url: enhancedUrl,
        alt_text: asset.alt_text,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setAssets((current) => {
        const exists = current.some((item) => item.public_url === enhancedUrl);
        if (exists) return current;
        return [syntheticAsset, ...current];
      });

      setPreviewPair({
        original: asset.public_url,
        enhanced: enhancedUrl,
      });

      setSuccessMessage(
        "Menu image enhanced successfully. The enhanced result has been saved to the vault."
      );

      setEnhancingMenuUrl("");
    } catch {
      setSubmitError("Something went wrong while enhancing the menu image.");
      setEnhancingMenuUrl("");
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Restaurant assets
            </p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900">
              {loading ? "Loading..." : restaurant?.name || "Assets"}
            </h1>
            {!loading && restaurant?.slug ? (
              <p className="mt-1 text-sm text-neutral-500">
                Slug: {restaurant.slug}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => loadAssetsPage(slug, true)}
            disabled={loading || refreshing}
            className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh assets"}
          </button>
        </div>

        {previewPair ? (
          <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-neutral-900">
                Before vs After
              </p>
              <button
                type="button"
                onClick={() => setPreviewPair(null)}
                className="text-xs font-medium text-neutral-500"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Original
                </p>
                <img
                  src={previewPair.original}
                  alt="Original preview"
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Enhanced
                </p>
                <img
                  src={previewPair.enhanced}
                  alt="Enhanced preview"
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50"
                />
              </div>
            </div>
          </div>
        ) : null}

        {loadingError ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadingError}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-6">
            {restaurant ? (
              <RestaurantVisualUpgrades
                slug={restaurant.slug}
                hasVisualUpgrades={hasVisualUpgrades}
                hasVibeUpgrade={canUseVibeUpgrade}
                hasMenuUpgrade={canUseMenuUpgrade}
              />
            ) : null}

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-neutral-900">Upload image</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Upload once and reuse later. You can also link the image to a menu
                item now.
              </p>

              <form onSubmit={handleUpload} className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Image file
                  </label>
                  <input
                    id="asset-file-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) =>
                      setSelectedFiles(Array.from(e.target.files || []))
                    }
                    className="block w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm"
                  />
                  <p className="mt-2 text-xs text-neutral-500">
                    You can select multiple images at once. Menu item linking is
                    available for single-image uploads.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Link to menu item (optional)
                  </label>
                  <select
                    value={menuItemId}
                    onChange={(e) => setMenuItemId(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-400"
                  >
                    <option value="">Not linked yet</option>
                    {menuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.category_name ? ` — ${item.category_name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Alt text (optional)
                  </label>
                  <input
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Grilled chicken platter"
                    className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                  />
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
                  disabled={submitting}
                  className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting
                    ? uploadProgress
                      ? `Uploading ${uploadProgress.current} of ${uploadProgress.total}...`
                      : "Uploading..."
                    : selectedFiles.length > 1
                      ? `Upload ${selectedFiles.length} images`
                      : "Upload image"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-neutral-900">Quick stats</h2>

              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Total assets
                  </p>
                  <p className="mt-1 text-2xl font-bold text-neutral-900">
                    {loading ? "—" : assets.length}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Linked to menu item
                  </p>
                  <p className="mt-1 text-2xl font-bold text-neutral-900">
                    {loading
                      ? "—"
                      : assets.filter((asset) => Boolean(asset.menu_item_id)).length}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Unlinked assets
                  </p>
                  <p className="mt-1 text-2xl font-bold text-neutral-900">
                    {loading
                      ? "—"
                      : assets.filter((asset) => !asset.menu_item_id).length}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Active vibe background
                  </p>
                  <p className="mt-1 break-all text-sm font-medium text-neutral-900">
                    {restaurant?.vibe_image_url || "Not selected yet"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Image vault</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Uploaded images for this restaurant. Reuse them across menu items
                  later.
                </p>
              </div>

              <div className="w-full md:w-[280px]">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search file, alt text, item..."
                  className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                />
              </div>
            </div>

            {loading ? (
              <p className="mt-6 text-sm text-neutral-500">Loading assets...</p>
            ) : filteredAssets.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
                <p className="text-sm font-medium text-neutral-700">
                  No assets found.
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  Upload your first image on the left.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredAssets.map((asset) => {
                  const linkedItem = asset.menu_item_id
                    ? menuItemMap.get(asset.menu_item_id)
                    : null;

                  const isCurrentVibe =
                    Boolean(asset.public_url) &&
                    asset.public_url === restaurant?.vibe_image_url;

                  const isSettingThis = settingVibeUrl === asset.public_url;
                  const isEnhancingVibeThis = enhancingVibeUrl === asset.public_url;
                  const isEnhancingMenuThis = enhancingMenuUrl === asset.public_url;
                  const isCopiedThis = copiedUrl === asset.public_url;
                  const isAiEnhanced = isEnhancedAsset(asset);

                  const isCurrentMenuImage =
                    Boolean(asset.public_url) &&
                    Boolean(asset.menu_item_id) &&
                    menuItemMap.get(asset.menu_item_id || "")?.image_url ===
                      asset.public_url;

                  const isSettingMenuThis =
                    Boolean(asset.menu_item_id) &&
                    settingMenuImageItemId === asset.menu_item_id;

                  const isMenuAsset = Boolean(asset.menu_item_id);
                  const isVibeAsset = !asset.menu_item_id;

                  return (
                    <div
                      key={asset.id}
                      className={`overflow-hidden rounded-2xl border bg-neutral-50 ${
                        isCurrentVibe
                          ? "border-emerald-400 ring-2 ring-emerald-200"
                          : "border-neutral-200"
                      }`}
                    >
                      <div className="relative aspect-square bg-white">
                        {asset.public_url ? (
                          <img
                            src={asset.public_url}
                            alt={asset.alt_text || asset.original_file_name || "Asset"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                            No preview
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-neutral-700 shadow"
                          title="Delete image"
                        >
                          ×
                        </button>
                      </div>

                      <div className="space-y-2 p-4">
                        <p className="truncate text-sm font-semibold text-neutral-900">
                          {asset.original_file_name || "Untitled image"}
                        </p>

                        <div className="flex flex-wrap gap-1">
                          {isAiEnhanced ? (
                            <span className="shrink-0 rounded-full bg-purple-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-purple-700">
                              AI Enhanced
                            </span>
                          ) : null}

                          {isCurrentMenuImage ? (
                            <span className="shrink-0 rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                              Live Menu
                            </span>
                          ) : null}

                          {isCurrentVibe ? (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                              Live Vibe
                            </span>
                          ) : null}
                        </div>

                        {linkedItem ? (
                          <p className="text-xs text-blue-700">
                            Assigned to: <span className="font-medium">{linkedItem.name}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-neutral-500">
                            Not assigned — upload can be linked later
                          </p>
                        )}

                        {asset.alt_text ? (
                          <p className="text-xs text-neutral-600">
                            Alt: {asset.alt_text}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
                          <span className="rounded bg-white px-2 py-1">
                            {formatBytes(asset.file_size_bytes)}
                          </span>
                          <span className="rounded bg-white px-2 py-1">
                            {asset.mime_type || "unknown"}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-500">
                          Uploaded: {formatDateTime(asset.created_at)}
                        </p>

                        <div className="grid gap-2 pt-2">
                          {asset.public_url ? (
                            <>
                              <div className="flex flex-wrap gap-2">
                                <a
                                  href={asset.public_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700"
                                >
                                  Open image
                                </a>

                                <button
                                  type="button"
                                  onClick={() => handleCopyUrl(asset.public_url)}
                                  className="inline-flex rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700"
                                >
                                  {isCopiedThis ? "Copied" : "Copy URL"}
                                </button>
                              </div>

                              {isAiEnhanced ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewPair({
                                      original:
                                        asset.public_url?.replace("/enhanced/", "/") || "",
                                      enhanced: asset.public_url || "",
                                    })
                                  }
                                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-xs font-semibold text-neutral-800"
                                >
                                  Compare (Before / After)
                                </button>
                              ) : null}

                              {isMenuAsset ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSetAsMenuImage(asset)}
                                    disabled={
                                      isSettingMenuThis ||
                                      isEnhancingMenuThis ||
                                      !canUseMenuUpgrade
                                    }
                                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white disabled:opacity-60"
                                  >
                                    {!canUseMenuUpgrade
                                      ? "Upgrade plan required"
                                      : isSettingMenuThis
                                      ? "Saving menu image..."
                                      : isCurrentMenuImage
                                      ? "Current menu image"
                                      : "Use as Menu Image"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleEnhanceAsMenu(asset)}
                                    disabled={
                                      isEnhancingMenuThis ||
                                      isEnhancingVibeThis ||
                                      !canUseMenuUpgrade
                                    }
                                    className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800 disabled:opacity-60"
                                  >
                                    {!canUseMenuUpgrade
                                      ? "Upgrade plan required"
                                      : isEnhancingMenuThis
                                      ? "Enhancing as Menu..."
                                      : "Enhance as Menu"}
                                  </button>
                                </>
                              ) : null}

                              {isVibeAsset ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSetAsVibe(asset.public_url)}
                                    disabled={
                                      isSettingThis ||
                                      isEnhancingVibeThis ||
                                      isEnhancingMenuThis ||
                                      !canUseVibeUpgrade
                                    }
                                    className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-xs font-semibold text-white disabled:opacity-60"
                                  >
                                    {!canUseVibeUpgrade
                                      ? "Upgrade plan required"
                                      : isSettingThis
                                      ? "Saving vibe background..."
                                      : isCurrentVibe
                                      ? "Current vibe background"
                                      : "Set as Vibe Background"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleEnhanceAsVibe(asset)}
                                    disabled={
                                      isEnhancingVibeThis ||
                                      isEnhancingMenuThis ||
                                      isSettingThis ||
                                      !canUseVibeUpgrade
                                    }
                                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-xs font-semibold text-neutral-800 disabled:opacity-60"
                                  >
                                    {!canUseVibeUpgrade
                                      ? "Upgrade plan required"
                                      : isEnhancingVibeThis
                                      ? "Enhancing as Vibe..."
                                      : "Enhance as Vibe"}
                                  </button>
                                </>
                              ) : null}
                            </>
                          ) : null}
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
