import type { SupabaseClient } from "@supabase/supabase-js";

import { sendSms } from "@/lib/messaging/sendSms";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MISSED_CALL_AGENT_TYPE = "missed_call_recovery";
const MISSED_CALL_TRIGGER_EVENT = "missed_call";
const ATTEMPT_EXPIRY_HOURS = 24;
const ATTEMPT_2_DELAY_MINUTES = 10;
const ATTEMPT_3_DELAY_MINUTES = 30;
const ATTEMPT_BATCH_SIZE = 25;

type JsonRecord = Record<string, unknown>;

type AttemptMessageStatus = "queued" | "sent" | "delivered" | "failed" | "suppressed";

type SmsRawResult = {
  sid?: string | null;
  provider?: string | null;
  status?: string | null;
  to?: string | null;
  from?: string | null;
  suppressed?: boolean;
};

type AttemptJobRow = {
  id: string;
  agent_type: string;
  account_type: string;
  account_id: string;
  contact_value: string | null;
  status: string;
  attempt_count: number | null;
  max_attempts: number | null;
  expires_at: string | null;
  metadata: JsonRecord | null;
};

export type DueAttemptJobsSummary = {
  processed: number;
  sent: number;
  suppressed: number;
  expired: number;
  failed: number;
};

function normalizePhone(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;

  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

function buildPhoneVariants(value: string) {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, "");

  return Array.from(
    new Set(
      [
        raw,
        digits,
        digits ? `+${digits}` : "",
        digits.length === 10 ? `+1${digits}` : "",
        digits.length === 11 && digits.startsWith("1") ? `+${digits}` : "",
      ].filter(Boolean)
    )
  );
}

