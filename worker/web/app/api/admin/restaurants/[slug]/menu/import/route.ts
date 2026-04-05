import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MENU_MODEL = process.env.OPENAI_MENU_MODEL || "gpt-5.4-nano";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

type ParsedSourceRow = {
  rowNumber: number;
  categoryName: string;
  itemName: string;
  description: string;
  price: number;
  sortOrder: number;
  isActive: boolean;
  isSoldOut: boolean;
  imageUrl: string | null;
  warnings: string[];
};

type PreviewRow = {
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

type CommitRow = PreviewRow;

type RestaurantRecord = {
  id: string;
  name: string;
  slug: string;
};

type MenuRecord = {
  id: string;
  name: string;
};

type MenuCategoryRecord = {
  id: string;
  name: string;
  sort_order: number | null;
};

type MenuItemRecord = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
};

type DescriptionLibraryEntry = {
  itemName: string;
  description: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

const HEADER_ALIASES: Record<string, string> = {
  category: "category_name",
  category_name: "category_name",
  categoryname: "category_name",
  menu_group: "category_name",
  menu_section: "category_name",
  section: "category_name",

  item: "item_name",
  item_name: "item_name",
  itemname: "item_name",
  name: "item_name",
  product: "item_name",
  product_name: "item_name",

  description: "description",
  details: "description",
  desc: "description",

  price: "price",
  item_price: "price",
  retail_price: "price",
  sell_price: "price",

  sort: "sort_order",
  order: "sort_order",
  sort_order: "sort_order",

  active: "is_active",
  is_active: "is_active",
  available: "is_active",

  sold_out: "is_sold_out",
  is_sold_out: "is_sold_out",

  image: "image_url",
  image_url: "image_url",
  image_link: "image_url",
  photo_url: "image_url",
};

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeItemName(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeader(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\uFEFF/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, "_")
    .trim();
}

function normalizeAssetMatchText(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadRestaurantAssetMap(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string
) {
  const { data, error } = await supabase
    .schema("food_ordering")
    .from("menu_item_assets")
    .select("id, original_file_name, public_url, alt_text")
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(`Failed to load restaurant assets: ${error.message}`);
  }

  const map = new Map<string, { public_url: string | null }>();

  for (const asset of data || []) {
    const altKey = normalizeAssetMatchText(String(asset.alt_text || ""));
    const fileKey = normalizeAssetMatchText(
      String(asset.original_file_name || "")
    );

    if (altKey) {
      map.set(altKey, { public_url: asset.public_url || null });
    }

    if (fileKey) {
      map.set(fileKey, { public_url: asset.public_url || null });
    }
  }

  return map;
}

function resolveImageUrl(
  row: ParsedSourceRow,
  assetMap: Map<string, { public_url: string | null }>
): string | null {
  const rawImageValue = normalizeText(row.imageUrl || "");
  const rawItemName = normalizeText(row.itemName || "");

  if (/^https?:\/\//i.test(rawImageValue)) {
    return rawImageValue;
  }

  const imageKey = normalizeAssetMatchText(rawImageValue);
  if (imageKey) {
    const asset = assetMap.get(imageKey);
    if (asset?.public_url) return asset.public_url;
  }

  const itemKey = normalizeAssetMatchText(rawItemName);
  if (itemKey) {
    const asset = assetMap.get(itemKey);
    if (asset?.public_url) return asset.public_url;
  }

  return rawImageValue || null;
}

function parseBoolean(value: string, defaultValue = true): boolean {
  const v = normalizeText(value).toLowerCase();

  if (!v) return defaultValue;
  if (["true", "1", "yes", "y"].includes(v)) return true;
  if (["false", "0", "no", "n"].includes(v)) return false;

  return defaultValue;
}

function parseNumber(value: string, defaultValue = 0): number {
  const cleaned = normalizeText(value).replace(/\$/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : defaultValue;
}

function isFiniteNonNegativeNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function parseCsvLine(line: string): string[] {
  const safeLine = String(line ?? "");
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < safeLine.length; i++) {
    const char = safeLine[i];
    const next = safeLine[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());

  const cleaned = result.map((value) =>
    String(value ?? "").replace(/^"(.*)"$/, "$1").trim()
  );

  if (
    cleaned.length === 1 &&
    cleaned[0].includes(",") &&
    safeLine.trim().startsWith('"') &&
    safeLine.trim().endsWith('"')
  ) {
    return cleaned[0].split(",").map((value) => String(value ?? "").trim());
  }

  return cleaned;
}

function parseStructuredCsv(text: string): ParsedSourceRow[] {
  const lines = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => String(line ?? "").trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error(
      "CSV must include a header row and at least one data row."
    );
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map((header) => {
    const normalized = normalizeHeader(String(header ?? ""));
    return HEADER_ALIASES[normalized] || normalized;
  });

  const requiredHeaders = ["category_name", "item_name", "price"];

  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      throw new Error(
        "Invalid CSV format. Required columns: category_name, item_name, price."
      );
    }
  }

  const rows: ParsedSourceRow[] = [];

  for (let index = 1; index < lines.length; index++) {
    const values = parseCsvLine(lines[index]);

    if (values.every((value) => !normalizeText(String(value ?? "")))) {
      continue;
    }

    const rowRecord: Record<string, string> = {};
    headers.forEach((header, i) => {
      rowRecord[header] = String(values[i] ?? "");
    });

    const rowNumber = index + 1;
    const warnings: string[] = [];

    const categoryName = normalizeText(rowRecord.category_name || "");
    const itemName = normalizeText(rowRecord.item_name || "");
    const description = normalizeText(rowRecord.description || "");
    const price = parseNumber(rowRecord.price, NaN);
    const sortOrder = parseNumber(rowRecord.sort_order, rows.length + 1);
    const isActive = parseBoolean(rowRecord.is_active, true);
    const isSoldOut = parseBoolean(rowRecord.is_sold_out, false);
    const imageUrl = normalizeText(rowRecord.image_url || "") || null;

    if (!categoryName) {
      warnings.push("Missing category name.");
    }

    if (!itemName) {
      warnings.push("Missing item name.");
    }

    if (!isFiniteNonNegativeNumber(price)) {
      warnings.push("Invalid price.");
    }

    if (!warnings.length) {
      rows.push({
        rowNumber,
        categoryName,
        itemName,
        description,
        price,
        sortOrder,
        isActive,
        isSoldOut,
        imageUrl,
        warnings,
      });
    }
  }

  if (!rows.length) {
    throw new Error(
      "No valid menu rows were found. Make sure category_name, item_name, and price are filled."
    );
  }

  return rows;
}

