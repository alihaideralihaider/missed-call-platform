# Saana Agent Skills

These skills are practical review and planning checklists for future AI coding-agent sessions. They do not create automation or replace judgment.

Use them with the repository workflow in `AGENTS.md`:

Plan -> Git History Review -> Implement -> Test -> Code Review -> Security Review -> Commit

## Skills

- `saana-plan`: use before feature work or behavior changes to define scope, likely files, risks, rollout, rollback, and tests.
- `saana-guard`: use before implementation when a task could touch secrets, data, auth, SMS, payments, deployments, or large refactors.
- `saana-security-review`: use for public routes, APIs, auth, webhooks, admin areas, Supabase access, logging, and customer/order data.
- `saana-sms-compliance-review`: use for messaging, consent, Twilio, missed-call, IVR, STOP/HELP, opt-in, or campaign-related changes.
- `saana-restaurant-ux-review`: use for storefront, admin, kitchen, customer, QR, checkout, order, pickup, and missed-call order flows.
- `saana-payment-review`: use for Stripe, billing, checkout, payment links, invoices, reconciliation, pricing, and payment webhooks.
- `saana-browser-qa`: use when UI, routing, forms, auth paths, QR/hub pages, checkout, or admin browser behavior changes.
- `saana-post-deploy-canary`: use after a production deploy to verify public health, Worker status, logs, routes, webhooks, and rollback notes.
- `saana-incident-capture`: use after Critical or High severity operational incidents only when there is real operational learning to capture.

## Conditional Reviews

- Messaging, consent, Twilio, or IVR changes require `saana-sms-compliance-review`.
- Storefront, admin, kitchen, customer, QR, checkout, or order-flow changes require `saana-restaurant-ux-review`.
- Stripe, billing, checkout, pricing, or payment changes require `saana-payment-review`.
- UI or route behavior changes require `saana-browser-qa`.
- Production deploys require `saana-post-deploy-canary` after deployment.
- Critical or High severity incidents should use `saana-incident-capture` only when there is real operational learning.
