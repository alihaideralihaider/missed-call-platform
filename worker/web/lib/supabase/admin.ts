import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function isLocalPlaceholder(value: string) {
  return value.includes("fake-local") || value.includes("localhost");
}

async function supabaseFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok && !contentType.toLowerCase().includes("application/json")) {
    const body = await response.text().catch(() => "");
    const message = body.toLowerCase().includes("error code: 1016")
      ? "Supabase upstream DNS resolution failed. Check the production Supabase URL binding."
      : `Supabase upstream returned a non-JSON response (${response.status}).`;

    return new Response(JSON.stringify({ message }), {
      status: response.status,
      headers: {
        "content-type": "application/json",
      },
    });
  }

  return response;
}

export function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  if (process.env.NODE_ENV === "production" && isLocalPlaceholder(url)) {
    throw new Error(
      "Production Supabase URL is using a local placeholder. Set the production Supabase URL binding before deploy."
    );
  }

  return createClient(url, serviceRoleKey, {
    global: {
      fetch: supabaseFetch,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
