# Post-Checkout Revenue Agent Productization Loop

Status:
Future supported pattern. Not live yet.

The Post-Checkout Revenue Agent turns a completed checkout into the next best revenue action, such as an add-on offer, upgrade, bundle, subscription, tip, repeat-order path, or no action.

Core thesis:
Turn any checkout into the next sale.

## Full Loop

```text
Painful Business Event
-> Buyer-Facing Product Promise
-> Event Intake
-> Agent Run
-> Actions / Skills
-> Attempts / Follow-Up
-> Outcome
-> Delivery Back to Client
-> Metering
-> Billing
-> Deal Room / Buyer Enablement
-> Learning Loop
```

## 1. Painful Business Event

What it means:
A customer has completed checkout. The business has a short window to offer a relevant add-on, upgrade, repeat order, tip, donation add-on, or bundle.

Most systems treat checkout as the end, but it can be the beginning of the next revenue moment.

Events:
- `checkout_completed`
- `payment_completed`
- `order_completed`
- `booking_completed`
- `donation_completed`

Required question:
What post-checkout moment has enough intent to justify another action?

## 2. Buyer-Facing Product Promise

Primary promise:
Turn any checkout into the next sale.

Alternative buyer promises:
- Increase revenue after checkout without rebuilding your checkout.
- Offer the right add-on after the customer has already bought.
- Recover extra value from completed orders, bookings, and payments.

The buyer-facing promise should avoid technical language. The buyer should understand the value before hearing about event intake, agent runs, or metering.

## 3. Event Intake

What it means:
The platform receives a completed-checkout trigger from the business system.

Initial intake should be universal webhook/API.

Future connectors can include:
- Shopify
- WooCommerce
- Stripe
- Square
- PayPal
- Toast
- Clover
- SaanaOS
- Custom checkouts

These connectors are future possibilities. They are not live for this agent yet.

Draft event shape:

```json
{
  "event_type": "checkout_completed",
  "source_system": "custom_checkout",
  "source_account_id": "account_123",
  "customer": {
    "name": "Customer Name",
    "phone": "+15555550123",
    "email": "customer@example.com",
    "consent": {
      "sms": true,
      "whatsapp": false
    }
  },
  "order": {
    "id": "order_456",
    "items": [
      {
        "id": "item_123",
        "name": "Chicken Sandwich",
        "quantity": 1,
        "price": 12.99
      }
    ],
    "total": 42.5,
    "currency": "USD"
  },
  "metadata": {
    "vertical": "restaurant",
    "channel": "web_checkout"
  },
  "idempotency_key": "checkout_order_456"
}
```

Required question:
How does the system receive the trigger?

## 4. Agent Run

What it means:
One `checkout_completed` event creates one `post_checkout_revenue` run.

The run decides whether to offer, suppress, or do nothing. It should remain traceable through `agent_runs`.

If a follow-up sequence is created later, the run should link to a future `attempt_job_id`.

Suggested run type:
`post_checkout_revenue`

Required question:
What traceable lifecycle did the agent start?

## 5. Actions / Skills

Future possible actions:
- `evaluate_offer_eligibility`
- `select_addon_offer`
- `create_addon_payment_link`
- `send_sms`
- `send_email` only if channel policy changes later; for now avoid email as delivery default
- `send_whatsapp` where consent/channel support exists
- `send_webhook`
- `suppress_offer`
- `expire_offer`
- `record_outcome`

Actions must be API-backed where possible. Browser automation is fallback only.

Required question:
What actions can the agent perform?

## 6. Attempts / Follow-Up

V1 attempt logic conceptually:
- Attempt 1: immediate or near-immediate post-checkout offer
- Attempt 2: reminder inside short decision window
- Attempt 3: optional final reminder only if compliant and useful
- Expire when offer window closes
- Stop on `add_on_purchased`, opt-out, payment failure, suppression, or expired window

Draft time-window assumptions:
- Food/order use case: 5-15 minute window
- Ecommerce use case: 15-60 minute window
- Booking/service use case: same day window

