# SaanaOS Pricing Engine v1

## Purpose

Pricing should be centralized, versioned, explainable, and not scattered across checkout, billing, admin, and marketing code.

Pricing Engine v1 is a SaanaOS-first architecture plan. It defines how SaanaOS should quote restaurant plans, add-ons, setup fees, pilots, promos, and sales overrides before those values reach checkout, billing, Stripe, admin views, or public pricing copy.

This is not a full billing platform. It is the smallest pricing foundation needed to reduce drift and make future billing behavior safer. The same architecture may later support AuthToolkit pricing APIs if the boundary becomes useful outside SaanaOS.

## Current Problem

Hardcoded or duplicated pricing creates drift, unsafe edits, wrong invoices, inconsistent sales offers, and higher deployment risk.

Common failure modes:

- Checkout total differs from sales or admin expectations.
- Marketing/pricing pages show stale numbers.
- Stripe Price IDs no longer match internal plan names.
- Free pilots or discounts are applied inconsistently.
- Existing customer pricing changes accidentally.
- Setup fees or add-ons are waived without an approval trail.

## Pricing Engine v1 Scope

Support:

- SaanaOS plans.
- Monthly subscription pricing.
- Setup fees.
- Virtual phone add-on.
- Website hosting/maintenance add-on.
- Assisted support add-on.
- Free pilot rules.
- Promo/discount rules.
- Sales overrides with approval.
- Effective dates.
- Grandfathered pricing placeholder.

Out of scope for v1:

- Full revenue recognition.
- Usage-based billing engine.
- Automated collections.
- Contract lifecycle management.
- Self-service plan migration.

## Pricing Quote Flow

Input:

- `restaurant_id`
- `plan_id`
- `addons`
- `promo_code`
- `sales_override`
- `billing_cycle`
- `effective_date`

Output:

- `pricing_version`
- `line_items`
- `discounts`
- `subtotal`
- `tax` placeholder
- `total`
- `currency`
- `reason_codes`
- `warnings`

Example shape:

```json
{
  "pricing_version": "saanaos-pricing-2026-05",
  "line_items": [
    {
      "key": "plan.monthly",
      "label": "SaanaOS Monthly Plan",
      "amount": 29900,
      "currency": "usd",
      "reason_code": "selected_plan"
    }
  ],
  "discounts": [],
  "subtotal": 29900,
  "tax": null,
  "total": 29900,
  "currency": "usd",
  "reason_codes": ["selected_plan"],
  "warnings": []
}
```

## Suggested Data Model

These are draft tables, not migrations.

### `pricing_versions`

| Column | Purpose |
| --- | --- |
| `pricing_version_id` | Stable version identifier. |
| `name` | Human-readable version name. |
| `status` | `draft`, `active`, `retired`. |
| `effective_from` | First date this version can be used. |
| `effective_to` | Optional retirement date. |
| `created_at` | Creation timestamp. |
| `created_by` | User or system that created it. |

### `pricing_plans`

| Column | Purpose |
| --- | --- |
| `pricing_plan_id` | Internal plan identifier. |
| `pricing_version_id` | Version this plan belongs to. |
| `plan_id` | Public/internal plan key. |
| `plan_name` | Display name. |
| `billing_cycle` | Example: `monthly`. |
| `amount` | Amount in minor currency units. |
| `currency` | Example: `usd`. |
| `stripe_price_id` | Stripe Price mapping placeholder. |
| `status` | `active`, `hidden`, `retired`. |

### `pricing_addons`

| Column | Purpose |
| --- | --- |
| `pricing_addon_id` | Internal add-on identifier. |
| `pricing_version_id` | Version this add-on belongs to. |
| `addon_id` | Add-on key. |
| `addon_name` | Display name. |
| `amount` | Amount in minor currency units. |
| `currency` | Example: `usd`. |
| `billing_cycle` | `monthly`, `one_time`, or other supported cycle. |
| `stripe_price_id` | Stripe Price mapping placeholder. |
| `status` | `active`, `hidden`, `retired`. |

### `pricing_rules`

