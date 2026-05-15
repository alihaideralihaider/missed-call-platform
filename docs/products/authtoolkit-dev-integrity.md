# AuthToolkit Dev Integrity

Closed-loop integrity checks for AI-assisted development before code reaches production.

Core thesis: AI can write code fast. AuthToolkit Dev Integrity verifies whether that code is safe to ship.

## Problem

AI coding tools help founders and agencies ship faster, but they also create new risks:

- auth bypass
- tenant-boundary mistakes
- exposed secrets
- unsafe service-role usage
- weak webhook verification
- payment state bugs
- SMS/consent compliance mistakes
- deployment regressions
- unreviewed generated code
- no evidence trail for what was reviewed

## Target Customers

Initial target customers:

- founders building SaaS with AI coding tools
- agencies building client apps with Cursor/Codex/Claude
- small dev teams without dedicated security review
- vertical SaaS builders handling auth, payments, messaging, or tenant data
- no-code/light-code operators shipping production apps

## Product Promise

AuthToolkit Dev Integrity acts as a trust layer around AI-generated or AI-assisted code.

It does not promise perfect security. It provides review gates, deterministic checks, confidence scoring, evidence, and closed-loop remediation workflows that reduce production risk.

## Core Loop

detect git/PR changes
-> route to required review skills
-> run deterministic checks
-> optionally run AI review
-> classify findings
-> safely auto-fix when allowed
-> block unsafe changes
-> rerun checks
-> write evidence
-> allow merge/deploy only when clean or explicitly waived

## Review Packs

Start with these review packs:

### 1. Auth & Tenant Boundary Review

Checks:

- login/session behavior
- user-to-account mapping
- tenant isolation
- slug-only authorization risk
- service-role access
- admin API protection

### 2. Secrets & Environment Review

Checks:

- exposed env vars
- NEXT_PUBLIC secret-like names
- unsafe logging
- provider key leaks
- local placeholder leakage

### 3. Payments & Webhooks Review

Checks:

- Stripe webhook trust
- idempotency
- payment state transitions
- pricing source of truth
- provider amount mismatch
- reconciliation paths

### 4. SMS & Consent Review

Checks:

- STOP/HELP
- opt-in not preselected
- transactional vs marketing separation
- A2P campaign consistency
- provider failure handling

### 5. Browser/Route QA Review

Checks:

- affected routes
- login/admin/customer pages
- checkout flows
- mobile usability
- route regressions

### 6. Deployment Canary Review

Checks:

- production route health
- Cloudflare Worker status
- login/admin/order route smoke checks
- rollback readiness

## MVP Product Forms

### 1. Local CLI

Command:

```sh
npx authtoolkit-integrity review
```

Purpose:
Developer runs locally before commit.

Features:

- git diff analysis
- skill routing
- deterministic checks
- confidence scoring
- evidence generation
- exit-code gating

### 2. GitHub App

Purpose:
Review pull requests automatically.

Flow:

- PR opened
- changed files detected
- review packs selected
- findings posted as PR comment
- Critical/High findings block merge
- safe autofix commits may be proposed later

### 3. Hosted API

Purpose:
Infrastructure layer for teams and other agent systems.

Possible endpoints:

- POST /v1/dev-integrity/reviews
- POST /v1/dev-integrity/findings
- POST /v1/dev-integrity/evidence
- POST /v1/dev-integrity/fixes
- GET /v1/dev-integrity/runs/:id

## Auto-Fix Policy

Allowed:

- simple lint/type fixes
- generic client-safe error instead of raw error.message
- narrow validation fixes
- safe copy/label fixes
- docs/checklist corrections

Blocked without approval:

- auth model redesign
- tenant-boundary redesign
- destructive database changes
- payment state machine rewrite
- Stripe live configuration
- Twilio/A2P campaign behavior changes
- secrets rotation
- production deploy
- broad refactors
- pricing or billing policy changes

## Confidence Scoring

Confidence determines whether an agent may auto-fix, propose a fix, or block.

- 0.90 - 1.00: safe auto-fix candidate
- 0.70 - 0.89: propose fix/review before applying
- 0.40 - 0.69: block auto-fix
- below 0.40: block and escalate

Confidence decreases for:

- auth/session/tenant changes
- payment/pricing changes
- SMS/compliance changes
- Supabase service-role/RLS changes
- deployment/env/secrets changes
- broad refactors
- weak test coverage

## Evidence

Each review run should preserve:

- changed files
- selected review packs
- routing reasons
- confidence score
- findings by severity
- fixes applied
- checks rerun
- remaining risks
- final status

Evidence is useful for:

- PR review
- audit trail
- incident review
- customer trust
- agency client reporting
- future model/rule improvement

## Pricing

Possible early pricing:

- Free: local CLI, basic deterministic checks
- Pro: $29-$99/month, GitHub PR reviews, evidence, more rules
- Agency: $199-$499/month, multiple repos, client reports, custom packs
- API: usage-based per review run, PR, or repo

## Differentiation

Most AI coding tools help write code. AuthToolkit Dev Integrity checks whether the code is safe to ship.

This is not another coding assistant. It is a closed-loop safety and evidence layer for AI-assisted development.

## Roadmap

Phase 1:
SaanaOS internal Dev Integrity system.

Phase 2:
Reusable local CLI.

Phase 3:
Config file:
authtoolkit.integrity.json

Phase 4:
GitHub App PR reviews.

Phase 5:
Hosted AuthToolkit API.

Phase 6:
Safe autofix for Low/Medium issues.

Phase 7:
Custom review packs for agencies and vertical SaaS teams.

## Open Questions

- Should CLI be open-source, paid, or freemium?
- Should evidence be committed, uploaded, or local only?
- Should GitHub App launch before hosted API?
- Which review pack is the wedge: tenant-boundary, payments, or AI-generated code safety?
- How much autofix should be allowed in v1?
- What claims should be avoided for legal/liability reasons?
