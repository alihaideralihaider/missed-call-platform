# Universal Agent Metering Standard v1

This is the standard every AuthToolkit / RecoveryStack / ReplyToRevenue agent must follow.

The standard defines how agents are traced, measured, and prepared for future billing. It does not implement billing, pricing, or database changes. It creates the rules every future agent must satisfy before usage-based pricing is finalized.

## Core Lifecycle

```text
Event -> Agent Run -> Actions -> Attempts -> Outcome -> Delivery -> Usage Metering
```

Every agent must answer:

- What triggered it?
- What run was created?
- What actions were attempted?
- What follow-ups were executed?
- What outcome happened?
- What was delivered back to the client?
- What should be counted for billing/usage?

## Event

An event is the business trigger entering the system.

Examples:

- `missed_call`
- `checkout_completed`
- `lead_created`
- `payment_completed`
- `order_delivered`
- `review_eligible`

Storage:

- stored as `agent_events`

Metric:

- tracked as `accepted_event`

Rules:

- rejected events are not billable
- replayed accepted events must respect idempotency
- events should preserve source system context without exposing internal SaanaOS table names as public API concepts

## Agent Run

An agent run is one lifecycle created from an accepted event.

Storage:

- stored as `agent_runs`

Primary future usage metric:

- `agent_run`

Rules:

- internal retries must not create new runs
- one accepted event should normally create one run
- a run may link to an attempt job through `agent_runs.attempt_job_id`
- the run is the main trace container for actions and outcomes

## Action

An action is a meaningful step the agent takes or logs.

Examples:

- `send_sms`
- `send_webhook`
- `suggest_modifier`
- `apply_modifier`
- `create_attempt_job`
- `execute_attempt`
- `generate_order_link`
- `request_review`
- `offer_addon`
- `generate_batch_file`

Storage:

- stored as `agent_actions`

Metric:

- `action_execution`

Rules:

- actions are idempotent by `request_id`
- duplicate `request_id` must not count twice
- action logs should include an action version such as `v1`
- actions should point back to an agent run when traceability is requested

## Attempt

An attempt is a scheduled follow-up execution.

Storage:

- stored across `attempt_jobs`, `attempt_messages`, and `attempt_events`

Agent action representation:

- each executed attempt may also be represented as an agent action: `execute_attempt`

Metric:

- `attempt_execution` or `action_execution`, depending on implementation stage

Rules:

- an attempt should belong to a durable attempt job
- terminal jobs must not continue scheduling attempts
- succeeded jobs must clear `next_attempt_at`
- attempts that perform real external work may be counted as billable actions in future pricing

## Outcome

An outcome is the final or meaningful business result.

Examples:

- `order_placed`
- `add_on_purchased`
- `review_submitted`
- `lead_booked`
- `deposit_paid`
- `expired`
- `failed`
- `stopped`

Metric:

- `outcome_recorded`

Rules:

- outcomes are usually not directly billable at first
- outcomes are critical for reporting, optimization, and customer-facing value
- outcome records should link back to their source run, action, or attempt job

## Delivery

Approved delivery methods:

- `webhook_realtime`
- `sftp_batch_pull`

Email delivery is not approved.

Metrics:

- `webhook_delivery`
- `batch_file_generated`
- `sftp_file_downloaded`

Rules:

- all delivery timestamps are UTC
- webhook retries should not count as separate client outcomes
- SFTP downloads may be tracked separately from batch file generation
- the same outcome data should be available in realtime webhook and batch files when both modes are enabled

## Usage Metering

Usage metering records normalized usage rows later.

Future table name:

- `usage_events`

Important:

- usage metering should not be implemented until this standard is reviewed
- the first implementation should be small, auditable, and idempotent
- every usage row should point back to the source object that created it

## Billing Rules

- No double billing.
- Replayed idempotency keys do not count twice.
- Duplicate `request_id` does not count twice.
- Rejected events do not count.
- Sandbox traffic is tracked but `billable=false`.
- Internal retries do not create new billable agent runs.
- Internal retries may count as action executions only when they perform real external work.
- UTC billing periods only.
- Every usage metric must point back to a `source_type` and `source_id`.
- Webhook retries should not count as separate client outcomes.
- SFTP downloads may be tracked separately from batch file generation.

## Proposed `usage_events` Shape

Documented fields only. Do not create a migration yet.

- `id`
- `account_id`
- `project_id`
- `environment`
- `metric_key`
- `source_type`
- `source_id`
- `quantity`
- `billable`
- `idempotency_key`
- `occurred_at`
- `billing_period_start`
- `billing_period_end`
- `metadata`
- `created_at`

## Metric Keys

Initial metric keys:

- `accepted_event`
- `agent_run`
- `action_execution`
- `attempt_execution`
- `webhook_delivery`
- `batch_file_generated`
- `sftp_file_downloaded`
- `outcome_recorded`

## Agent Applicability

This standard applies to:

- Missed Call Recovery Agent
- Post-Checkout Revenue Agent
- Post-Checkout Growth Agent
- Lead Follow-Up Agent
- Payment Follow-Up Agent
- Review Request Agent
- Donation Agent
- future outcome agents

## Pricing Guidance

Pricing must not be finalized until these metrics are implemented and validated.

AuthToolkit pricing should eventually be based primarily on agent runs and action executions. Events should be tracked but may not be separately billed in v1.

Early pricing analysis should focus on:

- agent runs per account
- action executions per run
- attempts per successful outcome
- delivery volume by webhook and SFTP
- conversion and expiry rates
- sandbox vs live usage

## Cross-Links

- [Attempts Engine Overview](../../attempts-engine/overview.md)
- [Attempts Engine Architecture](../../attempts-engine/architecture.md)
- [Webhook and Batch Policy](../../attempts-engine/webhook-and-batch-policy.md)
- [Agent Events](./events.md)
- [Agent Actions](./actions.md)