| Column | Purpose |
| --- | --- |
| `pricing_rule_id` | Internal rule identifier. |
| `pricing_version_id` | Version this rule belongs to. |
| `rule_type` | `setup_fee`, `promo`, `pilot`, `override`, `grandfathering`. |
| `rule_key` | Stable rule key. |
| `conditions` | Structured conditions for eligibility. |
| `effects` | Structured pricing effects. |
| `requires_approval` | Whether approval is required. |
| `effective_from` | First date this rule can apply. |
| `effective_to` | Optional retirement date. |

### `pricing_quotes`

| Column | Purpose |
| --- | --- |
| `pricing_quote_id` | Quote identifier. |
| `restaurant_id` | Restaurant being quoted. |
| `pricing_version_id` | Pricing version used. |
| `input` | Original quote input. |
| `line_items` | Final quoted line items. |
| `discounts` | Applied discounts. |
| `subtotal` | Pre-tax total. |
| `tax` | Tax placeholder. |
| `total` | Final total. |
| `currency` | Quote currency. |
| `reason_codes` | Why the quote resolved this way. |
| `warnings` | Non-blocking issues or mismatches. |
| `created_at` | Quote timestamp. |
| `approved_by` | Approval actor for custom overrides, if any. |

## Pricing Integrity Rules

- Checkout must use a pricing quote, not scattered constants.
- Marketing/pricing pages must reference the same pricing source or be checked against it.
- Stripe Price IDs must map to internal pricing plans/add-ons.
- Custom discounts require approval.
- Quotes must preserve the pricing version used at the time.
- Never silently change existing customer pricing without an explicit migration or grandfathering decision.
- Checkout, admin, and billing views should display values derived from the same quote or pricing source.
- Any mismatch between Stripe, SaanaOS pricing config, and public pricing copy should be treated as a review issue.

## Closed Loop Pricing and Payment Flow

Pricing and payment should work as a closed operational loop:

1. Read pricing rules.
2. Generate quote.
3. Validate quote against plan, add-ons, discounts, effective dates, and overrides.
4. Detect conflicts, missing rules, stale pricing copy, or provider mismatch.
5. If standard pricing is valid, approve automatically.
6. If custom discount, free pilot, grandfathered pricing, or sales override is involved, request owner approval.
7. If approved, record approval decision and lock pricing version.
8. If rejected, return standard quote or revised offer.
9. Apply final quote to checkout/billing.
10. Create provider checkout/payment/subscription object.
11. Verify provider amount, currency, line items, and metadata match the quote.
12. Confirm payment through trusted webhook, not only success page redirect.
13. Update order, billing, subscription, invoice, or restaurant state.
14. Reconcile quote total vs provider charge vs internal billing record.
15. If mismatch is found, classify severity and block/flag billing state.
16. Apply smallest safe fix or require Payment Review.
17. Rerun affected checks.
18. Record operational learning only when useful.

Rules:

- No checkout or invoice should be finalized without a versioned quote.
- No custom pricing should be applied without recorded approval.
- No provider amount mismatch should be ignored.
- Pricing changes must not be scattered across checkout, admin, marketing, and billing code.
- Provider confirmation must be the trusted source for payment completion.

## Transaction State Model

Pricing and payment flows must track transaction state explicitly. A transaction should not be treated as complete just because checkout was started, a success page loaded, or a provider object was created.

Draft states:

- `QUOTE_DRAFT`: quote is being prepared.
- `QUOTE_PENDING_APPROVAL`: custom pricing, discount, free pilot, or override needs owner approval.
- `QUOTE_APPROVED`: quote is approved and pricing version is locked.
- `CHECKOUT_CREATED`: checkout/payment/subscription object created with provider.
- `PAYMENT_INITIATED`: customer has started payment.
- `PAYMENT_PENDING`: provider has not confirmed final payment outcome yet.
- `PAYMENT_CONFIRMED`: trusted provider webhook confirms payment.
- `PAYMENT_FAILED`: provider reports payment failure or cancellation.
- `PAYMENT_MISMATCH`: provider amount, currency, metadata, or line items do not match the versioned quote.
- `ORDER_OR_BILLING_UPDATED`: SaanaOS order, invoice, subscription, or restaurant billing state updated.
- `RECONCILED`: quote, provider charge, and internal billing record match.
- `ROLLED_BACK`: transaction was safely reversed, disabled, or manually corrected.

Rules:

