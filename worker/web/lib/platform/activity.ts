import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type LogPlatformActivityArgs = {
  entityType: string;
  entityId?: string | null;
  eventType: string;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logPlatformActivity(args: LogPlatformActivityArgs) {
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("platform_activity_events").insert({
    entity_type: args.entityType,
    entity_id: args.entityId || null,
    event_type: args.eventType,
    actor_type: "platform_admin",
    actor_user_id: args.actorUserId || null,
    metadata: args.metadata || {},
  });

  if (error) {
    console.error("Failed to log platform activity:", error);
  }
}
