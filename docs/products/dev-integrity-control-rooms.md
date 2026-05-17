# AuthToolkit Dev Integrity Control Rooms

Purpose: document the product UI vision for AuthToolkit Dev Integrity: a visual control-room layer that helps founders, agencies, and technical leaders understand software delivery risk, audit exposure, confidence, blockers, fixes, and release readiness at a glance.

Core product views:

1. Dev Control Room
2. Audit Control Room

## Core Thesis

AI-assisted development creates speed, but speed without visibility creates risk.

AuthToolkit Dev Integrity provides a control-room layer for AI-assisted development:

- what changed
- what risk was introduced
- which integrity gate caught it
- whether it was fixed
- whether confidence improved
- whether the project is safe to ship
- whether production or staging has exposure risks

## Dev Control Room

Purpose:
Show the health and progress of development work across projects, PRs, branches, commits, and review runs.

Main question:
Are our code changes safe and progressing?

Recommended layout:

- Rows: projects, PRs, commits, branches, or review runs
- Columns: integrity stages
- Cells: status per stage
- Final columns: confidence before/after, final decision, evidence

Example columns:

- Plan
- Guard
- Security
- Tenant Boundary
- API Exposure
- Payments
- SMS/WhatsApp
- Restaurant UX
- Browser QA
- Typecheck
- Build
- Deploy Canary
- Evidence
- Final Decision
- Confidence

Cell statuses:

- Passed
- Failed
- Blocked
- Warning
- Running
- Skipped
- Auto-fixed
- Needs approval
- Not applicable

Suggested colors:

- Green: passed
- Red: failed/blocker
- Yellow: warning/review needed
- Blue: running/in progress
- Gray: skipped/not applicable
- Purple: auto-fixed
- Dark/black: blocked by approval

## Confidence Before and After

Confidence before/after should be a key visual metric.

Example:

- Before fix: 0.42 blocked
- After fix: 0.82 review required
- After verification: 0.94 safe to ship

Purpose:
Show whether risk is going down as the system fixes and verifies issues.

This makes the dashboard useful to founders and leaders because they can quickly see:

- whether development is progressing
- whether the team is reducing risk
- whether blockers are being resolved
- whether a project is safe enough to release

## Dashboard Hero Metrics

Both Dev Control Room and Audit Control Room should start with large, executive-friendly confidence tiles.

### Dev Control Room Hero

Primary tiles:

- Current Confidence
- Before Fix Confidence
- After Fix Confidence
- Critical/High Blockers
- Runs Needing Approval
- Ready to Ship

Example layout:

```text
[Current Confidence: 94%]
[Before Fix: 42%]
[After Fix: 88%]
[Critical/High: 0]
[Needs Approval: 1]
[Ready to Ship: Yes]
```

Purpose:
A founder or lead should understand progress and risk within five seconds.

The most important visual is:
Before -> After confidence

Example:
0.42 blocked -> 0.88 reviewed -> 0.94 safe to ship

### Audit Control Room Hero

Primary tiles:

- Production Exposure Score
- Stage Confidence
- Production Confidence
- Critical/High Exposure Findings
- Release Readiness
- Open Alerts

Example layout:

```text
[Stage Confidence: 100%]
[Production Confidence: 98%]
[Exposure Findings: 0 Critical / 1 High]
[Release Readiness: Blocked]
[Open Alerts: 2]
```

Purpose:
A leader should instantly know whether Stage is clean enough for Production and whether Production has live exposure risk.

### Design Rules

- Confidence score should be large, bold, and visible from across a desk.
- Before/after confidence should use directional arrows.
- Green means safe/passed.
- Yellow means warning/review needed.
- Red means blocked/failed.
- Blue means in progress.
- Gray means skipped/not applicable.
- Confidence should never be shown alone; always pair it with blocker count or policy status.
- If confidence improved after fixes, show the improvement delta.
- If confidence dropped after a change, highlight it as risk introduced.

### Example Hero Copy

Dev Control Room:
"Confidence improved from 42% to 88% after tenant-boundary fixes. One Browser QA warning remains."

Audit Control Room:
"Stage confidence is 100%. Production release is ready unless policy requires resolving one medium session warning."

## Trend and Commentary Layer

Each control room should show:

- current score
- previous score
- delta
- trend
- 2-3 line executive commentary
- blocker counts
- next action

History and commentary must be generated from structured evidence. They must not include raw source code, raw diffs, secret values, env values, customer data, payment data, session data, or private logs.

Dev Control Room:

- uses `docs/reviews/dev-integrity-review-history.json`
- shows review confidence trend
- shows whether code-change risk is improving, declining, blocked, or clean
- explains whether Critical/High findings, confidence thresholds, or architecture context affected the run

Audit Control Room:

- may use future audit/exposure history
- currently uses vault and architecture signals where applicable
- should show whether release exposure is improving, declining, or blocked by policy

Architecture Control Room:

- uses `docs/architecture/architecture-confidence-history.json`
- shows whether the project map is becoming more complete, more risky, or more chaotic
- explains remaining unknowns, unclassified nodes, high-risk nodes, and runtime-proof gaps

Vault Control Room:

- uses `docs/architecture/vault-score-history.json`
- shows whether secrets, inventory coverage, runtime binding, and recovery posture are improving or declining
- explains missing inventory items, public secret-like warnings, unknown statuses, and recovery blockers

## Clickable Status Cells

Each status cell should open a detail view.

Modern interaction:

- click colored cell
- right-side drawer opens
- show run/finding details without leaving the dashboard

