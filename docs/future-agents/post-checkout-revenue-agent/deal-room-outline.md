# Post-Checkout Revenue Agent Deal Room Outline

Status:
Future supported pattern. Not live yet.

This deal room explains how the Post-Checkout Revenue Agent will help businesses turn completed checkouts into the next best revenue action.

Buyer-facing promise:
“Turn any checkout into the next sale.”

## Who This Is For

- Ecommerce stores
- Restaurants with direct ordering
- Service businesses with paid bookings
- Donation/fundraising platforms
- Agencies managing checkout/revenue flows
- Custom checkout platforms

This is not limited to Shopify. Shopify is only one possible future connector.

## The Problem

Most businesses treat checkout as the end of the transaction.

But after checkout, the customer has high intent, payment trust, and recent attention.

That moment can be used carefully for:
- Add-ons
- Bundles
- Upgrades
- Tips
- Subscriptions
- Repeat-order paths
- Review/referral flows later

Post-Checkout Revenue should stay focused on revenue. Review, referral, and growth flows can become separate future agent patterns.

## The Promise

- Turn any checkout into the next sale.
- Increase revenue after checkout without rebuilding the checkout.
- Offer the right add-on after the customer already bought.
- Recover extra value from completed orders, bookings, and payments.

## How It Works

```text
Checkout Completed
-> Revenue Agent Evaluates Opportunity
-> Offer Sent or Suppressed
-> Customer Accepts / Ignores / Expires
-> Outcome Delivered Back
-> Usage Recorded
```

Checkout Completed:
The business sends a completed checkout, order, booking, payment, or donation event.

Revenue Agent Evaluates Opportunity:
The agent checks the customer, order, eligible offers, consent, timing, suppression rules, and source system context.

Offer Sent or Suppressed:
If the opportunity is valid, the agent can trigger one relevant offer. If not, it suppresses the offer or does nothing.

Customer Accepts / Ignores / Expires:
The customer can accept the offer, ignore it, or let the offer expire. Follow-up must stay within the allowed window.

Outcome Delivered Back:
Accepted, expired, or suppressed outcomes are delivered back through approved delivery methods.

Usage Recorded:
Accepted events, runs, actions, attempts, outcomes, and delivery records are metered before any future billing calculation.

## Example Scenarios

Restaurant:
Customer orders pizza. The agent offers “add dessert or drink within 10 minutes.”

Ecommerce:
Customer buys a product. The agent offers warranty, refill, accessory, or bundle add-on.

Service business:
Customer books appointment. The agent offers add-on service, deposit upgrade, or maintenance plan.

Donation:
Donor completes donation. The agent offers monthly giving upgrade or campaign share.

These are examples and future patterns. They are not all live integrations.

## What Data Is Needed

- Checkout/order ID
- Customer contact method
- Consent/channel permissions
- Purchased items
- Order total
- Currency
- Source system
- Eligible add-ons or offer catalog
- Callback/webhook destination
- Suppression rules

## What The Agent Decides

- Should we offer anything?
- Which offer is relevant?
- Which channel is allowed?
- How long is the offer valid?
- Should we suppress because of consent, low value, duplicate order, or bad timing?
- When should the opportunity expire?

## Delivery and Data Handoff

Approved methods:
- Realtime webhook
- SFTP batch pull

No email delivery.

Webhooks are for realtime outcome delivery.

SFTP pull is for daily/periodic batch reconciliation.

All timestamps are UTC. Clients are responsible for timezone conversion.

## What Happens If Customer Ignores It

- The offer can expire.
- A reminder may be sent if compliant.
- The agent stops after the allowed window.
- There is no unlimited follow-up.
- Opt-out and suppression rules must be respected.

## What Happens If Customer Accepts

- Add-on purchase / upgrade / bundle is recorded.
- Outcome is sent back by webhook.
- Batch record appears in SFTP output later.
- Metering records usage.
- Future billing can be calculated from usage records.

## Compliance and Consent Notes

- Channel consent must be respected.
- Promotional messages require appropriate consent.
- Transactional and promotional messaging must be separated.
- Opt-out must be honored.
- Quiet hours and suppression rules may be needed.
- Do not send offers where channel or policy does not allow it.

## What Is Live vs Future

Live today:
- Universal Attempts Engine exists in SaanaOS missed-call recovery.
- Agent API traceability exists.
- Non-billable usage metering foundation exists.

Future / not live:
- Post-Checkout Revenue Agent
- Checkout connectors
- Offer selection engine
- Add-on payment link flow
- Webhook/SFTP production delivery for this agent
- Billing for this agent

## Buyer FAQ

### Will this break my existing checkout?

No. The intended first version starts after checkout by receiving a completed-checkout event. It should not require rebuilding the checkout.

### Do I need Shopify or Stripe approval?

Not for the universal webhook/API concept. Native Shopify, Stripe, and other connectors are future possibilities and are not live for this agent yet.

### Can it work with a custom checkout?

Yes, that is the intended starting point: a universal webhook/API where a custom checkout sends a `checkout_completed` event.

### What systems can it connect to?

The first planned path is universal webhook/API. Platform connectors can come later. Do not assume Shopify, Stripe, Toast, Clover, WooCommerce, or other connectors are live yet.

### How do you avoid annoying customers?

The agent must respect consent, suppression rules, timing windows, opt-outs, and offer eligibility. It should suppress offers when timing, value, or policy is not right.

### What if the customer already bought enough?

The agent can suppress the offer or do nothing. A good agent should not offer just because an event exists.

### How are outcomes sent back?

Approved delivery methods are realtime webhooks and SFTP batch pull. Email delivery is not part of the approved outcome-delivery policy.

### Can agencies use this for clients?

That is a future fit. Agencies managing checkout and revenue flows can use the same event, outcome, webhook, and batch delivery model once the product is implemented.

### Is this live today?

No. This is a future supported pattern. The live implementation today is SaanaOS missed-call recovery using the Universal Attempts Engine.

### How will pricing work?

Pricing is not finalized. It should wait until non-billable metering validates real usage. AuthToolkit infrastructure pricing should be based on explainable metrics such as agent runs and action executions.

## Calculator Idea

Title:
Post-Checkout Revenue Calculator

Inputs:
- Monthly checkouts
- Average order value
- Eligible add-on price
- Estimated offer acceptance rate
- Current post-checkout revenue
- Expected lift

Output:
- Estimated incremental monthly revenue
- Estimated annual revenue
- Offer opportunity count

The calculator is a buyer-education asset and should not overpromise.

## Deal Room Assets Needed Before Launch

- Landing page
- Flow diagram
- Demo payload
- Sample webhook response
- Sample SFTP batch row
- FAQ
- Compliance notes
- Calculator
- Setup checklist
- Example offer catalog
- Internal troubleshooting guide
- Pricing/fit notes

## Relationship To Platform Standards

- [Post-Checkout Revenue Agent Productization Loop](./productization-loop.md)
- [Agent Productization Loop](../../developer-platform/agent-productization-loop.md)
- [Universal Agent Metering Standard](../../developer-platform/agent-api/agent-metering-standard.md)
- [Billing Architecture v1](../../developer-platform/billing/billing-architecture-v1.md)
- [Attempts Engine Overview](../../attempts-engine/overview.md)
- [Webhook and Batch Policy](../../attempts-engine/webhook-and-batch-policy.md)
