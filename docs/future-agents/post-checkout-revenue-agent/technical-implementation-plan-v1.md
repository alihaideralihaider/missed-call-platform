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

## Slice 1 Implementation Notes

Slice 1 supports intake only:
- `checkout_completed` intake only
- No offer execution
- No attempts
- No delivery
- Non-billable metering only

The Agent API accepts generic custom-checkout events through:

```text
POST /api/v1/agent/events
```

Accepted source systems for this first slice:
- `custom_checkout`
- `saanaos`
- `test`

Sample curl:

```bash
curl -i -X POST https://www.saanaos.com/api/v1/agent/events \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: checkout-test-001" \
  -d '{
    "event_type": "checkout_completed",
    "source_system": "custom_checkout",
    "source_account_id": "demo-custom-store",
    "customer": {
      "name": "Test Customer",
      "phone": "+15555550123",
      "email": "test@example.com",
      "consent": {
        "sms": true,
        "whatsapp": false
      }
    },
    "order": {
      "id": "order_1001",
      "items": [
        {
          "id": "item_1",
          "name": "Test Product",
          "quantity": 1,
          "price": 25
        }
      ],
      "total": 25,
      "currency": "USD"
    },
    "metadata": {
      "test": true
    }
  }'
```

Expected:
- HTTP 200
- `agent_event` row created
- `agent_run` row created
- `usage_events` contains `accepted_event` and `agent_run`
- `billable=false`

## Slice 2 Implementation Notes

Slice 2 adds internal static offer action logging only:
- Internal static offer decision logging only
- No customer-facing delivery
- No SMS
- No payment link creation
- No attempts
- No webhook delivery yet
- Action logs create `action_execution` usage with `billable=false`

If `metadata.post_checkout_offer` contains a minimally valid static offer, the agent logs:

```text
action_type = create_static_offer
result.decision = offer_created
```

If no static offer exists, the agent logs:

```text
action_type = suppress_offer
result.decision = offer_suppressed
suppression_reason = missing_static_offer
```

If a static offer exists but is invalid, the agent logs:

```text
action_type = suppress_offer
result.decision = offer_suppressed
suppression_reason = invalid_static_offer
```

Minimal valid static offer fields:
- `offer_id`
- `title`
- `price`
- `currency`

Optional static offer fields:
- `description`
- `expires_at`
- `add_on_url`
- `payment_link`

Sample curl with static offer:

```bash
curl -i -X POST https://www.saanaos.com/api/v1/agent/events \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: checkout-offer-test-001" \
  -d '{
    "event_type": "checkout_completed",
    "source_system": "custom_checkout",
    "source_account_id": "demo-custom-store",
    "customer": {
      "name": "Test Customer",
      "phone": "+15555550123",
      "email": "test@example.com",
      "consent": {
        "sms": true,
        "whatsapp": false
      }
    },
    "order": {
      "id": "order_2001",
      "items": [
        {
          "id": "item_1",
          "name": "Test Product",
          "quantity": 1,
          "price": 25
        }
      ],
      "total": 25,
      "currency": "USD"
    },
    "metadata": {
      "test": true,
      "post_checkout_offer": {
        "offer_id": "offer_drink_001",
        "title": "Add a drink",
        "description": "Add a drink to your order.",
        "price": 3.5,
        "currency": "USD",
        "add_on_url": "https://example.com/add-drink"
      }
    }
  }'
```

Expected:
- HTTP 200
- `agent_event` row created
- `agent_run` row created
- `agent_actions` row created with `action_type = create_static_offer`
- `usage_events` contains `accepted_event`, `agent_run`, and `action_execution`
- `billable=false`

Sample curl without static offer:

```bash
curl -i -X POST https://www.saanaos.com/api/v1/agent/events \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: checkout-offer-test-002" \
  -d '{
    "event_type": "checkout_completed",
    "source_system": "custom_checkout",
    "source_account_id": "demo-custom-store",
    "customer": {
      "name": "Test Customer",
      "phone": "+15555550123",
      "email": "test@example.com",
      "consent": {
        "sms": true,
        "whatsapp": false
      }
    },
    "order": {
      "id": "order_2002",
      "items": [
        {
          "id": "item_1",
          "name": "Test Product",
          "quantity": 1,
          "price": 25
        }
      ],
      "total": 25,
      "currency": "USD"
    },
    "metadata": {
      "test": true
    }
  }'
```

Expected:
- HTTP response shape unchanged
- `agent_actions.action_type = suppress_offer`
- `result.decision = offer_suppressed`
- `result.suppression_reason = missing_static_offer`
- `usage_events` contains `action_execution`
- `billable=false`

## Slice 3 Implementation Notes

Slice 3 adds internal outcome recording only:
- Internal outcome recording only
- No customer-facing delivery yet
- No payment link creation
- No attempts
- No webhook delivery yet
- `outcome_recorded` usage is `billable=false`

Outcome recording endpoint:

```text
POST /api/v1/agent/outcomes/post-checkout
```

Supported outcome types:
- `add_on_purchased`
- `offer_expired`
- `offer_suppressed`
- `failed`

Sample curl:

```bash
curl -i -X POST https://www.saanaos.com/api/v1/agent/outcomes/post-checkout \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: checkout-outcome-test-001" \
  -d '{
    "agent_run_id": "PASTE_AGENT_RUN_ID",
    "outcome_type": "add_on_purchased",
    "outcome_id": "addon_order_123",
    "original_order_id": "order_2101",
    "addon_offer_id": "offer_drink_001",
    "addon_amount": 3.5,
    "currency": "USD",
    "metadata": {
      "test": true
    }
  }'
```

Expected:
- HTTP 200
- `agent_actions` row created with `action_type = record_post_checkout_outcome`
- `usage_events` row created with `metric_key = outcome_recorded`
- `billable=false`

## Slice 4 Implementation Notes

Slice 4 verifies run lookup / trace readability only:
- Run lookup / trace verification only
- No customer-facing delivery
- No SMS
- No payment links
- No attempts
- No billing
- No new usage rows for lookup

Run lookup endpoint:

```text
GET /api/v1/agent/runs/{runId}
```

Sample curl:

```bash
curl -i https://www.saanaos.com/api/v1/agent/runs/PASTE_AGENT_RUN_ID
```

Expected:
- HTTP 200
- `run.metadata.run_type = post_checkout_revenue`
- `actions` array includes `create_static_offer` or `suppress_offer`
- `actions` array includes `record_post_checkout_outcome` after outcome is recorded
- `action_version` is visible
- `payload` and `result` are visible
- This provides a Splunk-style trace for debugging and buyer/internal proof

Trace example:

```text
checkout_completed
-> create_static_offer
-> record_post_checkout_outcome
-> usage_events billable=false
```

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
