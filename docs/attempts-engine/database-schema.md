# Database Schema

This document summarizes the core tables used by the Universal Attempts Engine and the Agent API trace bridge.

## `attempt_jobs`

Purpose: durable job state for a recovery or outcome workflow.

Important fields:

- `id`: job identifier
- `agent_type`: use case owner, currently `missed_call_recovery`
- `status`: job state such as `active`, `succeeded`, `expired`, or `failed`
- `contact_value`: customer phone or contact target
- `attempt_count`: attempts already sent
- `max_attempts`: maximum allowed attempts
- `next_attempt_at`: when the next attempt should execute
- `expires_at`: latest time the job can continue
- `completed_at`: when the job reached a terminal state
- `outcome_event_type`: terminal outcome such as `order_placed` or `max_attempts_reached`
- `outcome_event_id`: related business object ID, such as an order ID
- `metadata`: JSON context such as `orderLink`, `restaurantSlug`, `lastMessageType`, order number, and total
- `created_at`
- `updated_at`

Rules:

- Active jobs can have `next_attempt_at`.
- Terminal jobs should not have `next_attempt_at`.
- Succeeded jobs must clear `next_attempt_at`.

## `attempt_messages`

Purpose: customer-facing attempt message audit trail.

Important fields:

- `id`
- `attempt_job_id`
- `channel`
- `provider`
- `provider_message_id`
- `message_type`
- `status`: sent, suppressed, failed, or related status
- `body`
- `sent_at`
- `metadata`
- `created_at`

Rules:

- Sent SMS attempts should be recorded here.
- Suppressed attempts should also be recorded when suppression is expected behavior.
- Message records should not be used as the source of price or order truth.

## `attempt_events`

Purpose: operational event log for job state and engine decisions.

Important fields:

- `id`
- `attempt_job_id`
- `event_type`
- `payload`
- `created_at`

Common event types:

- `attempt.created`
- `attempt.sms_recorded`
- `attempt.executed`
- `attempt.execution_skipped`
- `attempt.expired`
- `attempt.order_placed`

## `agent_runs.attempt_job_id`

Purpose: optional bridge from Agent API runs to Universal Attempts Engine jobs.

Field:

- `attempt_job_id uuid null`

There is an index on non-null values. There is no foreign key in v1 so deployments remain safe where attempts tables may differ.

Trace model:

```text
event -> attempt_job -> agent_run -> agent_actions -> outcome
```

## `agent_actions`

Purpose: trace actions executed through the v1 Agent API wrapper.

Important fields:

- `id`
- `agent_run_id`
- `action_type`
- `action_version`
- `status`
- `request_id`
- `payload`
- `result`
- `created_at`
- `completed_at`

Rules:

- `action_version` defaults to `v1`.
- `request_id` is uniquely indexed when present.
- Duplicate action logging for the same `request_id` is treated as already recorded.
- Timestamps are UTC ISO-8601.
