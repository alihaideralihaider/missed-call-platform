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

## Output

List findings by severity with file references, then note residual risks or checks not run.
