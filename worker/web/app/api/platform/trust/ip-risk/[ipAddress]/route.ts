import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logPlatformActivity } from "@/lib/platform/activity";
import { getCurrentPlatformAccess } from "@/lib/platform/access";

type RouteContext = {
  params: Promise<{ ipAddress: string }>;
};

function buildMessage(action: string): string {
  if (action === "watch") return "IP added to watchlist.";
  if (action === "block") return "IP blocked.";
  if (action === "unblock") return "IP removed from block status.";
  if (action === "clear") return "IP removed from watchlist.";
  return "IP risk updated.";
}

export async function PATCH(req: Request, context: RouteContext) {
  const access = await getCurrentPlatformAccess();

  if (!access) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  try {
    const { ipAddress: rawIpAddress } = await context.params;
    const ipAddress = decodeURIComponent(rawIpAddress).trim();
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim().toLowerCase();
    const reason = String(body?.reason || "").trim();

    if (!ipAddress) {
      return NextResponse.json({ error: "IP address is required." }, { status: 400 });
    }

    if (!["watch", "block", "unblock", "clear"].includes(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    if (action === "clear") {
      const { error: deleteError } = await admin
        .from("platform_ip_watchlist")
        .delete()
        .eq("ip_address", ipAddress);

      if (deleteError) {
        throw new Error(`Failed to clear IP watchlist entry: ${deleteError.message}`);
      }
    } else {
      const nextStatus = action === "block" ? "blocked" : "watch";
      const nextReason =
        reason ||
        (action === "block"
          ? "Manual platform IP block"
          : action === "unblock"
          ? "Moved from blocked to watch"
          : "Manual platform IP watch");

      const { error: upsertError } = await admin
        .from("platform_ip_watchlist")
        .upsert(
          {
            ip_address: ipAddress,
            status: nextStatus,
            reason: nextReason,
            created_by: access.userId,
          },
          { onConflict: "ip_address" }
        );

      if (upsertError) {
        throw new Error(`Failed to update IP watchlist: ${upsertError.message}`);
      }
    }

    await logPlatformActivity({
      entityType: "ip",
      entityId: null,
      eventType: `ip_${action}`,
      actorUserId: access.userId,
      metadata: {
        ip_address: ipAddress,
        reason: reason || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: buildMessage(action),
    });
  } catch (error) {
    console.error("PATCH /api/platform/trust/ip-risk/[ipAddress] failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
