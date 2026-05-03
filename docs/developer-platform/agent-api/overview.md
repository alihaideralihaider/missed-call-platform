# AuthToolkit / RecoveryStack v1 Agent API Overview

AuthToolkit is the agent execution infrastructure behind RecoveryStack. It gives businesses and software platforms a structured way to send business events, request agent decisions, and execute validated actions.

The core design principle is:

> Agents decide; APIs execute.

Agents can recommend, rank, suppress, or trigger actions, but the execution API must validate every action against the source system, business configuration, customer consent, product availability, pricing rules, and risk rules.

## Product Layers

- AuthToolkit: infrastructure layer for identity, trust, event intake, action execution, logs, webhooks, and developer access.
- RecoveryStack: agent/product layer for revenue recovery, missed-call recovery, post-checkout growth, repeat-order flows, and follow-up automation.
- SaanaOS: first internal implementation using restaurant missed-call recovery, modifier suggestions, SMS ordering links, and direct pickup ordering.

## External API Shape

The future `/v1/agent` API should allow external systems to:

- send events such as missed calls, cart starts, checkout completions, and received messages
- request agent actions such as modifier suggestions, order links, payment links, and repeat-order flows
- receive webhook notifications about agent runs, action results, suppressed actions, and failures
- retrieve agent run status for debugging and auditability

## Public Concepts

The public API should use external-ready language:

- `business`
- `location`
- `agent_installation`
- `customer`
- `event`
- `agent_run`
- `action`
- `source_system`
- `source_slug`

Do not expose internal SaanaOS table names as public API concepts.

## Compatibility With SaanaOS

SaanaOS should remain compatible through source metadata:

```json
{
  "source_system": "saanaos",
  "source_slug": "demo-restaurant"
}
```

This lets AuthToolkit route events and actions back to the correct internal implementation without leaking internal schema details to external developers.

## API Philosophy

The v1 API should be action-oriented, not generic CRUD.

Good:

- `POST /v1/agent/events`
- `POST /v1/agent/actions/suggest-modifier`
- `POST /v1/agent/actions/create-order-link`

Avoid:

- public direct writes into internal agent tables
- public access to internal restaurant, order, modifier, or message table names
- generic database-style endpoints

