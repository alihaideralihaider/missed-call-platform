# Universal Attempts Engine Overview

The Universal Attempts Engine is the recovery layer behind persistent follow-up workflows in SaanaOS. It turns an inbound business event into a tracked job, sends a bounded sequence of attempts, and records the final outcome.

Core principle:

```text
Event -> Job -> Attempts -> Outcome
```

## What It Does

The engine makes follow-up reliable. Instead of sending one message and losing the thread, SaanaOS creates an `attempt_job`, records each outbound or suppressed message in `attempt_messages`, records operational state changes in `attempt_events`, and keeps trying until the job succeeds, expires, or fails.

## First Live Use Case

The first implemented use case is missed-call recovery in SaanaOS:

1. A restaurant misses a call.
2. SaanaOS creates a recovery attempt job.
3. The first SMS recovery link is sent after the existing IVR/consent flow.
4. Follow-up reminders are scheduled through `next_attempt_at`.
5. The cron route sends due attempts.
6. A completed order marks the job as succeeded.
7. Jobs that do not convert expire after the allowed attempts.

## Why It Matters

Missed calls, abandoned carts, post-checkout offers, review requests, and lead follow-ups all share the same operational pattern: keep trying safely until there is a conversion, explicit stop, expiry, or failure.

The Universal Attempts Engine gives SaanaOS a reusable foundation for:

- missed-call recovery
- future post-checkout revenue follow-up
- future post-checkout growth follow-up
- lead follow-up
- donation follow-up
- future outcome-driven agents

## Current Status

Status: implemented, tested, and committed for the SaanaOS missed-call recovery flow.

The current production behavior is intentionally narrow:

- only the missed-call recovery use case is live
- retry timing is fixed
- SMS templates are fixed
- cron execution processes due active jobs
- Agent API runs can optionally link back to attempt jobs for traceability

Post-Checkout and other future agents are product patterns, not live attempts-engine executions yet.
