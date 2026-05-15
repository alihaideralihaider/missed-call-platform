# saana-payment-review

Purpose: review Stripe, billing, checkout, and payment-sensitive changes.

Use this for payment links, Stripe webhooks, checkout totals, billing plans, invoices, pricing, refunds, reconciliation, and payment-state changes.

## Checklist

- Payment methods are reviewed for supported and intentionally unsupported options.
- Payment amounts, taxes, tips, discounts, modifiers, and totals are calculated consistently.
- Pricing source of truth is clear for menu prices, fees, discounts, billing plans, and overrides.
- Checkout calculation matches the pricing source of truth before provider execution.
- Provider execution creates the intended payment, invoice, checkout session, payment link, or subscription.
- Payment state transitions are idempotent and handle retries.
- Stripe webhook handling verifies signatures and tolerates duplicate events.
- Webhook confirmation updates order or billing state only after trusted provider confirmation.
- Checkout failure, cancellation, pending, and success states are visible and recoverable.
- Order and billing state remain consistent across checkout, webhook, admin, and customer views.
- Reconciliation data is preserved for orders, customers, restaurants, and billing records.
- PCI-sensitive boundaries are respected; card data is never handled directly.
- Pricing and plan changes are reflected in user-facing copy and billing records.
- Rollback does not orphan paid orders, invoices, subscriptions, or webhook state.
- Fixes are reviewed, retested, and checked against checkout, webhook, state, and reconciliation paths.

## Payment Method Coverage

Review supported and intentionally unsupported payment methods:

- Cards: credit/debit card.
- Wallets: Apple Pay, Google Pay, Link, PayPal, and Amazon Pay where supported.
- Bank payments: ACH debit or bank transfer where appropriate.
- Buy now, pay later: Affirm, Klarna, and Afterpay/Clearpay where appropriate.
- Provider-specific availability: confirm country, currency, business type, and Stripe account support.
- Fallback strategy: document what happens if a desired payment method is unavailable.
- Dashboard configuration: confirm payment methods are enabled in Stripe Dashboard where required.
- UI visibility: confirm customers see only valid payment methods for their context.

## Payment System Loop

Review the full payment path:

1. Payment methods.
2. Pricing source of truth.
3. Checkout calculation.
4. Provider execution.
5. Webhook confirmation.
6. Order/billing state.
7. Reconciliation.
8. Failure/rollback.
9. Review, fix, and retest.

## Payment Recovery and Exception Handling

Successful payments are not the only test. Review how broken or uncertain payments are handled safely:

- Customer charged but order missing: define the reconciliation and recovery path, preserve the provider payment ID, create or repair the order from trusted payment metadata if safe, flag for manual review if order reconstruction is incomplete, and never charge again automatically.
- Duplicate webhook: ensure idempotent state handling, ignore already-processed provider event IDs, and do not duplicate orders, messages, invoices, usage records, or state transitions.
- Checkout success page without webhook confirmation: do not finalize trusted payment state from the browser return alone; wait for provider/webhook confirmation or mark the state pending until reconciled.
- Delayed payment methods (ACH/BNPL): preserve pending state handling, separate authorization/initiation from settlement, and define when fulfillment, cancellation, or manual review is allowed.
- Provider timeout: check provider state before retrying, use idempotency keys for retried provider calls, and show the customer a recoverable pending/error state instead of creating a second payment.
- Browser interruption or timeout: allow recovery through webhook reconciliation, let the customer or admin recover the order by provider/session ID, and avoid assuming abandoned checkout means failed payment.
- Provider outage: define retry, fallback, customer messaging, admin visibility, and operational recovery expectations before attempting repeated payment side effects.
- Payment pending: keep order/billing state pending, avoid fulfillment or final confirmation until provider confirmation arrives, and make pending status visible to customer/admin where relevant.
- Wallet unavailable: hide unavailable wallet options, fall back to valid payment methods for the customer context, and avoid blocking checkout if card or another supported method remains available.
- Retry after partial failure: retry only the failed step, preserve prior successful provider/order state, use idempotency keys, and reconcile before retrying side effects like messages, order creation, or billing updates.
- Refund and rollback flows: preserve reconciliation integrity across orders and billing records, keep provider refund IDs linked, and avoid hiding the original payment trail.

## Output

List payment risks, method availability assumptions, pricing source of truth, required tests, webhook/idempotency checks, state/reconciliation concerns, and any fallback or rollback notes.
