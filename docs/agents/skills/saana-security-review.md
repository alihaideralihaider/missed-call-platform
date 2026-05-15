# saana-security-review

Purpose: review public-facing risks.

Use this for public routes, APIs, auth, webhooks, admin areas, customer/order data, Supabase access, provider integrations, and logging changes.

## Checklist

- Exposed env vars: confirm no server secrets are moved into client code or logs.
- Public API abuse: check auth, authorization, idempotency, validation, and rate-limit expectations.
- Supabase RLS: confirm reads/writes are protected by policies or server-only privileged paths.
- Webhook signature validation: confirm provider webhooks verify signatures or clearly document local-only placeholders.
- Auth bypass: check login, session, admin, platform, and restaurant boundary enforcement.
- Unsafe redirects: validate redirect destinations and avoid user-controlled open redirects.
- Customer/order data leaks: check route access, query filters, response payloads, and rendered data.
- Admin route protection: verify admin pages and APIs require the intended role or server-side guard.
- Rate limiting: identify endpoints that need throttling, replay protection, or abuse controls.
- Sensitive logging: avoid logging secrets, phone numbers, full payloads, payment details, or customer data unless redacted.

## Security Failure Rules

If the security review detects a vulnerability, unsafe pattern, missing protection, or elevated-risk behavior:

1. Classify severity:

- Critical: exposed secrets, auth bypass, RLS bypass, arbitrary admin access, payment/webhook trust failure, customer/order data exposure, or remote code execution risk.
- High: unsafe redirects, weak authorization boundary, missing webhook validation, replay vulnerability, missing rate limiting on sensitive routes, or excessive sensitive logging.
- Medium: incomplete validation, weak abuse controls, overbroad API responses, insufficient auditability, or local-only placeholder protections still active.
- Low: non-sensitive logging cleanup, defense-in-depth improvements, or hardening recommendations.

2. Required action:

For Critical issues:

- Stop deploy and commit immediately.
- Block production release until fixed and re-reviewed.
- Rotate secrets if exposure is possible.
- Review logs/history if customer or payment data may have leaked.
- Create an incident note if there is real operational learning.

For High issues:

- Require the smallest safe fix before deploy.
- Rerun Security Review after fix.
- Rerun Browser QA if auth/admin/customer routes changed.
- Rerun Payment Review if webhook/payment/billing logic changed.
- Rerun SMS Compliance Review if messaging/customer-contact systems changed.

For Medium issues:

- Fix immediately if low-risk and narrow.
- Otherwise document remaining risk and follow-up.

For Low issues:

- Record for hardening backlog.

3. Before closure:

- Confirm the vulnerability was retested after the fix.
- Confirm no new exposure was introduced.
- Confirm affected routes, APIs, and role boundaries were rechecked.
- Record remaining risk if intentionally deferred.
- Record any new guardrail or review improvement added because of the finding.

## Output

List findings by severity with file references, then note residual risks or checks not run.
