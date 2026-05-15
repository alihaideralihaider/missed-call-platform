# saana-guard

Purpose: block risky behavior before implementation.

Use this before editing when a task touches production behavior, data, auth, messaging, payments, deployment, or a broad refactor.

## Guardrails

- Do not expose secrets, tokens, credentials, private URLs, customer data, or order data.
- Do not edit outside intended paths without explaining why the additional path is necessary.
- Do not make destructive database changes without explicit approval.
- Do not deploy production without build/test review and a rollback path.
- Do not change SMS, consent, Twilio, IVR, or payment logic without the required special review.
- Do not bypass auth, Supabase RLS, admin checks, webhook verification, or other security controls.
- Do not perform large refactors unless the user explicitly requested them.
- Do not change app behavior while doing documentation or workflow scaffolding work.

## When a guardrail is triggered

If a guardrail violation or elevated-risk change is detected, use this sequence:

Detect -> classify -> stop/proceed -> escalate -> fix -> re-review -> continue.

1. Stop implementation before deploy or commit.

2. Classify severity:

- Critical: secrets exposure, auth bypass, RLS bypass, payment corruption, unsafe webhook handling, or destructive DB operations.
- High: messaging consent risk, checkout/order flow breakage, admin access risk, or production deployment uncertainty.
- Medium: unexpected scope expansion, large refactor risk, or missing rollback plan.
- Low: documentation or process inconsistency.

3. Take the required action:

- Critical: block commit/deploy until fixed and re-reviewed.
- High: require the relevant review skill and explicit acknowledgment before proceeding.
- Medium: document the risk and narrow implementation scope.
- Low: record for cleanup or follow-up.

4. Run required re-reviews after fixes:

- Security Review if auth, APIs, customer data, admin protection, secrets, RLS, or webhooks changed.
- SMS Compliance Review if messaging, consent, IVR, STOP/HELP, Twilio, or A2P behavior changed.
- Payment Review if Stripe, billing, checkout, payment state, pricing, reconciliation, or payment webhooks changed.
- Browser QA if routes, UI, forms, checkout, or customer/admin flows changed.

5. Before continuing:

- Summarize the issue.
- Summarize the fix.
- Summarize remaining risks.
- Rerun affected checks.
- Show the final diff before commit.

## Output

State any blocked action, approval needed, or special review required before implementation continues.
