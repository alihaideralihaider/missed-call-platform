# saana-plan

Purpose: plan feature work before coding.

Use this before implementation for any feature, route, schema, provider, workflow, or user-facing behavior change.

## Checklist

- Scope: state the exact behavior to add, change, or preserve.
- Files likely to change: list expected app, API, docs, migration, and test files.
- DB impact: identify schema, migration, backfill, RLS, index, and data-retention effects.
- API impact: identify route contracts, request/response changes, webhooks, status codes, and idempotency needs.
- UI impact: identify affected storefront, admin, kitchen, customer, loading, error, and empty states.
- Messaging/SMS impact: identify Twilio, consent, STOP/HELP, IVR, and message template effects.
- Payment impact: identify Stripe, checkout, billing, payment links, pricing, and reconciliation effects.
- Security risk: identify auth, RLS, secrets, abuse, data exposure, logging, and rate-limit risks.
- Rollout plan: describe how the change can be released and verified.
- Rollback plan: describe how to disable or revert the change if it fails.
- Tests: list the narrowest meaningful checks first, then broader checks if risk warrants them.

## Output

Write a short plan with assumptions, affected paths, review skills needed, and the exact checks that will be run.
