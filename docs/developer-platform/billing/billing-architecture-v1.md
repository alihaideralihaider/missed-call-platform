# Billing Architecture v1

Billing must be downstream of metering. Agents do work, metering records usage, billing calculates charges, Stripe collects payment.

This document defines the future billing architecture for AuthToolkit / RecoveryStack / ReplyToRevenue agents. It does not implement billing code, pricing, database migrations, Stripe integration, or public pricing.

## Core Lifecycle

```text
Event -> Agent Run -> Actions -> Attempts -> Outcome -> Delivery -> Usage Metering -> Billing Calculation -> Stripe Invoice
```

Principles:

- Agents should never directly charge customers.
- Usage must be recorded first.
- Billing should aggregate usage over a billing period.
- Charges should be explainable, auditable, and correctable.

## Agent Work

Agent work includes:

- events
- runs
- actions
- attempts
- outcomes
- delivery

Source systems should not calculate billing. Source systems should emit or expose traceable work records. Metering should normalize those records into usage events later.

Examples:

- an accepted event creates an agent run
- an action suggests a modifier
- an attempt sends a reminder
- an outcome records `order_placed`
- delivery sends a webhook or creates a batch file

## Usage Metering

`usage_events` is the future source of truth for usage.

Usage metering should:

- record billable and non-billable usage
- track sandbox traffic with `billable=false`
- preserve source object references
- prevent double billing through idempotency
- keep billing periods in UTC

No billing calculation should happen before normalized usage is recorded.

## Billing Calculation

Billing calculation applies plan rules to usage.

It should calculate:

- included usage
- overages
- credits
- adjustments
- non-billable usage
- sandbox usage

Billing calculation should run on a billing period, not per event.

The first implementation should simulate charges internally before any customer-facing invoice is generated.

## Invoice Line Items

Invoice line items are human-readable billing lines derived from usage.

Examples:

- Agent runs included
- Extra agent runs
- Action executions
- SFTP batch exports
- Dedicated account/location fee
- Credits/adjustments

Line items should be explainable from source usage records. Support should be able to trace an invoice line back to usage events and source work records.

## Stripe Invoice / Payment

Stripe should handle:

- subscription
- invoice
- card payment
- failed payment
- receipt
- tax later if needed

AuthToolkit calculates what should be charged. Stripe collects payment.

Stripe should not be the source of truth for raw agent usage. AuthToolkit should remain the usage and billing calculation source of truth.

## Account Limits / Plan State

A future billing system should track:

- plan
- limits
- billing status
- usage warnings
- overage rules
- grace periods
- support overrides

Failed payment should not immediately break critical customer-facing flows without grace logic.

For production customers, billing status should influence access carefully. Recovery, messaging, and customer-facing flows need explicit grace-period rules before enforcement.

## Minimum Future Tables

These are documented only. Do not create migrations yet.

### `billing_accounts`

Purpose: account-level billing identity and Stripe linkage.

Key fields:

- `id`
- `account_id`
- `stripe_customer_id`
- `billing_email`
- `billing_status`
- `default_currency`
- `created_at`
- `updated_at`

### `billing_plans`

Purpose: plan definitions, included usage, and overage rules.

Key fields:

- `id`
- `plan_key`
- `name`
- `environment`
- `included_metrics`
- `overage_rules`
- `features`
- `active`
- `created_at`
- `updated_at`

### `usage_events`

Purpose: normalized usage source of truth.

Key fields:

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

### `usage_rollups`

Purpose: aggregated usage by account, project, metric, and billing period.

Key fields:

- `id`
- `account_id`
- `project_id`
- `environment`
- `metric_key`
- `billing_period_start`
- `billing_period_end`
- `quantity`
- `billable_quantity`
- `non_billable_quantity`
- `created_at`
- `updated_at`

### `invoice_runs`

Purpose: billing calculation run for a billing period.

Key fields:

- `id`
- `billing_account_id`
- `billing_period_start`
- `billing_period_end`
- `status`
- `stripe_invoice_id`
- `subtotal`
- `credits`
- `adjustments`
- `total`
- `created_at`
- `completed_at`

### `invoice_line_items`

Purpose: human-readable billing lines generated from usage rollups and plan rules.

Key fields:

- `id`
- `invoice_run_id`
- `metric_key`
- `description`
- `quantity`
- `included_quantity`
- `billable_quantity`
- `unit_amount`
- `amount`
- `source_rollup_ids`
- `metadata`
- `created_at`

### `billing_adjustments`

Purpose: manual credits, corrections, and support adjustments.

Key fields:

- `id`
- `billing_account_id`
- `invoice_run_id`
- `adjustment_type`
- `amount`
- `reason`
- `created_by`
- `created_at`

## Build Sequence

### Phase 1: Documentation and Standard

- Universal Agent Metering Standard documented
- Billing Architecture documented
- No billing code yet

### Phase 2: Usage Events Table

- Create `usage_events`
- Log non-billable usage first
- Validate idempotency and source tracing

### Phase 3: Rollups and Reporting

- Aggregate usage by account, project, metric, and month
- Show internal usage reports
- No customer billing yet

### Phase 4: Plan Rules

- Define included usage and overages
- Store plan assignments
- Simulate invoices internally

### Phase 5: Stripe Connection

- Create Stripe products/prices
- Generate invoice line items
- Test invoice flow
- Keep usage in AuthToolkit as source of truth

### Phase 6: Billable Launch

- Turn on `billable=true` for production usage
- Add grace periods, alerts, and support process
- Only then publish hard pricing limits

## Billing Rules

- No immediate per-action card charges.
- Monthly aggregation first.
- UTC billing periods only.
- No double billing for duplicate idempotency keys or `request_id`.
- Rejected events are not billable.
- Internal retries do not create new agent runs.
- Internal retries may create action usage only if real external work occurs.
- Webhook retries should not count as new client outcomes.
- SFTP downloads may be tracked separately from batch file generation.
- Manual credits/adjustments must be supported.

## Pricing Guidance

- Do not finalize AuthToolkit public pricing until metering is implemented and validated.
- Pricing should likely be based primarily on agent runs and action executions.
- SFTP and batch exports should be higher-tier features.
- Stripe/revenue-share/performance fees should not be part of AuthToolkit infrastructure pricing v1.
- Performance/revenue-share can belong to ReplyToRevenue later, not AuthToolkit core infrastructure.

## Operational Risk

Billing must be built carefully because it directly affects customer trust.

Risks:

- disputes
- refunds
- overbilling
- underbilling
- tax complexity
- failed payments
- premature service interruption
- missing grace periods
- incomplete audit logs

Required safeguards:

- source-level traceability
- idempotent usage records
- explainable invoice lines
- manual credits and adjustments
- internal simulation before billing launch
- support review flow
- clear grace-period policy

## Cross-Links

- [Universal Agent Metering Standard](../agent-api/agent-metering-standard.md)
- [Attempts Engine Overview](../../attempts-engine/overview.md)
- [Webhook and Batch Policy](../../attempts-engine/webhook-and-batch-policy.md)
