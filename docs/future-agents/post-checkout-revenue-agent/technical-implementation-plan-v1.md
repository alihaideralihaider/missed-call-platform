# Post-Checkout Revenue Agent Technical Implementation Plan v1

Status:
Future implementation plan. Not built yet.

## Goal

Build the smallest working Post-Checkout Revenue Agent loop using existing platform primitives.

## v1 Principle

Start with universal webhook intake, one offer type, one attempt window, one outcome, and non-billable metering.

## Explicit Non-Goals

- No Shopify native connector
- No Stripe native connector
- No Toast/Clover connector
- No browser automation
- No AI-generated offer catalog
- No rule-builder UI
- No revenue-share billing
- No customer-facing dashboard
- No email file delivery
- No custom per-client logic

## Minimal v1 Loop

```text
checkout_completed
-> post_checkout_revenue agent_run
-> evaluate eligibility
-> create one offer
-> send one offer action
-> optional short reminder
-> add_on_purchased or expired
-> outcome recorded
-> usage_events recorded with billable=false
```

## Event Intake

Endpoint proposal:

```text
POST /api/v1/agent/events
```

Use existing Agent API intake if possible.

Required event type:

```text
checkout_completed
```

Required payload fields:
- `source_system`
- `source_account_id`
- Idempotency key
- Customer contact object
- Consent/channel permissions
- Order/payment ID
- Items
- Total
- Currency
- Metadata

## Agent Run

Run type:

```text
post_checkout_revenue
```

Agent run should store:
- `event_id`
- `source_system`
- `source_slug` / `source_account_id`
- `status`
- `metadata`
- `attempt_job_id` if follow-up sequence is created

The run decides whether to create an offer, suppress the opportunity, or do nothing.

## Offer Model

For v1, do not build AI offer generation.

Use a static test offer from metadata or simple config.

Offer fields:
- `offer_id`
- `title`
- `description`
- `price`
- `currency`
- `expires_at`
- `payment_link` or `add_on_url`
- `suppression_reason` if no offer

## Skills / Actions

Possible v1 actions:
- `evaluate_offer_eligibility`
- `create_static_offer`
- `send_offer_message`
- `send_webhook`
- `record_outcome`
- `expire_offer`

These should be API-backed actions. Browser automation is not part of v1.

## Attempts

Use the Universal Attempts Engine pattern.

V1 attempt design:
- Attempt 1: immediate offer after `checkout_completed`
- Attempt 2: optional reminder within short window
- Expire after window
- Stop on `add_on_purchased`, opt-out, suppression, or expired

Draft time window:
- Default 15 minutes
- Configurable later
- Not a rule-builder in v1

## Outcomes

Required v1 outcomes:
- `add_on_purchased`
- `offer_expired`
- `offer_suppressed`
- `failed`

Outcome metadata:
- `original_order_id`
- `addon_offer_id`
- `addon_amount`
- `currency`
- `source_system`
- Customer reference
- UTC timestamps

## Delivery

V1 delivery:
- `webhook_realtime` for outcome delivery
- SFTP batch pull documented but not required in first build unless existing delivery layer is ready

No email delivery.

Webhook event examples:
- `post_checkout_offer_sent`
- `add_on_purchased`
- `offer_expired`
- `offer_suppressed`

## Metering

Record non-billable `usage_events`:
- `accepted_event`
- `agent_run`
- `action_execution`
- `attempt_execution` if follow-up runs
- `outcome_recorded`
- `webhook_delivery` only when webhook delivery exists

All usage:

```text
billable=false
```

## Billing

No billing implementation in v1.

No Stripe.

No plan enforcement.

No usage-based charges.

Billing remains future work downstream of metering validation.

## Data Model Assumptions

Use existing tables where possible:
- `agent_events`
- `agent_runs`
- `agent_actions`
- `attempt_jobs`
- `attempt_messages`
- `attempt_events`
- `usage_events`

Potential future tables, not v1:
- `post_checkout_offers`
- `post_checkout_outcomes`
- `offer_catalog`
- `connector_accounts`

## Safety and Compliance

- Channel consent required
- Opt-out honored
- Quiet hours may apply
- Suppress if no eligible offer
- Suppress if duplicate event
- Suppress if customer already received offer
- Suppress if no valid contact channel
- No unlimited reminders

## Testing Plan

Manual tests:
- Send `checkout_completed` event
- Verify `agent_event` and `agent_run`
- Verify offer action logged
- Verify `usage_events` rows
- Verify outcome path `add_on_purchased`
- Verify expired path
- Verify idempotency replay does not double-count
- Verify `billable=false`

## Observability

Logs/events to inspect:
- `agent_events`
- `agent_runs`
- `agent_actions`
- `attempt_jobs` if follow-up used
- `usage_events`
- Webhook delivery logs later

## Implementation Phases

Phase 1:
Documentation and plan only

Phase 2:
Webhook event acceptance for `checkout_completed`

Phase 3:
Static offer action and outcome recording

Phase 4:
Optional attempt/reminder sequence

Phase 5:
Webhook outcome delivery

Phase 6:
Calculator/landing page integration

## Open Questions

- What is the first vertical for v1?
- Should SaanaOS direct ordering be the first internal test source?
- Should first offer be food add-on, ecommerce accessory, or service add-on?
- Which channel is safest for first offer?
- Do we require payment link creation in v1, or only outcome simulation?
- Should v1 be internal sandbox only?

## Relationship To Existing Docs

- [Post-Checkout Revenue Agent Productization Loop](./productization-loop.md)
- [Post-Checkout Revenue Agent Deal Room Outline](./deal-room-outline.md)
- [Post-Checkout Revenue Calculator Spec](./calculator-spec.md)
- [Agent Productization Loop](../../developer-platform/agent-productization-loop.md)
- [Universal Agent Metering Standard](../../developer-platform/agent-api/agent-metering-standard.md)
- [Billing Architecture v1](../../developer-platform/billing/billing-architecture-v1.md)
- [Attempts Engine Overview](../../attempts-engine/overview.md)
