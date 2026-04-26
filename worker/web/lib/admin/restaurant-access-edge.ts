import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RestaurantAdminAccess = {
  userId: string;
  email: string;
  restaurant: {
    id: string;
    slug: string;
    name: string | null;
  };
};

type SupabaseSessionCookie = {
  access_token?: string | null;
};

function cleanSlug(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  return s && s !== "undefined" && s !== "null" ? s : "";
}

function parseCookieHeader(cookieHeader: string | null | undefined) {
  const cookies = new Map<string, string>();

  for (const part of String(cookieHeader || "").split(";")) {
    const trimmed = part.trim();

    if (!trimmed) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    try {
      cookies.set(key, decodeURIComponent(rawValue));
    } catch {
      cookies.set(key, rawValue);
    }
  }

  return cookies;
}

function combineCookieChunks(cookies: Map<string, string>, key: string) {
  const direct = cookies.get(key);

  if (direct) {
    return direct;
  }

  const chunks: string[] = [];

  for (let index = 0; ; index += 1) {
    const chunk = cookies.get(`${key}.${index}`);

    if (!chunk) {
      break;
    }

    chunks.push(chunk);
  }

  return chunks.length > 0 ? chunks.join("") : null;
}

function stringFromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded =
    normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new TextDecoder().decode(bytes);
}

function getSupabaseAuthStorageKey() {
  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  const hostname = new URL(supabaseUrl).hostname;
  const projectRef = hostname.split(".")[0];

  if (!projectRef) {
    throw new Error("Invalid NEXT_PUBLIC_SUPABASE_URL");
  }

  return `sb-${projectRef}-auth-token`;
}

function getAccessTokenFromRequest(req: Request) {
  const cookieKey = getSupabaseAuthStorageKey();
  const cookies = parseCookieHeader(req.headers.get("cookie"));
  const rawCookie = combineCookieChunks(cookies, cookieKey);

  if (!rawCookie) {
    return null;
  }

  const decodedCookie = rawCookie.startsWith("base64-")
    ? stringFromBase64Url(rawCookie.slice("base64-".length))
    : rawCookie;

  let parsed: SupabaseSessionCookie | null = null;

  try {
    parsed = JSON.parse(decodedCookie) as SupabaseSessionCookie;
  } catch {
    return null;
  }

  const accessToken = String(parsed?.access_token || "").trim();
  return accessToken || null;
}

async function getAuthenticatedUser(req: Request) {
  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  const accessToken = getAccessTokenFromRequest(req);

  if (!supabaseUrl || !anonKey || !accessToken) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const user = (await response.json().catch(() => null)) as {
    id?: string | null;
    email?: string | null;
  } | null;

  if (!user?.id) {
    return null;
  }

  return {
    id: user.id,
    email: String(user.email || "").trim().toLowerCase(),
  };
}

export async function getRestaurantAdminAccessBySlugFromRequest(
  req: Request,
  slugInput: unknown
): Promise<RestaurantAdminAccess | null> {
  const slug = cleanSlug(slugInput);

  if (!slug) {
    return null;
  }

  const user = await getAuthenticatedUser(req);

  if (!user?.id) {
    return null;
  }

  const admin = createSupabaseAdminClient();

  const { data: restaurant } = await admin
    .schema("food_ordering")
    .from("restaurants")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!restaurant?.id) {
    return null;
  }

  const { data: membership } = await admin
    .from("restaurant_users")
    .select("id, phone_verified")
    .eq("restaurant_id", restaurant.id)
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!membership?.id || !membership.phone_verified) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    restaurant: {
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name || null,
    },
  };
}