async function loadRestaurantAndMenu(
  supabase: ReturnType<typeof createClient>,
  slug: string
): Promise<{
  restaurant: RestaurantRecord;
  menu: MenuRecord;
}> {
  const { data: restaurant, error: restaurantError } = await supabase
    .schema("food_ordering")
    .from("restaurants")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (restaurantError || !restaurant) {
    throw new Error("Restaurant not found.");
  }

  const { data: menu, error: menuError } = await supabase
    .schema("food_ordering")
    .from("menus")
    .select("id, name")
    .eq("restaurant_id", restaurant.id)
    .eq("name", "Main Menu")
    .single();

  if (menuError || !menu) {
    throw new Error("Main Menu not found.");
  }

  return {
    restaurant: restaurant as RestaurantRecord,
    menu: menu as MenuRecord,
  };
}

async function loadRestaurantCategoryMap(
  supabase: ReturnType<typeof createClient>,
  menuId: string
): Promise<Map<string, MenuCategoryRecord>> {
  const { data, error } = await supabase
    .schema("food_ordering")
    .from("menu_categories")
    .select("id, name, sort_order")
    .eq("menu_id", menuId);

  if (error) {
    throw new Error(`Failed to load categories: ${error.message}`);
  }

  const map = new Map<string, MenuCategoryRecord>();

  for (const category of (data || []) as MenuCategoryRecord[]) {
    map.set(normalizeText(category.name).toLowerCase(), category);
  }

  return map;
}

