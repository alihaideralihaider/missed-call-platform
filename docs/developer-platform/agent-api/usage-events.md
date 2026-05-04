# Usage Events v1

Usage Events v1 is the first implementation of the Universal Agent Metering Standard.

This is metering only. It does not calculate bills, enforce limits, connect Stripe, or charge customers.

## Source of Truth

Future normalized usage is stored in:

```text
public.usage_events
```

The table records billable and non-billable usage in a consistent shape. In v1, all recorded usage is non-billable:

```text
billable = false
```

## Metric Keys

Supported metric keys:

- `accepted_event`
- `agent_run`
- `action_execution`
- `attempt_execution`
- `webhook_delivery`
- `batch_file_generated`
- `sftp_file_downloaded`
- `outcome_recorded`

## UTC Billing Periods

Each usage event is assigned to a UTC monthly billing period:

```text
billing_period_start = first day of current UTC month at 00:00:00Z
billing_period_end = first day of next UTC month at 00:00:00Z
```

These periods are recorded now for future rollups and invoice simulation.

## Idempotency Rules

Usage rows should be idempotent.

The `idempotency_key` field prevents duplicate usage rows for the same source work.

Examples:

- `usage:accepted_event:{event_id}`
- `usage:agent_run:{run_id}`
- `usage:action_execution:{action_id}`
- `usage:attempt_execution:{attempt_job_id}:{attempt_number}`
- `usage:outcome_recorded:{attempt_job_id}:{outcome_event_type}`

Duplicate idempotency keys are treated as already recorded and should not break runtime behavior.

## What Is Recorded Now

Current v1 recording:

- `accepted_event` when a new Agent API event is accepted
- `agent_run` when a new Agent API run is created
- `action_execution` when a v1 Agent API action log is inserted
- `attempt_execution` when the Attempts Engine cron sends a scheduled follow-up SMS
- `outcome_recorded` when an attempt job reaches a terminal outcome such as `order_placed`, `expired`, or `max_attempts_reached`

## What Is Intentionally Not Billed Yet

The following are not billed in v1:

- Agent API events
- Agent runs
- Agent action executions
- Attempts Engine executions
- Outcomes
- Webhook delivery
- SFTP batch generation or download

All usage is recorded with `billable=false` until billing rules are implemented, validated, and approved.

## What Is Not Recorded Yet

Future metrics not yet wired:

- `webhook_delivery`
- `batch_file_generated`
- `sftp_file_downloaded`

These require delivery infrastructure before they should generate usage rows.

## Runtime Safety

Usage recording is best-effort.

If the `usage_events` table is missing, a duplicate idempotency key is encountered, or a usage insert fails, runtime behavior should continue. Metering must not break Agent API responses, Attempts Engine execution, checkout, Twilio, or SMS flows.

## Relationship to Billing Architecture v1

Usage Events v1 feeds the future Billing Architecture.

Billing implementation remains future work:

- no billing calculation
- no rollups
- no Stripe connection
- no plan limits
- no customer charges

See [Billing Architecture v1](../billing/billing-architecture-v1.md) for the future billing sequence.
