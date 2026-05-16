# AuthToolkit Dev Integrity Learning Loop & Privacy Policy

## Purpose

Document how AuthToolkit Dev Integrity can improve the system over time without collecting customer source code, raw diffs, secrets, logs, customer data, payment data, session data, or private records.

## Core Principle

No customer code collection for system improvement. Period.

AuthToolkit Dev Integrity improves from privacy-safe operational metadata, not from customer source code.

Trust language:

"Your code stays yours. AuthToolkit Dev Integrity does not use customer source code, raw diffs, secrets, logs, or customer data to improve the system."

## What We Do Not Collect for Product Improvement

AuthToolkit Dev Integrity must not collect or use the following for product improvement:

- customer source code
- raw diffs
- full file contents
- secrets
- environment variable values
- API keys
- tokens
- session data
- cookies
- private logs
- database rows
- customer/buyer records
- payment data
- SMS/email/WhatsApp message contents
- private screenshots
- uploaded files
- proprietary business documents

The integrity system can inspect locally or inside the customer-approved environment to produce findings, but product improvement should not rely on copying or training on customer code or private data.

## What We May Collect for System Improvement

Only privacy-safe operational metadata:

- selected profile
- detected stack category
- enabled review packs
- finding category
- severity
- confidence before/after
- confidence delta
- finding outcome: fixed, waived, false positive, accepted risk
- rule/check that triggered the finding
- checks rerun
- whether recommendation was marked useful
- whether a review pack was enabled/disabled
- high-level capability flags:
  - auth enabled
  - payments enabled
  - webhooks enabled
  - SMS/WhatsApp enabled
  - multi-tenant enabled
  - admin dashboard enabled
  - file uploads enabled

Example allowed metadata:

```json
{
  "profile": "restaurant-tech",
  "stack": ["nextjs", "supabase", "stripe"],
  "review_pack": "tenant-boundary",
  "finding_category": "admin_api_tenant_guard_missing",
  "severity": "Critical",
  "confidence_before": 0.42,
  "confidence_after": 0.88,
  "outcome": "fixed",
  "user_feedback": "useful"
}
```

## File Paths and Identifiers

File paths can be sensitive.

Default improvement metadata should prefer generalized categories over raw paths.

Example:

Instead of:

`worker/web/app/api/admin/restaurants/[slug]/orders/route.ts`

Use:

`tenant_scoped_admin_api_route`

If file paths are included in evidence for the customer dashboard, they should remain project-scoped and not be used for global product improvement unless explicitly allowed.

## Learning Loop

AuthToolkit Dev Integrity may improve from aggregate patterns such as:

- Restaurant-tech projects often need tenant-boundary review.
- Stripe webhook changes often need idempotency checks.
- Agency lead forms often miss consent language.
- Supabase service-role usage often needs server-only checks.
- SMS/WhatsApp workflows often need consent and opt-out checks.

These patterns should improve:

- review pack defaults
- profile builder questions
- confidence scoring
- deterministic checks
- dashboard explanations
- documentation
- safe autofix policy

## Local-First Default

For CLI/local usage:

- Review runs should work locally.
- Code and raw diffs should stay local.
- Evidence should stay local unless the user enables sync or hosted dashboard features.
- Generated files like `project-map.json` and review evidence should not be uploaded by default.

## Hosted Dashboard / API Mode

If a customer uses hosted dashboard/API features:

- Upload only the data needed to power the dashboard or API.
- Keep customer project data isolated by organization/project.
- Do not use uploaded customer evidence, source snippets, raw diffs, logs, or private records for global product improvement unless explicitly permitted.
- Provide clear settings for what is synced.

## Consent and Controls

Customers should have controls for:

- local-only mode
- evidence sync on/off
- telemetry on/off
- product improvement metadata on/off
- deleting project data
- exporting evidence
- disabling specific review packs
- choosing whether file paths are shown or generalized

## Data Minimization Rules

- Collect the least data needed.
- Prefer categories over raw identifiers.
- Prefer counts over contents.
- Prefer outcomes over artifacts.
- Never collect secret values.
- Never collect raw customer records.
- Never collect message/payment/session contents.
- Never collect code for improvement.

## Retention

Suggested policy:

- Local CLI evidence remains local unless user syncs.
- Hosted dashboard evidence retention should be configurable.
- Operational improvement metadata should be aggregated and retention-limited.
- Deleted projects should remove associated project evidence from hosted systems according to customer settings.

## Security Controls

For hosted mode:

- encrypt data in transit
- encrypt sensitive stored evidence at rest
- restrict staff access
- log access to customer project evidence
- separate customer/project data from aggregate learning metadata
- redact sensitive fields before storage where possible

## Product Improvement Examples

Allowed:

- "Tenant-boundary findings are common in restaurant-tech projects, so enable that review pack by default."
- "Webhook signature findings are often High severity, so reduce confidence when webhook files change."
- "Users frequently mark SMS consent findings as useful, so improve the SMS review pack."

Not allowed:

- "Train on this customer's source code."
- "Store this customer's raw diff to improve future suggestions."
- "Use private logs, message contents, payment data, or session data for model improvement."

## Public Trust Statement

"AuthToolkit Dev Integrity is designed to improve from review outcomes, not from your private code. Your source code, raw diffs, secrets, logs, customer data, payment data, and session data are not used to improve the system."

## Open Questions

- Should hosted evidence sync be opt-in or enabled only for dashboard customers?
- Should file paths be stored by default in hosted mode or generalized?
- How long should hosted evidence be retained?
- Should customers be able to opt into sharing sanitized snippets for support cases only?
- What telemetry should be disabled in regulated industries?