async function loadDescriptionLibraries(
  supabase: ReturnType<typeof createClient>,
  categoryMap: Map<string, MenuCategoryRecord>
) {
  const categoryIds = Array.from(categoryMap.values()).map((value) => value.id);

  const { data: restaurantItems, error: restaurantItemsError } =
    categoryIds.length > 0
      ? await supabase
          .schema("food_ordering")
          .from("menu_items")
          .select("id, category_id, name, description")
          .in("category_id", categoryIds)
      : { data: [], error: null as { message?: string } | null };

  if (restaurantItemsError) {
    throw new Error(
      `Failed to load existing menu items: ${restaurantItemsError.message}`
    );
  }

  const { data: globalItems, error: globalItemsError } = await supabase
    .schema("food_ordering")
    .from("menu_items")
    .select("id, category_id, name, description")
    .not("description", "is", null)
    .limit(5000);

  if (globalItemsError) {
    throw new Error(
      `Failed to load description library: ${globalItemsError.message}`
    );
  }

  const restaurantLibrary = new Map<string, DescriptionLibraryEntry>();
  const globalLibrary = new Map<string, DescriptionLibraryEntry>();

  for (const item of (restaurantItems || []) as MenuItemRecord[]) {
    const description = normalizeText(item.description || "");
    const itemName = normalizeText(item.name || "");

    if (
      !description ||
      !itemName ||
      description.toLowerCase() === itemName.toLowerCase()
    ) {
      continue;
    }

    const key = normalizeItemName(itemName);
    if (!restaurantLibrary.has(key)) {
      restaurantLibrary.set(key, { itemName, description });
    }
  }

  for (const item of (globalItems || []) as MenuItemRecord[]) {
    const description = normalizeText(item.description || "");
    const itemName = normalizeText(item.name || "");

    if (
      !description ||
      !itemName ||
      description.toLowerCase() === itemName.toLowerCase()
    ) {
      continue;
    }

    const key = normalizeItemName(itemName);
    if (!globalLibrary.has(key)) {
      globalLibrary.set(key, { itemName, description });
    }
  }

  return { restaurantLibrary, globalLibrary };
}

async function generateAiDescriptions(
  restaurantName: string,
  rows: PreviewRow[]
): Promise<Map<string, string>> {
  const rowsNeedingDescriptions = rows.filter(
    (row) => !normalizeText(row.description) && row.itemName
  );

  const descriptions = new Map<string, string>();

  if (!OPENAI_API_KEY || !rowsNeedingDescriptions.length) {
    return descriptions;
  }

  const batchSize = 20;

  for (let i = 0; i < rowsNeedingDescriptions.length; i += batchSize) {
    const batch = rowsNeedingDescriptions.slice(i, i + batchSize);

    const payload = {
      model: OPENAI_MENU_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You write short, plain restaurant menu descriptions. " +
            "Keep each description short and clear. No hype or marketing language. " +
            "Do not invent ingredients unless strongly implied by item name or category. " +
            "Do not invent halal, zabiha, vegan, organic, homemade, angus, gluten-free, or similar claims. " +
            "Do not mention sides, drinks, options, sauces, or toppings unless clearly implied. " +
            'Return valid JSON only in this format: {"items":[{"id":"string","description":"string"}]}.',
        },
        {
          role: "user",
          content: JSON.stringify({
            restaurant_name: restaurantName,
            items: batch.map((row) => ({
              id: row.id,
              category_name: row.categoryName,
              item_name: row.itemName,
            })),
          }),
        },
      ],
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("AI description request failed:", await response.text());
      continue;
    }

    const json = (await response.json()) as ChatCompletionResponse;
    const content = json.choices?.[0]?.message?.content || "";

    try {
      const parsed = JSON.parse(content) as {
        items?: Array<{ id: string; description: string }>;
      };

      for (const item of parsed.items || []) {
        const description = normalizeText(item.description || "");
        if (item.id && description) {
          descriptions.set(item.id, description);
        }
      }
    } catch (error) {
      console.error("Failed to parse AI description JSON:", error, content);
    }
  }

  return descriptions;
}