function getExpiryTimestamp() {
  return new Date(Date.now() + ATTEMPT_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
}

export function getNextAttemptTimestamp(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function getNextAttemptAt(nextAttemptCount: number) {
  if (nextAttemptCount === 1) {
    return getNextAttemptTimestamp(ATTEMPT_2_DELAY_MINUTES);
  }
  if (nextAttemptCount === 2) {
    return getNextAttemptTimestamp(ATTEMPT_3_DELAY_MINUTES);
  }
  return null;
}

export function buildMissedCallRecoveryFollowUpMessage(job: AttemptJobRow) {
  const orderLink =
    typeof job.metadata?.orderLink === "string" ? job.metadata.orderLink.trim() : "";

  if (!orderLink) return null;

  if (Number(job.attempt_count || 0) === 1) {
    return {
      body: `Still want to order? Here is your link again: ${orderLink} Reply STOP to opt out.`,
      messageType: "missed_call_recovery_reminder",
      nextDelayMinutes: ATTEMPT_3_DELAY_MINUTES,
    };
  }

  if (Number(job.attempt_count || 0) === 2) {
    return {
      body: `Last reminder — you can still place your order here: ${orderLink} Reply STOP to opt out.`,
      messageType: "missed_call_recovery_final_reminder",
      nextDelayMinutes: null,
    };
  }

  return null;
}

function getSmsProvider(raw: SmsRawResult | null | undefined) {
  return typeof raw?.provider === "string" && raw.provider.trim()
    ? raw.provider.trim()
    : "twilio";
}

function getSmsProviderMessageId(raw: SmsRawResult | null | undefined) {
  return typeof raw?.sid === "string" && raw.sid.trim() ? raw.sid.trim() : null;
}

async function logAttemptEvent(args: {
  supabase: SupabaseClient;
  attemptJobId: string | null;
  eventType: string;
  source: string;
  payload: JsonRecord;
}) {
  const { error } = await args.supabase.from("attempt_events").insert({
    attempt_job_id: args.attemptJobId,
    event_type: args.eventType,
    source: args.source,
    payload: args.payload,
  });

  if (error) {
    throw new Error(`Failed to insert attempt event: ${error.message}`);
  }
}

export async function createMissedCallRecoveryAttempt(input: {
  restaurantId: string;
  businessId?: string | null;
  restaurantSlug?: string | null;
  callSid?: string | null;
  from: string;
  to: string;
  metadata?: JsonRecord;
}) {
  const supabase = createSupabaseAdminClient();
  const contactValue = normalizePhone(input.from) || input.from;
  const triggerEventId = input.callSid?.trim() || null;
  const metadata = {
    businessId: input.businessId ?? null,
    restaurantSlug: input.restaurantSlug ?? null,
    to: input.to,
    ...input.metadata,
  };

  const payload = {
    agent_type: MISSED_CALL_AGENT_TYPE,
    account_type: "restaurant",
    account_id: input.restaurantId,
    trigger_event_type: MISSED_CALL_TRIGGER_EVENT,
    trigger_event_id: triggerEventId,
    subject_type: "caller",
    subject_id: contactValue,
    contact_channel: "sms",
    contact_value: contactValue,
    status: "active",
    max_attempts: 3,
    expires_at: getExpiryTimestamp(),
    metadata,
  };

  const query = triggerEventId
    ? supabase
        .from("attempt_jobs")
        .upsert(payload, {
          onConflict: "agent_type,trigger_event_type,trigger_event_id",
        })
    : supabase.from("attempt_jobs").insert(payload);

  const { data, error } = await query.select("id").single();

  if (error) {
    throw new Error(`Failed to create missed-call attempt job: ${error.message}`);
  }

  const attemptJobId = data?.id as string | undefined;

  await logAttemptEvent({
    supabase,
    attemptJobId: attemptJobId || null,
    eventType: "missed_call.received",
    source: "saanaos.twilio_voice",
    payload: {
      callSid: triggerEventId,
      from: contactValue,
      to: input.to,
      restaurantId: input.restaurantId,
      businessId: input.businessId ?? null,
      restaurantSlug: input.restaurantSlug ?? null,
    },
  });

  return attemptJobId || null;
}

export async function ensureMissedCallRecoveryAttempt(input: {
  restaurantId: string;
  businessId?: string | null;
  restaurantSlug?: string | null;
  callSid?: string | null;
  from: string;
  to?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const callSid = input.callSid?.trim() || null;

  if (callSid) {
    const { data, error } = await supabase
      .from("attempt_jobs")
      .select("id")
      .eq("agent_type", MISSED_CALL_AGENT_TYPE)
      .eq("trigger_event_type", MISSED_CALL_TRIGGER_EVENT)
      .eq("trigger_event_id", callSid)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load missed-call attempt job: ${error.message}`);
    }

    if (data?.id) {
      return data.id as string;
    }
  }

  return createMissedCallRecoveryAttempt({
    restaurantId: input.restaurantId,
    businessId: input.businessId,
    restaurantSlug: input.restaurantSlug,
    callSid,
    from: input.from,
    to: input.to || "",
  });
}

export async function recordAttemptMessage(input: {
  attemptJobId: string;
  channel: "sms" | "whatsapp" | "email";
  messageType: string;
  to: string;
  body: string;
  status: AttemptMessageStatus;
  provider?: string | null;
  providerMessageId?: string | null;
  raw?: JsonRecord | null;
  errorMessage?: string | null;
  orderLink?: string | null;
  metadata?: JsonRecord;
}) {
  const supabase = createSupabaseAdminClient();
  const sentAt = input.status === "sent" ? new Date().toISOString() : null;
  const failedAt = input.status === "failed" ? new Date().toISOString() : null;

  const { error: messageError } = await supabase.from("attempt_messages").insert({
    attempt_job_id: input.attemptJobId,
    channel: input.channel,
    provider: input.provider,
    provider_message_id: input.providerMessageId,
    message_type: input.messageType,
    status: input.status,
    to_value: normalizePhone(input.to) || input.to,
    body: input.body,
    sent_at: sentAt,
    failed_at: failedAt,
    error_message: input.errorMessage,
    metadata: {
      raw: input.raw ?? null,
    },
  });

  if (messageError) {
    throw new Error(`Failed to insert attempt message: ${messageError.message}`);
  }

  if (input.status === "sent") {
    const { data: job, error: loadError } = await supabase
      .from("attempt_jobs")
      .select("attempt_count, max_attempts, metadata")
      .eq("id", input.attemptJobId)
      .maybeSingle();

    if (loadError) {
      throw new Error(`Failed to load attempt job count: ${loadError.message}`);
    }

    const nextCount = Number(job?.attempt_count || 0) + 1;
    const maxAttempts = Math.max(1, Number(job?.max_attempts || 3));
    const shouldClose = nextCount >= maxAttempts;
    const nextAttemptAt = shouldClose ? null : getNextAttemptAt(nextCount);
    const existingMetadata =
      job?.metadata && typeof job.metadata === "object"
        ? (job.metadata as JsonRecord)
        : {};
    const { error: countError } = await supabase
      .from("attempt_jobs")
      .update({
        attempt_count: nextCount,
        status: shouldClose ? "expired" : "active",
        completed_at: shouldClose ? new Date().toISOString() : null,
        outcome_event_type: shouldClose ? "expired" : null,
        next_attempt_at: nextAttemptAt,
        metadata: {
          ...existingMetadata,
          ...(input.orderLink ? { orderLink: input.orderLink } : {}),
          ...input.metadata,
          lastMessageType: input.messageType,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.attemptJobId);

    if (countError) {
      throw new Error(`Failed to increment attempt count: ${countError.message}`);
    }
  } else {
    const { data: job, error: loadError } = await supabase
      .from("attempt_jobs")
      .select("metadata")
      .eq("id", input.attemptJobId)
      .maybeSingle();

    if (loadError) {
      throw new Error(`Failed to load attempt job metadata: ${loadError.message}`);
    }

    const existingMetadata =
      job?.metadata && typeof job.metadata === "object"
        ? (job.metadata as JsonRecord)
        : {};
    const { error: touchError } = await supabase
      .from("attempt_jobs")
      .update({
        next_attempt_at: null,
        metadata: {
          ...existingMetadata,
          ...(input.metadata || {}),
          ...(input.orderLink ? { orderLink: input.orderLink } : {}),
          lastMessageType: input.messageType,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.attemptJobId);

    if (touchError) {
      throw new Error(`Failed to update attempt job: ${touchError.message}`);
    }
  }

  await logAttemptEvent({
    supabase,
    attemptJobId: input.attemptJobId,
    eventType:
      input.status === "sent"
        ? "recovery_message.sent"
        : input.status === "suppressed"
          ? "recovery_message.suppressed"
          : "recovery_message.failed",
    source: "saanaos.messaging",
    payload: {
      channel: input.channel,
      messageType: input.messageType,
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      to: normalizePhone(input.to) || input.to,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
    },
  });

  if (input.status === "sent") {
    const { data: job, error: jobError } = await supabase
      .from("attempt_jobs")
      .select("status, attempt_count, max_attempts")
      .eq("id", input.attemptJobId)
      .maybeSingle();

    if (jobError) {
      throw new Error(`Failed to reload attempt job status: ${jobError.message}`);
    }

    if (job?.status === "expired") {
      await logAttemptEvent({
        supabase,
        attemptJobId: input.attemptJobId,
        eventType: "attempt.expired",
        source: "saanaos.attempts",
        payload: {
          reason: "max_attempts_reached",
          attemptCount: job.attempt_count ?? null,
          maxAttempts: job.max_attempts ?? null,
          expiredAt: new Date().toISOString(),
        },
      });
    }
  }
}

export async function recordMissedCallRecoverySms(input: {
  restaurantId: string;
  businessId?: string | null;
  restaurantSlug?: string | null;
  callSid?: string | null;
  from: string;
  to?: string | null;
  orderLink: string;
  messageType: string;
  sms: SmsRawResult | null;
}) {
  const attemptJobId = await ensureMissedCallRecoveryAttempt({
    restaurantId: input.restaurantId,
    businessId: input.businessId,
    restaurantSlug: input.restaurantSlug,
    callSid: input.callSid,
    from: input.from,
    to: input.to,
  });

  if (!attemptJobId) return null;

  const isSuppressed = input.sms?.suppressed === true;
  const provider = getSmsProvider(input.sms);
  const providerMessageId = getSmsProviderMessageId(input.sms);

  await recordAttemptMessage({
    attemptJobId,
    channel: "sms",
    messageType: input.messageType,
    to: input.from,
    body: `SaanaOS: Here is your order link: ${input.orderLink} Reply STOP to opt out.`,
    status: isSuppressed ? "suppressed" : "sent",
    provider,
    providerMessageId,
    raw: (input.sms as JsonRecord | null) ?? null,
    orderLink: input.orderLink,
    metadata: {
      restaurantSlug: input.restaurantSlug ?? null,
    },
  });

  return attemptJobId;
}

export async function recordMissedCallRecoverySmsFailure(input: {
  restaurantId: string;
  businessId?: string | null;
  restaurantSlug?: string | null;
  callSid?: string | null;
  from: string;
  to?: string | null;
  orderLink: string;
  messageType: string;
  error: unknown;
}) {
  const attemptJobId = await ensureMissedCallRecoveryAttempt({
    restaurantId: input.restaurantId,
    businessId: input.businessId,
    restaurantSlug: input.restaurantSlug,
    callSid: input.callSid,
    from: input.from,
    to: input.to,
  });

  if (!attemptJobId) return null;

  await recordAttemptMessage({
    attemptJobId,
    channel: "sms",
    messageType: input.messageType,
    to: input.from,
    body: `SaanaOS: Here is your order link: ${input.orderLink} Reply STOP to opt out.`,
    status: "failed",
    provider: "twilio",
    errorMessage: input.error instanceof Error ? input.error.message : "unknown_error",
    orderLink: input.orderLink,
  });

  return attemptJobId;
}

async function markAttemptExpired(args: {
  supabase: SupabaseClient;
  attemptJobId: string;
  reason: string;
}) {
  const now = new Date().toISOString();
  const { error } = await args.supabase
    .from("attempt_jobs")
    .update({
      status: "expired",
      completed_at: now,
      updated_at: now,
      next_attempt_at: null,
      outcome_event_type: "expired",
    })
    .eq("id", args.attemptJobId);

  if (error) {
    throw new Error(`Failed to expire attempt job: ${error.message}`);
  }

  await logAttemptEvent({
    supabase: args.supabase,
    attemptJobId: args.attemptJobId,
    eventType: "attempt.expired",
    source: "saanaos.attempts",
    payload: {
      reason: args.reason,
      expiredAt: now,
    },
  });
}

async function logAttemptFailure(args: {
  supabase: SupabaseClient;
  attemptJobId: string;
  reason: string;
  payload?: JsonRecord;
}) {
  await logAttemptEvent({
    supabase: args.supabase,
    attemptJobId: args.attemptJobId,
    eventType: "attempt.failed",
    source: "saanaos.attempts",
    payload: {
      reason: args.reason,
      ...args.payload,
    },
  });
}

async function logAttemptSkipped(args: {
  supabase: SupabaseClient;
  attemptJobId: string;
  reason: string;
  payload?: JsonRecord;
}) {
  await logAttemptEvent({
    supabase: args.supabase,
    attemptJobId: args.attemptJobId,
    eventType: "attempt.execution_skipped",
    source: "saanaos.attempts",
    payload: {
      reason: args.reason,
      ...args.payload,
    },
  });
}

async function clearNextAttempt(args: {
  supabase: SupabaseClient;
  attemptJobId: string;
}) {
  const { error } = await args.supabase
    .from("attempt_jobs")
    .update({
      next_attempt_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.attemptJobId);

  if (error) {
    throw new Error(`Failed to clear next attempt: ${error.message}`);
  }
}

async function processDueMissedCallRecoveryJob(
  supabase: SupabaseClient,
  job: AttemptJobRow
) {
  const now = new Date();
  const expiresAt = job.expires_at ? new Date(job.expires_at) : null;

  if (job.status !== "active") {
    return { sent: false, suppressed: false, expired: false, failed: false };
  }

  if (expiresAt && expiresAt.getTime() <= now.getTime()) {
    await markAttemptExpired({
      supabase,
      attemptJobId: job.id,
      reason: "expires_at_passed",
    });
    return { sent: false, suppressed: false, expired: true, failed: false };
  }

  const attemptCount = Number(job.attempt_count || 0);
  const maxAttempts = Math.max(1, Number(job.max_attempts || 3));

  if (attemptCount >= maxAttempts) {
    await markAttemptExpired({
      supabase,
      attemptJobId: job.id,
      reason: "max_attempts_reached",
    });
    return { sent: false, suppressed: false, expired: true, failed: false };
  }

  const contactValue = normalizePhone(job.contact_value) || job.contact_value;
  if (!contactValue) {
    await logAttemptSkipped({
      supabase,
      attemptJobId: job.id,
      reason: "missing_contact_value",
    });
    await clearNextAttempt({ supabase, attemptJobId: job.id });
    return { sent: false, suppressed: false, expired: false, failed: true };
  }

  const orderLink =
    typeof job.metadata?.orderLink === "string" ? job.metadata.orderLink.trim() : "";

  if (!orderLink) {
    await logAttemptSkipped({
      supabase,
      attemptJobId: job.id,
      reason: "missing_order_link",
    });
    await clearNextAttempt({ supabase, attemptJobId: job.id });
    return { sent: false, suppressed: false, expired: false, failed: true };
  }

  const message = buildMissedCallRecoveryFollowUpMessage(job);

  if (!message) {
    await markAttemptExpired({
      supabase,
      attemptJobId: job.id,
      reason: "no_follow_up_message",
    });
    return { sent: false, suppressed: false, expired: true, failed: false };
  }

  const smsResult = await sendSms({
    to: contactValue,
    body: message.body,
    restaurantId: job.account_id,
    messageType: message.messageType,
    metadata: {
      attemptJobId: job.id,
      agentType: job.agent_type,
    },
  });
  const rawSms = (smsResult.raw as SmsRawResult | null) ?? null;
  const wasSuppressed = rawSms?.suppressed === true;
  const messageStatus: AttemptMessageStatus = wasSuppressed
    ? "suppressed"
    : smsResult.success
      ? "sent"
      : "failed";
  const providerMessageId = smsResult.messageId || getSmsProviderMessageId(rawSms);

  await recordAttemptMessage({
    attemptJobId: job.id,
    channel: "sms",
    messageType: message.messageType,
    to: contactValue,
    body: message.body,
    status: messageStatus,
    provider: smsResult.provider,
    providerMessageId,
    raw: (rawSms as JsonRecord | null) ?? null,
    errorMessage: smsResult.error ?? null,
    orderLink,
  });

  if (wasSuppressed) {
    await logAttemptEvent({
      supabase,
      attemptJobId: job.id,
      eventType: "attempt.executed",
      source: "saanaos.attempts",
      payload: {
        attemptNumber: attemptCount + 1,
        messageType: message.messageType,
        providerMessageId,
        status: "suppressed",
      },
    });
    return { sent: false, suppressed: true, expired: false, failed: false };
  }

  if (!smsResult.success) {
    throw new Error(smsResult.error || "SMS attempt failed.");
  }

  await logAttemptEvent({
    supabase,
    attemptJobId: job.id,
    eventType: "attempt.executed",
    source: "saanaos.attempts",
    payload: {
      attemptNumber: attemptCount + 1,
      messageType: message.messageType,
      providerMessageId,
      status: "sent",
    },
  });

  return {
    sent: true,
    suppressed: false,
    expired: message.nextDelayMinutes === null,
    failed: false,
  };
}

export async function runDueAttemptJobs(): Promise<DueAttemptJobsSummary> {
  const summary: DueAttemptJobsSummary = {
    processed: 0,
    sent: 0,
    suppressed: 0,
    expired: 0,
    failed: 0,
  };

  let supabase: SupabaseClient;

  try {
    supabase = createSupabaseAdminClient();
  } catch (error) {
    console.error("attempts_runner_supabase_client_failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return summary;
  }

  const now = new Date().toISOString();

  const { data: jobs, error } = await supabase
    .from("attempt_jobs")
    .select(
      "id, agent_type, account_type, account_id, contact_value, status, attempt_count, max_attempts, expires_at, metadata"
    )
    .eq("agent_type", MISSED_CALL_AGENT_TYPE)
    .eq("status", "active")
    .not("next_attempt_at", "is", null)
    .lte("next_attempt_at", now)
    .order("next_attempt_at", { ascending: true })
    .limit(ATTEMPT_BATCH_SIZE);

  if (error) {
    console.error("attempts_runner_query_failed", {
      error: error.message,
    });
    return summary;
  }

  for (const job of (jobs || []) as AttemptJobRow[]) {
    summary.processed += 1;

    try {
      const result = await processDueMissedCallRecoveryJob(supabase, job);
      if (result.sent) summary.sent += 1;
      if (result.suppressed) summary.suppressed += 1;
      if (result.expired) summary.expired += 1;
      if (result.failed) summary.failed += 1;
    } catch (jobError) {
      summary.failed += 1;

      console.error("attempts_runner_job_failed", {
        attemptJobId: job.id,
        error: jobError instanceof Error ? jobError.message : "unknown_error",
      });

      try {
        await logAttemptFailure({
          supabase,
          attemptJobId: job.id,
          reason: "job_execution_failed",
          payload: {
            error:
              jobError instanceof Error ? jobError.message : "unknown_error",
          },
        });
      } catch (logError) {
        console.error("attempts_runner_failure_log_failed", {
          attemptJobId: job.id,
          error: logError instanceof Error ? logError.message : "unknown_error",
        });
      }
    }
  }

  return summary;
}

export async function markMissedCallRecoveryOrderPlaced(input: {
  restaurantSlug: string;
  customerPhone: string;
  orderId: string;
  orderNumber?: string | null;
  total?: number | null;
}) {
  const supabase = createSupabaseAdminClient();

  const { data: restaurant, error: restaurantError } = await supabase
    .schema("food_ordering")
    .from("restaurants")
    .select("id, slug")
    .eq("slug", input.restaurantSlug)
    .maybeSingle();

  if (restaurantError) {
    throw new Error(`Failed to resolve restaurant for attempt outcome: ${restaurantError.message}`);
  }

  if (!restaurant?.id) {
    return null;
  }

  const contactValue = normalizePhone(input.customerPhone) || input.customerPhone;
  const phoneVariants = buildPhoneVariants(contactValue);
  const now = new Date().toISOString();

  const { data: expiredJobs, error: expiredError } = await supabase
    .from("attempt_jobs")
    .select("id")
    .eq("agent_type", MISSED_CALL_AGENT_TYPE)
    .eq("account_type", "restaurant")
    .eq("account_id", restaurant.id)
    .eq("status", "active")
    .lt("expires_at", now)
    .limit(25);

  if (expiredError) {
    throw new Error(`Failed to expire attempt jobs: ${expiredError.message}`);
  }

  const expiredJobIds = (expiredJobs || []).map((job) => job.id as string);

  if (expiredJobIds.length > 0) {
    const { error: expireUpdateError } = await supabase
      .from("attempt_jobs")
      .update({
        status: "expired",
        updated_at: now,
        completed_at: now,
        outcome_event_type: "expired",
      })
      .in("id", expiredJobIds);

    if (expireUpdateError) {
      throw new Error(`Failed to update expired attempt jobs: ${expireUpdateError.message}`);
    }
  }

  for (const job of expiredJobs || []) {
    await logAttemptEvent({
      supabase,
      attemptJobId: job.id as string,
      eventType: "attempt.expired",
      source: "saanaos.attempts",
      payload: {
        expiredAt: now,
      },
    });
  }

  const { data: jobs, error: jobsError } = await supabase
    .from("attempt_jobs")
    .select("id, metadata")
    .eq("agent_type", MISSED_CALL_AGENT_TYPE)
    .eq("account_type", "restaurant")
    .eq("account_id", restaurant.id)
    .eq("status", "active")
    .in("contact_value", phoneVariants)
    .order("created_at", { ascending: false })
    .limit(1);

  if (jobsError) {
    throw new Error(`Failed to find matching attempt job: ${jobsError.message}`);
  }

  const matchedJob = jobs?.[0];
  const attemptJobId = matchedJob?.id as string | undefined;
  if (!attemptJobId) {
    return null;
  }

  const existingMetadata =
    matchedJob?.metadata && typeof matchedJob.metadata === "object"
      ? (matchedJob.metadata as JsonRecord)
      : {};

  const { error: updateError } = await supabase
    .from("attempt_jobs")
    .update({
      status: "succeeded",
      completed_at: now,
      updated_at: now,
      outcome_event_type: "order_placed",
      outcome_event_id: input.orderId,
      next_attempt_at: null,
      metadata: {
        ...existingMetadata,
        orderNumber: input.orderNumber ?? null,
        total: input.total ?? null,
      },
    })
    .eq("id", attemptJobId);

  if (updateError) {
    throw new Error(`Failed to mark attempt job succeeded: ${updateError.message}`);
  }

  await logAttemptEvent({
    supabase,
    attemptJobId,
    eventType: "order_placed",
    source: "saanaos.checkout",
    payload: {
      orderId: input.orderId,
      orderNumber: input.orderNumber ?? null,
      total: input.total ?? null,
      customerPhone: contactValue,
      restaurantSlug: input.restaurantSlug,
    },
  });

  return attemptJobId;
}
