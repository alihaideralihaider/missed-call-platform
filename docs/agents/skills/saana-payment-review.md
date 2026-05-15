# saana-payment-review

Purpose: review Stripe, billing, checkout, and payment-sensitive changes.

Use this for payment links, Stripe webhooks, checkout totals, billing plans, invoices, pricing, refunds, reconciliation, and payment-state changes.

## Checklist

- Payment amounts, taxes, tips, discounts, modifiers, and totals are calculated consistently.
- Payment state transitions are idempotent and handle retries.
- Stripe webhook handling verifies signatures and tolerates duplicate events.
- Checkout failure, cancellation, pending, and success states are visible and recoverable.
- Reconciliation data is preserved for orders, customers, restaurants, and billing records.
- PCI-sensitive boundaries are respected; card data is never handled directly.
- Pricing and plan changes are reflected in user-facing copy and billing records.
- Rollback does not orphan paid orders, invoices, subscriptions, or webhook state.

## Output

List payment risks, required tests, webhook/idempotency checks, and any manual reconciliation concerns.