Detail drawer should include:

- project
- environment
- branch/PR/commit
- review stage
- current status
- confidence before/after
- severity
- finding summary
- why it matters
- affected files
- fix applied
- checks rerun
- evidence
- remaining risk
- next recommended action
- links to commit, PR, run, or incident note

Example:

Project: SaanaOS
Stage: Tenant Boundary
Status: Passed after fix
Confidence: 0.42 -> 0.88
Finding:
Admin API trusted slug before tenant authorization.
Fix:
Added request-aware tenant guard to all slug-scoped admin API routes.
Evidence:
TypeScript passed, integrity review ran, focused security review completed.
Remaining risk:
Live two-tenant runtime proof still needed before deploy.

## Audit Control Room

Purpose:
Show exposure and environment safety across Stage and Production.

Main question:
Is this environment currently exposed or unsafe?

Rows:

- projects
- environments
- domains
- API groups
- services

Columns:

- Public APIs
- Auth Required
- Tenant Boundary
- Secrets Exposure
- Env Vars
- Sessions/Cookies
- Webhooks
- CORS
- Admin Routes
- Logs
- Payments
- Messaging
- Exposure Score
- Alerts
- Evidence

Environment separation:

- Stage
- Production

The Audit Control Room should make it clear whether Stage is clean before Production release.

## Stage and Production Policy

AuthToolkit Dev Integrity does not need to own deployment.

It should act as:

- integrity gate
- alert system
- evidence system
- risk dashboard
- release-readiness signal

Recommended policy:

- no Production release if Stage has unresolved Critical findings
- no Production release if Stage has unresolved High findings unless explicitly waived
- optional strict policy: Stage confidence must be 100% before Production release
- evidence required before production release for protected projects

Product behavior:

- Stage audit failed -> alert
- Stage confidence below threshold -> mark Production release blocked
- unresolved Critical/High -> block or warn depending on policy
- waiver allowed only with recorded reason

## Audit vs Dev Difference

Dev Control Room:
Focuses on code changes and development workflow.

Audit Control Room:
Focuses on deployed or deployable environment exposure.

Dev asks:
Is this change safe to move forward?

Audit asks:
Is this environment safe right now?

Both share:

- findings
- confidence
- evidence
- alerts
- policy status
- detailed run history

## Data Model Concepts

Core objects:

- Organization
- Project
- Environment
- Repository
- Branch
- Pull Request
- Commit
- Integrity Run
- Audit Run
- Review Stage
- Finding
- Fix Attempt
- Check Run
- Evidence
- Alert
- Waiver
- Incident Note
- Confidence Score

Relationships:

Project -> Environments
Project -> Repositories
Repository -> Pull Requests / Commits
Integrity Run -> Review Stages
Review Stage -> Findings
Finding -> Fix Attempt
Fix Attempt -> Check Runs
Run -> Evidence
Audit Run -> Environment Exposure Status

## Example Dev Control Room Row

Project: SaanaOS
Run: Admin tenant-boundary fix
Plan: Passed
Guard: Passed
Security: Failed -> Passed
Tenant Boundary: Failed -> Passed
API Exposure: Passed
Typecheck: Passed
Browser QA: Warning
Evidence: Complete
Confidence: 0.42 -> 0.88
Final Decision: Approved after review

## Example Audit Control Room Row

Project: SaanaOS
Environment: Stage
Public APIs: Passed
Auth Required: Passed
Tenant Boundary: Passed
Secrets Exposure: Passed
Sessions/Cookies: Warning
Webhooks: Passed
Admin Routes: Passed
Exposure Score: 92%
Production Release: Blocked until session warning resolved or waived

## Product Value

For founders:

- see whether AI-assisted dev work is safe
- know which project is blocked
- understand risk without reading every code diff

For agencies:

- monitor multiple client projects
- produce evidence reports
- prove review work was done
- reduce client risk

For developers:

- see exact findings and checks
- know what needs fixing
- rerun reviews
- avoid unsafe merges

For non-coders:

- translate technical risk into plain status and confidence
- provide safety around vibe-coded apps
- answer: "Is this safe to ship?"

## Product Positioning

AuthToolkit Dev Integrity is not just a CLI or code review tool.

It is a control-room layer for AI-assisted software development.

Key phrases:

- Dev Control Room for AI-assisted development.
- Audit Control Room for API, secret, session, and environment exposure.
- Ship AI-built software with confidence.
- Vibe coding needs guardrails.
- Before AI-written code reaches production, run it through Dev Integrity.
- From code changes to confidence, evidence, and release readiness.

## MVP Dashboard Scope

Do not build the full dashboard first.

MVP dashboard should show:

- projects
- latest integrity run
- selected review stages
- status colors
- confidence before/after
- critical/high findings
- evidence link
- final decision

Later add:

- clickable cell drawer
- Stage vs Production audit view
- alerts
- waivers
- timeline
- confidence trends
- multi-project portfolio view

## Non-goals

- Do not become full CI/CD.
- Do not replace GitHub, Vercel, Cloudflare, or deployment systems.
- Do not promise perfect security.
- Do not hide the need for human approval on high-risk issues.
- Do not overbuild enterprise incident management in v1.

## Next Milestone

After documenting the control rooms:

1. Add control-room concepts to the main product strategy doc.
2. Define JSON output shape needed by a future dashboard.
3. Make local review evidence compatible with future dashboard ingestion.
4. Later build a simple dashboard page that reads local evidence or API run data.