- Do not mark payment complete from browser redirect alone.
- Do not activate billing/order state before trusted provider confirmation.
- Do not ignore mismatches between quote, provider charge, and internal billing record.
- Every final transaction should be traceable to quote version, provider event, and reconciliation record.

## Platform Payment Responsibility Model

SaanaOS is not the payment processor. Stripe is the payment processor/payment infrastructure provider.

SaanaOS may still be responsible for orchestrating payment-related workflows through Stripe Connect, including connected account onboarding, checkout creation, application/platform fees, transfers, refunds, disputes, support triage, and reconciliation.

Roles:

- Customer: payer.
- Restaurant: merchant/connected account.
- Stripe: payment processor and payment infrastructure provider.
- SaanaOS: software platform and payment-flow orchestrator.

Review each payment flow by charge type:

- Direct charge.
- Destination charge.
- Separate charge and transfer.
- Application fee.
- Platform markup.
- Refund.
- Dispute/chargeback.
- Payout/transfer.

For every transaction, preserve:

- Customer amount charged.
- Restaurant gross amount.
- Stripe processing fee.
- SaanaOS platform fee or markup.
- Restaurant net amount.
- Transfer status.
- Payout status if available.
- Refund status.
- Dispute status.
- Responsible party for negative balance or loss.
- Connected account ID.
- Stripe charge/payment intent/session ID.
- Application fee ID if applicable.
- Transfer ID if applicable.

Rules:

- Do not describe SaanaOS as the payment processor.
- Do not hide platform fees or markups internally.
- Do not mix SaanaOS subscription billing with restaurant customer payments unless intentionally modeled.
- Do not release funds or mark payout-related state without trusted provider confirmation.
- Disputes, refunds, chargebacks, and failed async payments must have clear ownership and reconciliation path.
- Payment support issues may come to SaanaOS even when Stripe is the processor, so admin views should show enough trace data to investigate.

## Financial Event Ledger

Pricing and payment workflows should preserve an immutable event trail. State fields show the current status, but events explain how the transaction reached that status.

Example events:

- `QUOTE_CREATED`
- `QUOTE_VALIDATED`
- `QUOTE_APPROVAL_REQUESTED`
- `QUOTE_APPROVED`
- `QUOTE_REJECTED`
- `CHECKOUT_CREATED`
- `PAYMENT_INITIATED`
- `PAYMENT_CONFIRMED`
- `PAYMENT_FAILED`
- `PAYMENT_MISMATCH_DETECTED`
- `ORDER_OR_BILLING_UPDATED`
- `TRANSFER_CREATED`
- `REFUND_CREATED`
- `DISPUTE_OPENED`
- `RECONCILED`
- `ROLLED_BACK`

Each event should preserve:

- Event ID.
- Event type.
- Transaction ID.
- Restaurant ID.
- Customer/order/billing reference.
- Pricing quote ID/version.
- Provider object IDs.
- Amount/currency.
- Previous state.
- Next state.
- Source system.
- Created at.
- Metadata.

Rules:

- Do not overwrite history.
- State changes should create events.
- Events should support reconciliation, support investigation, retries, disputes, and incident review.
- Events should avoid storing raw card/payment-sensitive data.

## Pricing Agent Future

The Pricing Agent can:

- Suggest a plan.
- Apply an approved promo.
- Explain a quote.
- Flag a price mismatch.
- Detect stale pricing copy.
- Prepare a sales offer.

The Pricing Agent cannot, without approval:

- Invent pricing.
- Approve discounts.
- Change Stripe prices.
- Change customer billing.

## API Future

Possible future AuthToolkit endpoints:

- `POST /v1/pricing/quote`
- `POST /v1/pricing/validate`
- `GET /v1/pricing/plans`
- `POST /v1/pricing/approve-override`

These endpoints should remain optional until SaanaOS has a working internal pricing configuration and quote function.

## Rollout Plan

1. Phase 1: docs only.
2. Phase 2: add pricing config.
3. Phase 3: add quote function.
4. Phase 4: checkout uses quote function.
5. Phase 5: admin pricing page.
6. Phase 6: Stripe mapping.
7. Phase 7: AuthToolkit API.

## Open Questions

- Which plans are official now?
- Is virtual phone required or optional?
- Which setup fees can be waived for pilots?
- Should website hosting be separate or bundled?
- How do we handle existing customers?
