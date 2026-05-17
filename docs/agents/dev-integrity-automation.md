# AuthToolkit Dev Integrity Automation

## Purpose

Automate closed-loop agent reviews so code changes are reviewed by agents, issues are classified, safe fixes are applied automatically, affected checks are rerun, and unresolved risks block commit/merge/deploy.

## Core Loop

1. Detect git changes or PR diff.
2. Map changed files to required skills.
3. Read `AGENTS.md` and selected skill files.
4. Run agent review for selected skills.
5. Classify findings: Critical, High, Medium, Low.
6. Determine action:
   - Low: agent may auto-fix if safe and scoped.
   - Medium: agent may auto-fix if reversible, narrow, and covered by tests/checks.
   - High: agent should propose fix and may apply only if clearly safe; otherwise block and escalate.
   - Critical: block commit/merge/deploy; no automatic risky fix.
7. Apply smallest safe fix when allowed.
8. Rerun affected checks.
9. Repeat review loop until clean or blocked.
10. Write review evidence.
11. Commit/update PR only when checks pass and no unresolved blocker remains.

## Skill Routing

Map changed paths to skills:

- `auth`/`login`/`admin`/`api`/`supabase`/`webhooks` -> security.
- `twilio`/`sms`/`consent`/`ivr`/`messaging` -> SMS compliance.
- `stripe`/`billing`/`checkout`/`payment`/`pricing` -> payment.
- `app/r`/`hub`/`cart`/`menu`/`orders`/`kitchen`/`admin` UI -> restaurant UX.
- UI/routes/forms/pages -> browser QA.
- `wrangler`/`cloudflare`/`env`/`deploy` -> post-deploy canary.
- secrets/env/provider credentials -> vault integrity.
- runtime bindings/provider targets/deploy wiring -> runtime binding review.
- bootstrap/deploy/recovery/vault process -> vault recovery.
- All changes -> plan + guard.

## Vault Conditional Reviews

Trigger `vault-integrity-review` when:

- adding env vars
- renaming env vars
- touching auth, payment, messaging, or webhook code
- changing CI/CD secrets
- changing Cloudflare bindings
- changing Supabase service-role usage
- changing Stripe, Twilio, Resend, Meta/WhatsApp, Google, OAuth, or GitHub credentials

Trigger `runtime-binding-review` when:

- changing wrangler config
- changing OpenNext or Cloudflare deployment
- adding service bindings
- adding queue, R2, D1, KV, bucket, or Durable Object bindings
- changing worker names or routes
- changing webhook URLs
- changing provider callback targets

Trigger `vault-recovery-review` when:

- setting up a new machine
- changing deployment workflow
- changing required local envs
- changing password manager or vault process
- onboarding contractors or new developers
- changing emergency access or recovery ownership

## Auto-Fix Policy

Agent can auto-fix:

- Obvious TypeScript/lint issue in touched files.
- Raw error leak changed to generic client error.
- Missing validation on scoped route if clear.
- Copy/label issue in touched UI.
- Narrow checklist/doc correction.

Agent must not auto-fix without approval:

- Destructive database changes.
- Auth model redesign.
- Payment state machine rewrite.
- Stripe live configuration.
- Twilio/A2P campaign behavior change.
- Secrets rotation.
- Secret inventory, recovery process, or runtime binding changes that require owner confirmation.
- Production deploy.
- Broad refactor.
- Pricing or billing policy change.

## Evidence File

Each automated run should write:

`docs/reviews/YYYY-MM-DD-dev-integrity-review.md`

Include:

- Changed files.
- Selected skills.
- Findings by severity.
- Fixes applied.
- Checks rerun.
- Remaining risks.
- Blocked actions.
- Final status.

## Future GitHub Workflow

Future GitHub Action:

- On `pull_request`.
- Run integrity review script.
- Comment review summary.
- Push auto-fix commit when safe.
- Fail check if Critical/High unresolved.
- Require human approval only for blocked/high-risk cases.

## Future AuthToolkit API

Possible endpoints:

- `POST /v1/dev-integrity/reviews`
- `POST /v1/dev-integrity/fixes`
- `POST /v1/dev-integrity/evidence`
- `GET /v1/dev-integrity/runs/:id`

## Principle

The agent is not just a reviewer. It is a closed-loop operator:

detect -> classify -> fix when safe -> verify -> record -> block when unsafe.
