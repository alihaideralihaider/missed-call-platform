# Vault Integrity Review

## Purpose

Review whether secrets, env vars, webhook secrets, provider credentials, and runtime-only keys are inventoried, protected, and recoverable without storing raw values in Git.

## When To Run

Run this skill when:

- adding env vars
- renaming env vars
- touching auth, payment, messaging, webhook, or provider code
- changing CI/CD secrets
- changing Cloudflare secrets or bindings
- changing Supabase service-role usage
- changing Stripe, Twilio, Resend, Meta/WhatsApp, Google, GitHub, or OAuth credentials

## Inputs

- git diff
- secret inventory or project-specific inventory
- env var names referenced by changed files
- provider names and affected environments
- Cloudflare, GitHub, Supabase, Stripe, Twilio, Resend, Meta/WhatsApp, Google, or OAuth configuration notes

Do not request or store raw secret values.

## Checks

- inventory includes required secret names, purpose, source of truth, consumers, rotation cadence, and recovery notes
- new or renamed env vars are documented
- stale rotation dates are identified
- raw `.env` files or secret values are not committed
- docs, issues, PRs, screenshots, and evidence do not expose secrets
- webhook signing secrets are documented where webhook routes exist
- service-role keys are server-only
- client-public env vars do not look secret-like
- optional provider secrets are clearly separated from production-required secrets
- missing values fail at runtime with clear errors instead of build-time crashes when possible

## Findings Format

Use this format:

- Severity: Critical, High, Medium, Low
- Area: Vault Integrity
- Secret name or category: name only, never value
- Evidence: file path, inventory row, or provider category
- Risk: practical impact
- Required action: smallest safe fix

## Pass Examples

- `SUPABASE_SERVICE_ROLE_KEY` is documented as server-only, consumed only by server runtime helpers, and stored in the approved vault/provider secret store.
- A new Stripe webhook secret is listed by name, purpose, source of truth, runtime consumer, and rotation cadence.
- A missing optional Resend key produces a clear runtime error only when email is requested.

## Fail Examples

- A raw API key appears in Git, docs, logs, screenshots, or review evidence.
- A `NEXT_PUBLIC_*` env var name looks like a secret or token.
- A webhook route exists with no documented signing secret.
- A service-role key is used from client-exposed code.

## Follow-Up Actions

- Remove any exposed secret from active files and rotate it at the source system.
- Update the secret inventory without adding values.
- Add or correct server-only runtime boundaries.
- Rerun security review for auth, APIs, customer data, service-role usage, or webhooks.
- Record remaining risk if a provider secret is optional or intentionally absent.
