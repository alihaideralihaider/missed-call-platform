# Developer Platform Documentation

This folder documents the platform foundation behind AuthToolkit, RecoveryStack, ReplyToRevenue, and SaanaOS.

AuthToolkit is the infrastructure and developer layer. RecoveryStack is the agent/product family. ReplyToRevenue is the customer-facing recovery agents brand. SaanaOS is the first live vertical implementation.

## Core Architecture

- [Attempts Engine Overview](../attempts-engine/overview.md): explains the Universal Attempts Engine and the `Event -> Job -> Attempts -> Outcome` pattern.
- [Attempts Engine Architecture](../attempts-engine/architecture.md): documents attempt jobs, messages, events, cron execution, outcomes, and Agent API traceability.
- [Attempts Engine Execution Flow](../attempts-engine/execution-flow.md): describes the current missed-call recovery execution path.
- [Webhook and Batch Policy](../attempts-engine/webhook-and-batch-policy.md): defines realtime webhook delivery and SFTP batch pull policy.

## Agent API

- [Agent Events](./agent-api/events.md): documents accepted event types and the `/v1/agent/events` intake shape.
- [Agent Actions](./agent-api/actions.md): documents action-oriented APIs such as modifier suggestion and apply flows.
- [Agent API Quickstart](./agent-api/quickstart.md): shows the event, action, and run lookup flow.
- [Agent API Roadmap](./agent-api/roadmap.md): tracks staged platform API implementation.
- [Universal Agent Metering Standard](./agent-api/agent-metering-standard.md): defines the usage and traceability standard every future agent must follow.
- [Usage Events v1](./agent-api/usage-events.md): documents the first non-billable usage metering implementation.

## Billing and Usage

- [Billing Architecture v1](./billing/billing-architecture-v1.md): documents the future usage-based billing architecture downstream of metering.
- [Universal Agent Metering Standard](./agent-api/agent-metering-standard.md): defines future metric keys, usage rules, and billing-safe traceability.
- [Usage Events v1](./agent-api/usage-events.md): explains current non-billable usage rows and future billing inputs.

## Current Live Implementation

SaanaOS missed-call recovery is the first live implementation.

The Universal Attempts Engine is implemented and tested for missed-call recovery. It creates durable attempt jobs, records messages and events, executes due reminders through cron, and records outcomes such as `order_placed` or `expired`.

Post-Checkout Revenue and Post-Checkout Growth are future patterns, not live yet.

## Standard Platform Lifecycle

```text
Event -> Agent Run -> Actions -> Attempts -> Outcome -> Delivery -> Usage Metering -> Billing Calculation -> Stripe Invoice
```

- Event: the business trigger entering the platform.
- Agent Run: the traceable lifecycle created from an accepted event.
- Actions: meaningful steps the agent takes or logs.
- Attempts: scheduled follow-up executions tied to durable jobs.
- Outcome: the business result, such as order placed, expired, stopped, or failed.
- Delivery: realtime webhook or SFTP batch output back to the client.
- Usage Metering: normalized usage records used for reporting and future billing.
- Billing Calculation: plan rules applied to usage over a UTC billing period.
- Stripe Invoice: payment collection and invoice handling after AuthToolkit calculates charges.

## Brand Architecture

- AuthToolkit = infrastructure / developer layer
- RecoveryStack = agent/product family
- ReplyToRevenue = customer-facing recovery agents brand
- SaanaOS = first live restaurant implementation

## Implementation Order

1. Attempts Engine
2. Agent API traceability
3. Metering Standard
4. Billing Architecture
5. Usage Events implementation
6. Rollups/reporting
7. Plan rules
8. Stripe invoice integration
9. Post-Checkout Revenue Agent
