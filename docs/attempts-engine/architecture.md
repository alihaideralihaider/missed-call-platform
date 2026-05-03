# Universal Attempts Engine Architecture

The Universal Attempts Engine is an event-driven execution pattern. It separates the incoming business event, the recovery job, outbound attempt records, operational event logs, and final outcome.

Most systems try once. The Attempts Engine creates a job and works it until an outcome happens.

## System Diagram

Core trace:

```text
event -> attempt_job -> agent_run -> agent_actions -> outcome
```

Expanded flow:

```text
+----------------+
| External Event |
| missed_call    |
| checkout_done  |
+-------+--------+
        |
        v
+------------------+
| Attempts Engine  |
| create job       |
+-------+----------+
        |
        v
+------------------+
| attempt_jobs     |
| state/schedule   |
| metadata         |
+-------+----------+
        |
        v
+--------------------+
| Attempts Execution |
| cron/retries       |
+-------+------------+
        |
        v
+-----------------------------+
| attempt_messages/events     |
| communication + logs        |
+-------+---------------------+
        |
        v
+----------------------+
| Agent API optional   |
| agent_runs           |
+-------+--------------+
        |
        v
+----------------+
| agent_actions  |
| decisions      |
+-------+--------+
        |
        v
+----------------------+
| Outcome              |
| order_placed/expired |
+-------+--------------+
        |
        v
+----------------+
| Delivery       |
| webhook / SFTP |
+----------------+
```

Layer responsibilities:

- External Event: the business trigger, such as `missed_call` today or `checkout_completed` in a future pattern.
- Attempts Engine: creates and coordinates the recovery job.
- `attempt_jobs`: stores state, scheduling, metadata, expiry, attempt counts, and outcomes.
- Attempts Execution: cron-driven processing for due active jobs.
- `attempt_messages`: records customer-facing communication attempts.
- `attempt_events`: records operational logs and state transitions.
- Agent API optional bridge: `agent_runs.attempt_job_id` links a platform run to an attempt job for traceability.
- `agent_actions`: records logged decisions and executed wrapper actions.
- Outcome: the final state, such as `order_placed`, `expired`, or `failed`.
- Delivery: realtime webhook delivery or UTC batch output through SFTP in future integrations.

## Event Layer

An event is the business trigger. In the current SaanaOS implementation, the live event is an inbound missed call. Future events may include checkout completion, cart abandonment, lead capture, donation activity, or review eligibility.

Events should be normalized before they create jobs. The Agent API can also persist `agent_events` and `agent_runs` for platform traceability.

## `attempt_jobs`

`attempt_jobs` is the durable job table. It tracks:

- what agent/use case owns the job
- who the follow-up is for
- how many attempts have happened
- when the next attempt is due
- when the job expires
- whether the job is active, succeeded, expired, or failed
- metadata such as `orderLink`, `restaurantSlug`, and message context

For missed-call recovery, this is the durable state that survives the initial webhook request.

## `attempt_messages`

`attempt_messages` records outbound or suppressed attempt messages.

It answers:

- which channel was used
- which provider handled the send
- what message type was sent
- whether the message was sent, suppressed, or failed
- when it was sent

This table is the audit trail for customer-facing communication attempts.

## `attempt_events`

`attempt_events` records state transitions and engine decisions.

Examples:

- job created
- SMS recorded
- execution skipped
- attempt executed
- job expired
- order placed

This table is useful for debugging, support, and analytics.

## Cron Execution Route

The cron route processes due active jobs:

```text
GET /api/cron/attempts/run
```

It requires `CRON_SECRET` through either:

- `Authorization: Bearer <CRON_SECRET>`
- `?secret=<CRON_SECRET>`

For v1, the route processes missed-call recovery jobs only. It does not change retry timing or templates dynamically.

## Outcome Tracking

The job outcome is stored on `attempt_jobs`.

Current outcomes include:

- `succeeded` when an order is placed
- `expired` when attempts are exhausted or the job passes expiry
- `failed` when execution cannot proceed safely

When an order is placed, the succeeded job must clear `next_attempt_at` so it can never be picked up by the cron route again.

## Agent API Bridge

The Agent API can create `agent_events`, `agent_runs`, and `agent_actions`.

`agent_runs.attempt_job_id` is the bridge between the Universal Attempts Engine and future agent traces.

Trace model:

```text
event -> attempt_job -> agent_run -> agent_actions -> outcome
```

For v1, this bridge is traceability only. It does not change attempts execution behavior.
