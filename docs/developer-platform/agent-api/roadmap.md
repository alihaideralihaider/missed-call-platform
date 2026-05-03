# Agent API Roadmap

## Phase 1: Internal Wrapper

Goal: wrap the existing SaanaOS agent behavior behind cleaner internal interfaces.

Scope:

- normalize modifier suggestion action shape
- normalize apply suggestion action shape
- keep existing SaanaOS runtime behavior
- keep validation inside existing source systems
- prepare internal run/action logs

Outcome:

- AuthToolkit can describe SaanaOS agent behavior without exposing internal tables.

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

Outcome:

- external systems can trigger agent runs without direct integration into SaanaOS internals.

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

