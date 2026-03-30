"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type Restaurant = {
  id: string;
  name: string;
  slug: string;
};

type MenuCategory = {
  id: string;
  name: string;
  sort_order: number;
};

type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price?: number | null;
  base_price?: number | null;
  sort_order: number | null;
  is_sold_out: boolean;
  image_url?: string | null;
};

type ImportPreviewRow = {
  id: string;
  rowNumber: number;
  categoryName: string;
  itemName: string;
  description: string;
  price: number;
  sortOrder: number;
  isActive: boolean;
  isSoldOut: boolean;
  imageUrl: string | null;
  descriptionSource:
    | "original"
    | "db_matched"
    | "ai_suggested"
    | "empty"
    | "user_edited";
  matchedFromItemName?: string | null;
  warnings: string[];
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

function toCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function getItemPrice(item: MenuItem): number {
  return Number(item.base_price ?? item.price ?? 0);
}

const CSV_TEMPLATE = `category_name,item_name,description,price,sort_order,is_active,is_sold_out,image_url
Burgers,Classic Burger,Beef patty with lettuce and tomato,9.99,1,true,false,
Burgers,Cheese Burger,,10.99,2,true,false,
Sides,French Fries,Crispy golden fries,4.99,1,true,false,
Drinks,Coke,,1.99,1,true,false,
`;

export default function RestaurantMenuAdminPage({ params }: PageProps) {
  const [slug, setSlug] = useState("");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");

  const [categoryId, setCategoryId] = useState("");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [togglingItemId, setTogglingItemId] = useState("");

  const [previewingImport, setPreviewingImport] = useState(false);
  const [committingImport, setCommittingImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importPreviewRows, setImportPreviewRows] = useState<ImportPreviewRow[]>(
    []
  );
  const [aiEnabled, setAiEnabled] = useState(false);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetTargetItemId, setAssetTargetItemId] = useState("");
  const [assetQuery, setAssetQuery] = useState("");
  const [assetFilter, setAssetFilter] = useState<"all" | "linked" | "unlinked">(
    "all"
  );
  const [assigningAssetId, setAssigningAssetId] = useState("");

  async function loadAssets(targetSlug: string) {
    if (!targetSlug) return;

    setLoadingAssets(true);

    try {
      const res = await fetch(`/api/admin/restaurants/${targetSlug}/assets`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load assets.");
      }

      setAssets(Array.isArray(data?.assets) ? data.assets : []);
      setLoadingAssets(false);
    } catch (error) {
      console.error(error);
      setLoadingAssets(false);
    }
  }

  async function loadPage(nextSlugFromState?: string) {
    const targetSlug = nextSlugFromState || slug;
    if (!targetSlug) return;

    setLoading(true);
    setLoadingError("");

    try {
      const res = await fetch(`/api/admin/restaurants/${targetSlug}/menu`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setLoadingError(data?.error || "Failed to load restaurant menu.");
        setLoading(false);
        return;
      }

      setRestaurant(data.restaurant);
      setCategories(data.categories || []);
      setItems(data.items || []);

      if (!categoryId && data.categories?.length) {
        setCategoryId(data.categories[0].id);
      }

      setLoading(false);
    } catch {
      setLoadingError("Something went wrong while loading the menu page.");
      setLoading(false);
    }
  }

  useEffect(() => {
    async function init() {
      const resolved = await params;
      const nextSlug = cleanSlug(resolved?.slug);
      setSlug(nextSlug);
      await Promise.all([loadPage(nextSlug), loadAssets(nextSlug)]);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const groupedCategories = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      items: items
        .filter((item) => item.category_id === category.id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }));
  }, [categories, items]);

  const previewSummary = useMemo(() => {
    const total = importPreviewRows.length;
    const aiSuggested = importPreviewRows.filter(
      (row) => row.descriptionSource === "ai_suggested"
    ).length;
    const dbMatched = importPreviewRows.filter(
      (row) => row.descriptionSource === "db_matched"
    ).length;
    const emptyDescriptions = importPreviewRows.filter(
      (row) => !row.description.trim()
    ).length;

    return {
      total,
      aiSuggested,
      dbMatched,
      emptyDescriptions,
    };
  }, [importPreviewRows]);

  const targetItem = useMemo(() => {
    return items.find((item) => item.id === assetTargetItemId) || null;
  }, [items, assetTargetItemId]);

  const filteredAssets = useMemo(() => {
    const q = assetQuery.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesQuery =
        !q ||
        String(asset.original_file_name || "")
          .toLowerCase()
          .includes(q) ||
        String(asset.alt_text || "")
          .toLowerCase()
          .includes(q);

      const isLinked = Boolean(asset.menu_item_id);

      const matchesFilter =
        assetFilter === "all" ||
        (assetFilter === "linked" && isLinked) ||
        (assetFilter === "unlinked" && !isLinked);

      return matchesQuery && matchesFilter;
    });
  }, [assets, assetQuery, assetFilter]);

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "menu-import-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (submitting) return;

    setSubmitError("");
    setSuccessMessage("");

    if (!categoryId) {
      setSubmitError("Please choose a category.");
      return;
    }

    if (!itemName.trim()) {
      setSubmitError("Please enter an item name.");
      return;
    }

    if (price.trim() === "" || Number(price) < 0) {
      setSubmitError("Please enter a valid price.");
      return;
    }

    setSubmitting(true);

    try {
      const numericPrice = Number(price);

      const res = await fetch(`/api/admin/restaurants/${slug}/menu-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
          name: itemName.trim(),
          description: description.trim(),
          base_price: numericPrice,
          price: numericPrice,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data?.error || "Failed to add item.");
        setSubmitting(false);
        return;
      }

      setItemName("");
      setDescription("");
      setPrice("");
      setSuccessMessage("Item added successfully.");

      await loadPage(slug);
      setSubmitting(false);
    } catch {
      setSubmitError("Something went wrong while adding the item.");
      setSubmitting(false);
    }
  }

  async function handleToggleSoldOut(itemId: string, nextValue: boolean) {
    if (!slug || togglingItemId) return;

    setSubmitError("");
    setSuccessMessage("");
    setTogglingItemId(itemId);

    try {
      const res = await fetch(
        `/api/admin/restaurants/${slug}/menu-items/${itemId}/availability`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_sold_out: nextValue,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data?.error || "Failed to update item availability.");
        setTogglingItemId("");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, is_sold_out: nextValue } : item
        )
      );

      setSuccessMessage(
        nextValue ? "Item marked as sold out." : "Item marked as available."
      );
      setTogglingItemId("");
    } catch {
      setSubmitError("Something went wrong while updating item availability.");
      setTogglingItemId("");
    }
  }

  async function handlePreviewImport(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!slug) return;

    setSubmitError("");
    setSuccessMessage("");

    if (!csvFile) {
      setSubmitError("Please choose a CSV file to preview.");
      return;
    }

    setPreviewingImport(true);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      const res = await fetch(`/api/admin/restaurants/${slug}/menu/import`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data?.error || "Failed to preview import.");
        setPreviewingImport(false);
        return;
      }

      setAiEnabled(Boolean(data?.aiEnabled));
      setImportPreviewRows(data?.previewRows || []);
      setSuccessMessage(data?.message || "Preview ready.");
      setPreviewingImport(false);
    } catch {
      setSubmitError("Something went wrong while preparing the preview.");
      setPreviewingImport(false);
    }
  }

  async function handleCommitImport() {
    if (!slug || !importPreviewRows.length || committingImport) return;

    setSubmitError("");
    setSuccessMessage("");
    setCommittingImport(true);

    try {
      const res = await fetch(`/api/admin/restaurants/${slug}/menu/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "commit",
          rows: importPreviewRows,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data?.error || "Failed to import preview rows.");
        setCommittingImport(false);
        return;
      }

      setSuccessMessage(data?.message || "Import complete.");
      setImportPreviewRows([]);
      setCsvFile(null);

      const input = document.getElementById(
        "csv-file-input"
      ) as HTMLInputElement | null;
      if (input) input.value = "";

      await loadPage(slug);
      setCommittingImport(false);
    } catch {
      setSubmitError("Something went wrong while importing preview rows.");
      setCommittingImport(false);
    }
  }

  function updatePreviewRow(
    rowId: string,
    field: keyof ImportPreviewRow,
    value: string | number | boolean | null
  ) {
    setImportPreviewRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        const nextRow = {
          ...row,
          [field]: value,
        } as ImportPreviewRow;

        if (field === "description") {
          nextRow.descriptionSource = value ? "user_edited" : "empty";
          nextRow.matchedFromItemName = null;
        }

        return nextRow;
      })
    );
  }

  function removePreviewRow(rowId: string) {
    setImportPreviewRows((prev) => prev.filter((row) => row.id !== rowId));
  }

  function clearPreview() {
    setImportPreviewRows([]);
    setCsvFile(null);

    const input = document.getElementById(
      "csv-file-input"
    ) as HTMLInputElement | null;
    if (input) input.value = "";
  }

  function sourceBadge(row: ImportPreviewRow) {
    if (row.descriptionSource === "ai_suggested") {
      return (
        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          AI suggested
        </span>
      );
    }

    if (row.descriptionSource === "db_matched") {
      return (
        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          DB matched
        </span>
      );
    }

    if (row.descriptionSource === "user_edited") {
      return (
        <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700">
          Edited
        </span>
      );
    }

    if (row.descriptionSource === "original") {
      return (
        <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          Original
        </span>
      );
    }

    return (
      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        Empty
      </span>
    );
  }

  function openAssetModal(itemId: string) {
    setAssetTargetItemId(itemId);
    setAssetQuery("");
    setAssetFilter("all");
    setAssetModalOpen(true);
  }

  function closeAssetModal() {
    setAssetModalOpen(false);
    setAssetTargetItemId("");
    setAssetQuery("");
    setAssetFilter("all");
    setAssigningAssetId("");
  }

  async function assignAssetToItem(asset: Asset) {
    if (!slug || !assetTargetItemId || !asset.public_url || assigningAssetId) {
      return;
    }

    setAssigningAssetId(asset.id);
    setSubmitError("");
    setSuccessMessage("");

    try {
      const res = await fetch(
        `/api/admin/restaurants/${slug}/menu-items/${assetTargetItemId}/image`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image_url: asset.public_url,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data?.error || "Failed to assign image.");
        setAssigningAssetId("");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === assetTargetItemId
            ? { ...item, image_url: asset.public_url }
            : item
        )
      );

      setSuccessMessage("Image assigned to menu item.");
      setAssigningAssetId("");
      closeAssetModal();
    } catch {
      setSubmitError("Something went wrong while assigning the image.");
      setAssigningAssetId("");
    }
  }

  async function clearItemImage(itemId: string) {
    if (!slug || assigningAssetId) return;

    setAssigningAssetId(itemId);
    setSubmitError("");
    setSuccessMessage("");

    try {
      const res = await fetch(
        `/api/admin/restaurants/${slug}/menu-items/${itemId}/image`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clear: true,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data?.error || "Failed to remove image.");
        setAssigningAssetId("");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, image_url: null } : item
        )
      );

      setSuccessMessage("Image removed from menu item.");
      setAssigningAssetId("");
    } catch {
      setSubmitError("Something went wrong while removing the image.");
      setAssigningAssetId("");
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-6xl p-6">
        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              {loading ? (
                <div>
                  <h1 className="text-xl font-bold text-neutral-900">Loading...</h1>
                </div>
              ) : loadingError ? (
                <div>
                  <h1 className="text-xl font-bold text-red-700">Error</h1>
                  <p className="mt-2 text-sm text-neutral-600">{loadingError}</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Restaurant menu admin
                  </p>

                  <h1 className="mt-2 text-2xl font-bold text-neutral-900">
                    {restaurant?.name}
                  </h1>

                  <p className="mt-1 text-sm text-neutral-500">
                    Slug: {restaurant?.slug}
                  </p>

                  <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4">
                    <p className="text-sm font-semibold text-green-800">
                      Restaurant onboarded successfully.
                    </p>
                    <p className="mt-1 text-sm text-green-700">
                      Add menu items below or import from a clean CSV template.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        Category
                      </label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-400"
                      >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        Item name
                      </label>
                      <input
                        type="text"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="Chicken Over Rice"
                        className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional description"
                        className="min-h-[100px] w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="9.99"
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
                      {submitting ? "Adding item..." : "Add item"}
                    </button>
                  </form>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">
                    Import from template
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Upload a clean CSV. Required columns: category_name, item_name,
                    price. Description can be blank.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700"
                >
                  Download template
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                <p className="font-medium text-neutral-800">How this works</p>
                <p className="mt-2">
                  Upload the template even if some optional columns are blank. We
                  will reuse matching descriptions from your data first, then fill
                  missing descriptions with AI suggestions for review.
                </p>
              </div>

              <p className="mt-4 text-sm text-neutral-500">
                Accepted columns:
                <span className="mt-2 block rounded bg-neutral-100 px-3 py-2 font-mono text-xs text-neutral-700">
                  category_name,item_name,description,price,sort_order,is_active,is_sold_out,image_url
                </span>
              </p>

              <form onSubmit={handlePreviewImport} className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    CSV file
                  </label>
                  <input
                    id="csv-file-input"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="block w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={previewingImport}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {previewingImport ? "Preparing preview..." : "Preview import"}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            {importPreviewRows.length > 0 ? (
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">
                      Import preview
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      Review everything before import. Descriptions marked{" "}
                      <span className="font-medium text-blue-700">AI suggested</span>{" "}
                      were generated once and can be edited.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={clearPreview}
                      className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700"
                    >
                      Clear preview
                    </button>
                    <button
                      type="button"
                      onClick={handleCommitImport}
                      disabled={committingImport}
                      className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {committingImport ? "Importing..." : "Approve and import"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      Rows
                    </p>
                    <p className="mt-1 text-lg font-bold text-neutral-900">
                      {previewSummary.total}
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      DB matched
                    </p>
                    <p className="mt-1 text-lg font-bold text-amber-700">
                      {previewSummary.dbMatched}
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      AI suggested
                    </p>
                    <p className="mt-1 text-lg font-bold text-blue-700">
                      {previewSummary.aiSuggested}
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      Empty descriptions
                    </p>
                    <p className="mt-1 text-lg font-bold text-red-700">
                      {previewSummary.emptyDescriptions}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-neutral-100 px-2 py-1 text-neutral-700">
                    CSV template import
                  </span>
                  <span className="rounded bg-neutral-100 px-2 py-1 text-neutral-700">
                    AI: {aiEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  {importPreviewRows.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-neutral-500">
                            Row {row.rowNumber}
                          </span>
                          {sourceBadge(row)}
                          {row.matchedFromItemName ? (
                            <span className="text-xs text-neutral-500">
                              from: {row.matchedFromItemName}
                            </span>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => removePreviewRow(row.id)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700"
                        >
                          Remove row
                        </button>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-neutral-700">
                            Category
                          </label>
                          <input
                            type="text"
                            value={row.categoryName}
                            onChange={(e) =>
                              updatePreviewRow(row.id, "categoryName", e.target.value)
                            }
                            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-400"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-neutral-700">
                            Item name
                          </label>
                          <input
                            type="text"
                            value={row.itemName}
                            onChange={(e) =>
                              updatePreviewRow(row.id, "itemName", e.target.value)
                            }
                            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-400"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-neutral-700">
                            Price
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.price}
                            onChange={(e) =>
                              updatePreviewRow(row.id, "price", Number(e.target.value))
                            }
                            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-400"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-neutral-700">
                            Sort order
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={row.sortOrder}
                            onChange={(e) =>
                              updatePreviewRow(row.id, "sortOrder", Number(e.target.value))
                            }
                            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-400"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-medium text-neutral-700">
                          Description
                        </label>
                        <textarea
                          value={row.description}
                          onChange={(e) =>
                            updatePreviewRow(row.id, "description", e.target.value)
                          }
                          placeholder="Description can stay blank, or edit as needed"
                          className="min-h-[92px] w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                        />
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-neutral-700">
                            Image URL
                          </label>
                          <input
                            type="text"
                            value={row.imageUrl || ""}
                            onChange={(e) =>
                              updatePreviewRow(row.id, "imageUrl", e.target.value)
                            }
                            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-400"
                          />
                        </div>

                        <div className="flex items-end gap-6">
                          <label className="flex items-center gap-2 text-sm text-neutral-700">
                            <input
                              type="checkbox"
                              checked={row.isActive}
                              onChange={(e) =>
                                updatePreviewRow(row.id, "isActive", e.target.checked)
                              }
                            />
                            Active
                          </label>

                          <label className="flex items-center gap-2 text-sm text-neutral-700">
                            <input
                              type="checkbox"
                              checked={row.isSoldOut}
                              onChange={(e) =>
                                updatePreviewRow(row.id, "isSoldOut", e.target.checked)
                              }
                            />
                            Sold out
                          </label>
                        </div>
                      </div>

                      {row.warnings.length > 0 ? (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                          {row.warnings.join(" ")}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-neutral-900">Menu items</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Categories and items for this restaurant’s main menu.
              </p>

              {loading ? (
                <p className="mt-6 text-sm text-neutral-500">Loading menu...</p>
              ) : loadingError ? (
                <p className="mt-6 text-sm text-red-600">{loadingError}</p>
              ) : groupedCategories.length === 0 ? (
                <p className="mt-6 text-sm text-neutral-500">
                  No categories found.
                </p>
              ) : (
                <div className="mt-6 space-y-6">
                  {groupedCategories.map((category) => (
                    <div
                      key={category.id}
                      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-neutral-900">
                            {category.name}
                          </h3>
                          <p className="text-xs text-neutral-500">
                            Sort order: {category.sort_order}
                          </p>
                        </div>
                        <p className="text-xs font-medium text-neutral-500">
                          {category.items.length} item
                          {category.items.length === 1 ? "" : "s"}
                        </p>
                      </div>

                      {category.items.length === 0 ? (
                        <p className="mt-4 text-sm text-neutral-500">
                          No items yet in this category.
                        </p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {category.items.map((item) => (
                            <div
                              key={item.id}
                              className={`rounded-xl border px-4 py-3 ${
                                item.is_sold_out
                                  ? "border-red-200 bg-red-50"
                                  : "border-neutral-200 bg-white"
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
                                  {item.image_url ? (
                                    <img
                                      src={item.image_url}
                                      alt={item.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[11px] text-neutral-400">
                                      No image
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-neutral-900">
                                          {item.name}
                                        </p>

                                        {item.is_sold_out ? (
                                          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                            Sold Out
                                          </span>
                                        ) : (
                                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                            Available
                                          </span>
                                        )}
                                      </div>

                                      {item.description &&
                                      item.description.trim() &&
                                      item.description.trim() !== item.name.trim() ? (
                                        <p className="mt-1 text-sm text-neutral-500">
                                          {item.description}
                                        </p>
                                      ) : null}
                                    </div>

                                    <p className="shrink-0 text-sm font-semibold text-neutral-900">
                                      {toCurrency(getItemPrice(item))}
                                    </p>
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={togglingItemId === item.id}
                                      onClick={() =>
                                        handleToggleSoldOut(item.id, !item.is_sold_out)
                                      }
                                      className={`rounded-full px-4 py-2 text-xs font-semibold ${
                                        item.is_sold_out
                                          ? "bg-neutral-900 text-white disabled:opacity-60"
                                          : "bg-red-600 text-white disabled:opacity-60"
                                      }`}
                                    >
                                      {togglingItemId === item.id
                                        ? "Saving..."
                                        : item.is_sold_out
                                        ? "Mark Available"
                                        : "Mark Sold Out"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => openAssetModal(item.id)}
                                      className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700"
                                    >
                                      Choose from Vault
                                    </button>

                                    {item.image_url ? (
                                      <button
                                        type="button"
                                        disabled={assigningAssetId === item.id}
                                        onClick={() => clearItemImage(item.id)}
                                        className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 disabled:opacity-60"
                                      >
                                        {assigningAssetId === item.id
                                          ? "Removing..."
                                          : "Remove Image"}
                                      </button>
                                    ) : null}
                                  </div>

                                  {item.image_url ? (
                                    <p className="mt-2 break-all text-xs text-neutral-400">
                                      Image: {item.image_url}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {assetModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-neutral-200 px-6 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">
                    Choose from Vault
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    {targetItem
                      ? `Assign an uploaded image to ${targetItem.name}`
                      : "Assign an uploaded image to this menu item"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeAssetModal}
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                <input
                  type="text"
                  value={assetQuery}
                  onChange={(e) => setAssetQuery(e.target.value)}
                  placeholder="Search file name or alt text"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                />

                <select
                  value={assetFilter}
                  onChange={(e) =>
                    setAssetFilter(
                      e.target.value as "all" | "linked" | "unlinked"
                    )
                  }
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-400"
                >
                  <option value="all">All assets</option>
                  <option value="linked">Linked only</option>
                  <option value="unlinked">Unlinked only</option>
                </select>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              {loadingAssets ? (
                <p className="text-sm text-neutral-500">Loading assets...</p>
              ) : filteredAssets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center">
                  <p className="text-sm font-medium text-neutral-700">
                    No matching assets found.
                  </p>
                  <p className="mt-2 text-sm text-neutral-500">
                    Upload more images from the Assets page or adjust your search.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50"
                    >
                      <div className="aspect-square bg-white">
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
                      </div>

                      <div className="space-y-2 p-4">
                        <p className="truncate text-sm font-semibold text-neutral-900">
                          {asset.original_file_name || "Untitled image"}
                        </p>

                        {asset.alt_text ? (
                          <p className="text-xs text-neutral-600">
                            Alt: {asset.alt_text}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
                          <span className="rounded bg-white px-2 py-1">
                            {asset.mime_type || "unknown"}
                          </span>
                          <span className="rounded bg-white px-2 py-1">
                            {asset.menu_item_id ? "Linked" : "Unlinked"}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={!asset.public_url || assigningAssetId === asset.id}
                          onClick={() => assignAssetToItem(asset)}
                          className="mt-2 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {assigningAssetId === asset.id
                            ? "Assigning..."
                            : "Use this image"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}