import {
  agentApiError,
  createRequestId,
  jsonNoStore,
} from "@/lib/agent-api/v1";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const requestId = createRequestId();
  const { runId } = await context.params;
  const admin = createSupabaseAdminClient();

  try {
    const { data: run, error: runError } = await admin
      .from("agent_runs")
      .select(
        "id, event_id, attempt_job_id, event_type, source_system, source_slug, status, created_at, completed_at, metadata"
      )
      .eq("id", runId)
      .maybeSingle();

    if (runError) {
      throw new Error(runError.message);
    }

    if (!run) {
      return agentApiError("not_found", "Agent run not found.", requestId, 404);
    }

    const [{ data: event, error: eventError }, { data: actions, error: actionsError }] =
      await Promise.all([
        admin
          .from("agent_events")
          .select("id, event_type, metadata, customer")
          .eq("id", run.event_id)
          .maybeSingle(),
        admin
          .from("agent_actions")
          .select(
            "id, action_type, action_version, status, payload, result, created_at, completed_at"
          )
          .eq("agent_run_id", run.id)
          .order("created_at", { ascending: true }),
      ]);

    if (eventError) {
      throw new Error(eventError.message);
    }

    if (actionsError) {
      throw new Error(actionsError.message);
    }

    return jsonNoStore({
      agent_run_id: run.id,
      attempt_job_id: run.attempt_job_id || null,
      status: run.status,
      event_type: run.event_type,
      source_system: run.source_system,
      source_slug: run.source_slug,
      run: {
        id: run.id,
        event_id: run.event_id,
        attempt_job_id: run.attempt_job_id || null,
        status: run.status,
        event_type: run.event_type,
        source_system: run.source_system,
        source_slug: run.source_slug,
        created_at: run.created_at,
        completed_at: run.completed_at,
        metadata: run.metadata || {},
      },
      event: event
        ? {
            id: event.id,
            event_type: event.event_type,
            metadata: event.metadata || {},
            customer: event.customer || {},
          }
        : null,
      actions: (actions || []).map((action) => ({
        id: action.id,
        type: action.action_type,
        action_version: action.action_version || "v1",
        status: action.status,
        payload: action.payload || {},
        result: action.result || {},
        created_at: action.created_at,
        completed_at: action.completed_at,
      })),
      request_id: requestId,
    });
  } catch (error) {
    console.error("v1_agent_run_lookup_failed", {
      requestId,
      runId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return agentApiError(
      "internal_error",
      "Could not load agent run.",
      requestId,
      500
    );
  }
}