async function buildPreviewRows(
  supabase: ReturnType<typeof createClient>,
  slug: string,
  parsedRows: ParsedSourceRow[]
): Promise<PreviewRow[]> {
  const { restaurant, menu } = await loadRestaurantAndMenu(supabase, slug);
  const assetMap = await loadRestaurantAssetMap(supabase, restaurant.id);
  const categoryMap = await loadRestaurantCategoryMap(supabase, menu.id);
  const { restaurantLibrary, globalLibrary } =
    await loadDescriptionLibraries(supabase, categoryMap);

  const previewRows: PreviewRow[] = parsedRows.map((row) => {
    const normalizedName = normalizeItemName(row.itemName);
    const existingDescription = normalizeText(row.description || "");
    const resolvedImageUrl = resolveImageUrl(row, assetMap);

    if (existingDescription) {
      return {
        id: makeId(),
        rowNumber: row.rowNumber,
        categoryName: row.categoryName,
        itemName: row.itemName,
        description: existingDescription,
        price: row.price,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        isSoldOut: row.isSoldOut,
        imageUrl: resolvedImageUrl,
        descriptionSource: "original",
        matchedFromItemName: null,
        warnings: row.warnings,
      };
    }

    const restaurantMatch = restaurantLibrary.get(normalizedName);
    if (restaurantMatch) {
      return {
        id: makeId(),
        rowNumber: row.rowNumber,
        categoryName: row.categoryName,
        itemName: row.itemName,
        description: restaurantMatch.description,
        price: row.price,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        isSoldOut: row.isSoldOut,
        imageUrl: resolvedImageUrl,
        descriptionSource: "db_matched",
        matchedFromItemName: restaurantMatch.itemName,
        warnings: row.warnings,
      };
    }

    const globalMatch = globalLibrary.get(normalizedName);
    if (globalMatch) {
      return {
        id: makeId(),
        rowNumber: row.rowNumber,
        categoryName: row.categoryName,
        itemName: row.itemName,
        description: globalMatch.description,
        price: row.price,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        isSoldOut: row.isSoldOut,
        imageUrl: resolvedImageUrl,
        descriptionSource: "db_matched",
        matchedFromItemName: globalMatch.itemName,
        warnings: row.warnings,
      };
    }

    return {
      id: makeId(),
      rowNumber: row.rowNumber,
      categoryName: row.categoryName,
      itemName: row.itemName,
      description: "",
      price: row.price,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      isSoldOut: row.isSoldOut,
      imageUrl: resolvedImageUrl,
      descriptionSource: "empty",
      matchedFromItemName: null,
      warnings: row.warnings,
    };
  });

  const aiDescriptions = await generateAiDescriptions(restaurant.name, previewRows);

  for (const row of previewRows) {
    if (row.descriptionSource !== "empty") continue;

    const aiDescription = normalizeText(aiDescriptions.get(row.id) || "");
    if (!aiDescription) continue;

    row.description = aiDescription;
    row.descriptionSource = "ai_suggested";
  }

  return previewRows;
}

function sanitizeCommitRows(input: unknown): CommitRow[] {
  if (!Array.isArray(input)) {
    throw new Error("Commit rows are required.");
  }

  const rows: CommitRow[] = [];

  for (const rawRow of input) {
    if (!rawRow || typeof rawRow !== "object") continue;
    const row = rawRow as Partial<CommitRow>;

    const categoryName = normalizeText(String(row.categoryName || ""));
    const itemName = normalizeText(String(row.itemName || ""));
    const description = normalizeText(String(row.description || ""));
    const price = Number(row.price);
    const sortOrder = Number(row.sortOrder);
    const imageUrl = normalizeText(String(row.imageUrl || "")) || null;
    const warnings = Array.isArray(row.warnings)
      ? row.warnings.map((warning) => String(warning))
      : [];

    if (!categoryName || !itemName || !isFiniteNonNegativeNumber(price)) {
      continue;
    }

    rows.push({
      id: String(row.id || makeId()),
      rowNumber: Number(row.rowNumber || 0),
      categoryName,
      itemName,
      description,
      price,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : rows.length + 1,
      isActive: row.isActive !== false,
      isSoldOut: row.isSoldOut === true,
      imageUrl,
      descriptionSource: (row.descriptionSource ||
        (description ? "original" : "empty")) as CommitRow["descriptionSource"],
      matchedFromItemName: row.matchedFromItemName || null,
      warnings,
    });
  }

  if (!rows.length) {
    throw new Error("No valid rows available to import.");
  }

  return rows;
}

