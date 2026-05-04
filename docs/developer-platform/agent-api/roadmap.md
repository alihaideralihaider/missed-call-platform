# Agent API Roadmap

For the full platform documentation index, see [Developer Platform Documentation](../README.md).

Before new agent implementation, the [Agent Productization Loop](../agent-productization-loop.md) should be completed for that agent.

## Phase 1: Internal Wrapper

Goal: wrap the existing SaanaOS agent behavior behind cleaner internal interfaces.

Scope:

- normalize modifier suggestion action shape
- normalize apply suggestion action shape
- keep existing SaanaOS runtime behavior
- keep validation inside existing source systems
- persist action logs for v1 suggest/apply modifier calls when `agent_run_id` is supplied
- include action versioning and idempotent request logging for initial action traces

Outcome:

- AuthToolkit can describe SaanaOS agent behavior without exposing internal tables.
- Initial platform tables exist for `agent_events`, `agent_runs`, and `agent_actions`.
- Suggest/apply modifier calls can be traced through `GET /v1/agent/runs/{id}`.
- Action logs include `action_version`, UTC timestamps, and duplicate `request_id` protection.
- Agent runs can optionally link to Universal Attempts Engine jobs through `attempt_job_id` without changing attempts execution.

## Phase 2: Event Intake

Goal: accept structured events through an internal or private `/v1/agent/events` endpoint.

Scope:

- missed call events
- cart started events
- modifier suggestion requested events
- checkout completed events
- idempotency keys
- request IDs
- source system metadata
- persisted `agent_events`
- persisted `agent_runs`
- optional `attempt_job_id` bridge for traceability from attempts to agent runs and actions

Outcome:

- external systems can trigger and inspect accepted agent runs without direct integration into SaanaOS internals.
- internal traces can connect `event -> attempt_job -> agent_run -> agent_actions -> outcome`.

## Phase 3: Sandbox

Goal: let developers test events, actions, and suppressions safely.

Scope:

- sandbox businesses
- test customers
- fixture events
- replay events
- mock message sending
- logs

Outcome:

- developers can integrate without production risk.

## Phase 4: Webhooks

Goal: notify external systems when agent runs and actions change state.

Scope:

- webhook endpoints
- signing secrets
- retries
- delivery logs
- webhook replay

Outcome:

- external systems can react to agent results.

## Phase 5: Public Developer Portal

Goal: make the platform external-ready.

Scope:

- developer accounts
- API keys
- webhook configuration
- sandbox management
- logs and replay
- public documentation
- status and usage reporting

Outcome:

- AuthToolkit becomes a developer-facing agent execution platform, with SaanaOS as the first internal implementation and RecoveryStack as the product family.

## Metering Standard

The Universal Agent Metering Standard v1 is documented in [agent-metering-standard.md](./agent-metering-standard.md).

Usage Events v1 is implemented as non-billable metering only and documented in [usage-events.md](./usage-events.md).

Pricing and billing should not be finalized until normalized usage metrics are validated and tied back to source runs, actions, attempts, outcomes, and delivery records.

## Billing Architecture

Billing Architecture v1 is documented as future work downstream of metering in [billing-architecture-v1.md](../billing/billing-architecture-v1.md).

Billing implementation should start only after `usage_events` are implemented, idempotent, traceable, and validated against real agent runs, actions, attempts, outcomes, and delivery records.
