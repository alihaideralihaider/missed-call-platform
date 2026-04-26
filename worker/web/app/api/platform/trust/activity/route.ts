import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentPlatformAccess } from "@/lib/platform/access";

type ActivityRow = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  event_type: string;
  actor_type: string | null;
  actor_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(String(value || "1"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(String(value || "20"), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(parsed, 100);
}

export async function GET(req: Request) {
  const access = await getCurrentPlatformAccess();

  if (!access) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  try {
    const url = new URL(req.url);
    const typeFilter = String(url.searchParams.get("type") || "")
      .trim()
      .toLowerCase();
    const textQuery = String(url.searchParams.get("query") || "")
      .trim()
      .toLowerCase();
    const page = parsePage(url.searchParams.get("page"));
    const limit = parseLimit(url.searchParams.get("limit"));

    let query = admin
      .from("platform_activity_events")
      .select(
        "id, entity_type, entity_id, event_type, actor_type, actor_user_id, metadata, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (typeFilter) {
      query = query.eq("entity_type", typeFilter);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to load platform activity: ${error.message}`);
    }

    const rows = (data || []) as ActivityRow[];
    const filteredRows = textQuery
      ? rows.filter((row) => {
          const metadataText = row.metadata
            ? JSON.stringify(row.metadata).toLowerCase()
            : "";

          return (
            [
              row.entity_type,
              row.event_type,
              row.actor_type,
              row.actor_user_id,
              row.entity_id,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value).toLowerCase().includes(textQuery)
              ) || metadataText.includes(textQuery)
          );
        })
      : rows;
    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const pagedRows = filteredRows.slice(start, start + limit);

    return NextResponse.json({
      success: true,
      records: pagedRows,
      pagination: {
        page: safePage,
        limit,
        total,
        total_pages: totalPages,
        has_next_page: safePage < totalPages,
        has_previous_page: safePage > 1,
      },
    });
  } catch (error) {
    console.error("GET /api/platform/trust/activity failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