async function commitRows(
  supabase: ReturnType<typeof createClient>,
  slug: string,
  rows: CommitRow[]
) {
  const { restaurant, menu } = await loadRestaurantAndMenu(supabase, slug);

  const { data: existingCategories, error: categoriesError } = await supabase
    .schema("food_ordering")
    .from("menu_categories")
    .select("id, name, sort_order")
    .eq("menu_id", menu.id);

  if (categoriesError) {
    throw new Error(`Failed to load categories: ${categoriesError.message}`);
  }

  const categoryMap = new Map(
    ((existingCategories || []) as MenuCategoryRecord[]).map((category) => [
      normalizeText(category.name).toLowerCase(),
      category,
    ])
  );

  let createdCategories = 0;
  let insertedItems = 0;
  let updatedItems = 0;

  for (const row of rows) {
    let category = categoryMap.get(normalizeText(row.categoryName).toLowerCase());

    if (!category) {
      const nextSortOrder =
        (existingCategories?.length || 0) + createdCategories + 1;

      const { data: insertedCategory, error: insertCategoryError } =
        await supabase
          .schema("food_ordering")
          .from("menu_categories")
          .insert({
            menu_id: menu.id,
            name: row.categoryName,
            sort_order: nextSortOrder,
            is_active: true,
          })
          .select("id, name, sort_order")
          .single();

      if (insertCategoryError || !insertedCategory) {
        throw new Error(
          `Failed to create category "${row.categoryName}": ${
            insertCategoryError?.message ?? "unknown error"
          }`
        );
      }

      category = insertedCategory as MenuCategoryRecord;
      categoryMap.set(normalizeText(row.categoryName).toLowerCase(), category);
      createdCategories++;
    }

    const { data: existingItem, error: existingItemError } = await supabase
      .schema("food_ordering")
      .from("menu_items")
      .select("id")
      .eq("category_id", category.id)
      .eq("name", row.itemName)
      .maybeSingle();

    if (existingItemError) {
      throw new Error(
        `Failed to look up item "${row.itemName}": ${existingItemError.message}`
      );
    }

    if (existingItem?.id) {
      const { error: updateItemError } = await supabase
        .schema("food_ordering")
        .from("menu_items")
        .update({
          description: row.description || null,
          base_price: row.price,
          price: row.price,
          sort_order: row.sortOrder,
          is_active: row.isActive,
          is_sold_out: row.isSoldOut,
          image_url: row.imageUrl,
        })
        .eq("id", existingItem.id);

      if (updateItemError) {
        throw new Error(
          `Failed to update item "${row.itemName}": ${updateItemError.message}`
        );
      }

      updatedItems++;
    } else {
      const { error: insertItemError } = await supabase
        .schema("food_ordering")
        .from("menu_items")
        .insert({
          category_id: category.id,
          name: row.itemName,
          description: row.description || null,
          base_price: row.price,
          price: row.price,
          sort_order: row.sortOrder,
          is_active: row.isActive,
          is_sold_out: row.isSoldOut,
          image_url: row.imageUrl,
        });

      if (insertItemError) {
        throw new Error(
          `Failed to insert item "${row.itemName}": ${insertItemError.message}`
        );
      }

      insertedItems++;
    }
  }

  return {
    success: true,
    insertedItems,
    updatedItems,
    createdCategories,
    totalProcessed: rows.length,
    message: `Import complete. Inserted ${insertedItems}, updated ${updatedItems}.`,
    restaurantName: restaurant.name,
  };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { slug } = await params;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "CSV file is required." },
          { status: 400 }
        );
      }

      const text = await file.text();
      const parsedRows = parseStructuredCsv(text);
      const previewRows = await buildPreviewRows(supabase, slug, parsedRows);

      const { restaurant } = await loadRestaurantAndMenu(supabase, slug);

      const ip =
        req.headers.get("x-forwarded-for") ||
        req.headers.get("cf-connecting-ip") ||
        "unknown";

      const userAgent = req.headers.get("user-agent") || "unknown";

      await supabase
        .schema("food_ordering")
        .from("menu_upload_logs")
        .insert({
          restaurant_id: restaurant.id,
          file_name: file.name,
          file_size: file.size,
          raw_csv: text,
          total_rows: parsedRows.length,
          uploader_ip: ip,
          user_agent: userAgent,
        });

      return NextResponse.json({
        success: true,
        parserMode: "structured_csv",
        aiEnabled: Boolean(OPENAI_API_KEY),
        totalRows: previewRows.length,
        previewRows,
        message: "Preview ready.",
      });
    }

    const body = await req.json();
    const action = String(body?.action || "").trim().toLowerCase();

    if (action !== "commit") {
      return NextResponse.json(
        {
          error:
            "Unsupported action. Use multipart upload for preview or action=commit for import.",
        },
        { status: 400 }
      );
    }

    const rows = sanitizeCommitRows(body.rows);
    const result = await commitRows(supabase, slug, rows);

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/admin/restaurants/[slug]/menu/import failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}