These are draft assumptions, not implemented behavior.

Required question:
What retry, expiration, opt-out, and stop rules apply?

## 7. Outcome

Possible outcomes:
- `add_on_purchased`
- `bundle_added`
- `upgrade_purchased`
- `tip_added`
- `subscription_started`
- `repeat_order_started`
- `offer_skipped`
- `offer_expired`
- `suppressed`
- `failed`

The key business value is incremental revenue after the original checkout.

Required question:
What result proves the agent worked or stopped safely?

## 8. Delivery Back to Client

Approved delivery:
- `webhook_realtime`
- `sftp_batch_pull`

No email delivery for outcome files.

Realtime webhook examples:
- `post_checkout_offer_sent`
- `add_on_purchased`
- `offer_expired`
- `offer_suppressed`

Batch file:
- UTC midnight-to-midnight batch
- Client downloads from our SFTP
- Timestamps UTC

Required question:
How does the client receive outcomes?

## 9. Metering

Future usage metrics:
- `accepted_event`
- `agent_run`
- `action_execution`
- `attempt_execution`
- `outcome_recorded`
- `webhook_delivery`
- `batch_file_generated`
- `sftp_file_downloaded`

For v1:
- `billable=false` until pricing and billing validation.
- `usage_events` should be recorded before any billing calculation.

Required question:
What usage should be recorded?

## 10. Billing

Billing is future work downstream of `usage_events`.

Rules:
- No immediate per-action charges.
- AuthToolkit infrastructure pricing should likely use agent runs and action executions.
- ReplyToRevenue may later support performance/revenue-share pricing, but that is not part of AuthToolkit infrastructure v1.
- Billing must remain auditable and explainable.

Required question:
How will usage become explainable billing later?

## 11. Deal Room / Buyer Enablement

The public/product page must include:
- Problem: checkout is treated as the end of the transaction
- Promise: turn checkout into next sale
- Flow diagram
- Example scenarios
- What data is required
- How offers are delivered
- Compliance/consent notes
- What happens if customer ignores it
- What happens when add-on is purchased
- Webhook/SFTP delivery explanation
- Pricing/fit note
- FAQ
- Calculator idea: Post-Checkout Revenue Calculator

Questions the page must answer:
- Will this break my checkout?
- Do I need Shopify/Stripe approval?
- What data do you need?
- Can this work with custom checkout?
- How do you avoid annoying customers?
- How do I get outcomes back into my system?

Required question:
What does the buyer need to confidently buy without a long sales call?

## 12. Learning Loop

Learning signals:
- Offer sent rate
- Offer accepted rate
- Add-on revenue
- Expired rate
- Suppression rate
- Opt-out rate
- Time-to-accept
- Offer type performance
- Customer segment performance
- Source platform performance
- Deal-room questions
- Calculator inputs

Learning should improve offer selection, timing, suppression rules, buyer education, pricing, and future connectors.

Required question:
What data will improve the agent, offer, pricing, docs, or messaging?

## Minimum v1 Scope

- Universal webhook intake only
- One offer type
- One delivery channel
- One outcome: `add_on_purchased` or `expired`
- Non-billable metering only
- No public connector claims
- No Shopify/Stripe/Clover/Toast integration claims yet
- No rule-builder UI

## What Is Not Included In v1

- No full ecommerce platform connector library
- No browser automation
- No complex AI offer generation
- No revenue-share billing
- No dashboard-heavy workflow
- No email file delivery
- No custom per-client logic

## Relationship To Existing Platform Standards

- [Agent Productization Loop](../../developer-platform/agent-productization-loop.md)
- [Universal Agent Metering Standard](../../developer-platform/agent-api/agent-metering-standard.md)
- [Billing Architecture v1](../../developer-platform/billing/billing-architecture-v1.md)
- [Attempts Engine Overview](../../attempts-engine/overview.md)
- [Webhook and Batch Policy](../../attempts-engine/webhook-and-batch-policy.md)
