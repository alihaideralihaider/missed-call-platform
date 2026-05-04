import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type UsageEnvironment = "sandbox" | "production";

export type UsageMetricKey =
  | "accepted_event"
  | "agent_run"
  | "action_execution"
  | "attempt_execution"
  | "webhook_delivery"
  | "batch_file_generated"
  | "sftp_file_downloaded"
  | "outcome_recorded";

export type RecordUsageEventInput = {
  accountId?: string | null;
  projectId?: string | null;
  environment?: UsageEnvironment;
  metricKey: UsageMetricKey;
  sourceType: string;
  sourceId: string;
  quantity?: number;
  billable?: boolean;
  idempotencyKey?: string | null;
  occurredAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type RecordUsageEventResult = {
  recorded: boolean;
  skippedReason?: string;
};

function getUtcBillingPeriod(occurredAt: Date) {
  const start = new Date(
    Date.UTC(occurredAt.getUTCFullYear(), occurredAt.getUTCMonth(), 1, 0, 0, 0)
  );
  const end = new Date(
    Date.UTC(occurredAt.getUTCFullYear(), occurredAt.getUTCMonth() + 1, 1, 0, 0, 0)
  );

  return {
    billingPeriodStart: start.toISOString(),
    billingPeriodEnd: end.toISOString(),
  };
}

export async function recordUsageEvent(
  input: RecordUsageEventInput
): Promise<RecordUsageEventResult> {
  const sourceId = String(input.sourceId || "").trim();
  const sourceType = String(input.sourceType || "").trim();
  const quantity = input.quantity ?? 1;

  if (!sourceType || !sourceId) {
    return { recorded: false, skippedReason: "missing_source" };
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { recorded: false, skippedReason: "invalid_quantity" };
  }

  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();

  if (Number.isNaN(occurredAt.getTime())) {
    return { recorded: false, skippedReason: "invalid_occurred_at" };
  }

  const { billingPeriodStart, billingPeriodEnd } = getUtcBillingPeriod(occurredAt);

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("usage_events").insert({
      account_id: input.accountId ?? null,
      project_id: input.projectId ?? null,
      environment: input.environment || "production",
      metric_key: input.metricKey,
      source_type: sourceType,
      source_id: sourceId,
      quantity,
      billable: input.billable ?? false,
      idempotency_key: input.idempotencyKey ?? null,
      occurred_at: occurredAt.toISOString(),
      billing_period_start: billingPeriodStart,
      billing_period_end: billingPeriodEnd,
      metadata: input.metadata || {},
    });

    if (error) {
      if (error.code === "23505") {
        return { recorded: false, skippedReason: "duplicate_idempotency_key" };
      }

      if (error.code === "42P01") {
        console.warn("usage_events_table_missing", {
          metricKey: input.metricKey,
          sourceType,
          sourceId,
        });
        return { recorded: false, skippedReason: "usage_events_table_missing" };
      }

      console.warn("usage_event_insert_failed", {
        metricKey: input.metricKey,
        sourceType,
        sourceId,
        error: error.message,
      });
      return { recorded: false, skippedReason: "insert_failed" };
    }

    return { recorded: true };
  } catch (error) {
    console.warn("usage_event_record_failed", {
      metricKey: input.metricKey,
      sourceType,
      sourceId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return { recorded: false, skippedReason: "runtime_error" };
  }
}
