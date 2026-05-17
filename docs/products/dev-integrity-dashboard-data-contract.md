# AuthToolkit Dev Integrity Dashboard Data Contract

Purpose: define the JSON/data shape needed by the future Dev Control Room and Audit Control Room dashboards.

The CLI/API/review engine should eventually output structured data that can power:

- dashboard hero tiles
- project/stage/prod grid rows
- colored status cells
- clickable detail drawers
- evidence links
- confidence before/after
- alerts
- release readiness

## Core Objects

### Organization

Fields:

- organization_id
- name
- plan
- created_at

### Project

Fields:

- project_id
- organization_id
- name
- repo_name
- profile
- stack
- status
- environments

### Environment

Fields:

- environment_id
- project_id
- name
- type: stage | production | preview | local
- base_url
- status

### IntegrityRun

Fields:

- run_id
- project_id
- environment_id
- repo
- branch
- commit_sha
- pull_request_id
- trigger_type: local | staged | pr | api | scheduled | manual
- started_at
- completed_at
- status: passed | failed | blocked | warning | running | skipped
- final_decision: allow | block | needs_approval | waived
- confidence_before
- confidence_after
- confidence_delta
- evidence_url
- config_path
- config_version

### AuditRun

Fields:

- audit_run_id
- project_id
- environment_id
- audit_type: exposure | release_readiness | scheduled | manual
- started_at
- completed_at
- status
- exposure_score
- production_release_status: ready | blocked | warning | not_applicable
- evidence_url

### ReviewStage

Fields:

- stage_id
- run_id
- name
- review_pack
- status: passed | failed | blocked | warning | running | skipped | auto_fixed | needs_approval | not_applicable
- severity_max
- confidence_before
- confidence_after
- findings_count
- blocker_count
- duration_ms
- evidence_url

### Finding

Fields:

- finding_id
- run_id
- stage_id
- severity: Critical | High | Medium | Low
- category
- title
- message
- why_it_matters
- file
- line
- scope: diff-line | file-level | runtime | environment | manual
- suggested_action
- status: open | fixed | waived | accepted_risk
- created_at
- resolved_at

### FixAttempt

Fields:

- fix_attempt_id
- finding_id
- run_id
- type: auto_fix | agent_fix | human_fix | config_change | waiver
- description
- files_changed
- confidence_before
- confidence_after
- checks_rerun
- status

### Evidence

Fields:

- evidence_id
- run_id
- type: markdown | json | log | screenshot | command_output | commit | pr_comment
- title
- url_or_path
- created_at

### Alert

Fields:

- alert_id
- project_id
- environment_id
- run_id
- severity
- title
- message
- status: open | acknowledged | resolved
- created_at
- resolved_at

### Waiver

Fields:

- waiver_id
- finding_id
- run_id
- approved_by
- reason
- expires_at
- created_at

## Dev Control Room Data

Hero metrics:

```json
{
  "current_confidence": 94,
  "before_fix_confidence": 42,
  "after_fix_confidence": 88,
  "critical_high_blockers": 0,
  "runs_needing_approval": 1,
  "ready_to_ship": true,
  "confidence_delta": 46,
  "executive_commentary": [
    "The latest Dev Integrity run has no Critical or High blockers.",
    "Vault inventory covers all env vars currently detected in code."
  ]
}
```

Grid row:

```json
{
  "project": "SaanaOS",
  "run": "Admin tenant-boundary fix",
  "commit_sha": "aacb946",
  "stages": {
    "plan": "passed",
    "guard": "passed",
    "security": "passed_after_fix",
    "tenant_boundary": "passed_after_fix",
    "api_exposure": "passed",
    "browser_qa": "warning"
  },
  "confidence": {
    "before": 42,
    "after": 88,
    "delta": 46
  },
  "final_decision": "approved_after_review",
  "executive_commentary": [
    "High-risk files changed, but required review packs passed after fix."
  ],
  "evidence_url": "docs/reviews/example.md"
}
```

## Audit Control Room Data

Hero metrics:

```json
{
  "stage_confidence": 100,
  "production_confidence": 98,
  "exposure_findings": {
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 5
  },
  "release_readiness": "blocked",
  "open_alerts": 2,
  "executive_commentary": [
    "Production remains blocked because one exposure warning still needs review.",
    "Runtime proof is still needed for tenant or sensitive boundary verification."
  ]
}
```

Grid row:

```json
{
  "project": "SaanaOS",
  "environment": "Stage",
  "public_apis": "passed",
  "auth_required": "passed",
  "tenant_boundary": "passed",
  "secrets_exposure": "passed",
  "sessions_cookies": "warning",
  "webhooks": "passed",
  "admin_routes": "passed",
  "exposure_score": 92,
  "executive_commentary": [
    "Public APIs are mapped, but session and cookie findings still need review."
  ],
  "production_release": "blocked"
}
```

## Clickable Cell Detail Drawer Payload

Payload:

```json
{
  "project": "SaanaOS",
  "environment": "Stage",
  "run_id": "run_123",
  "stage": "Tenant Boundary",
  "status": "passed_after_fix",
  "confidence_before": 42,
  "confidence_after": 88,
  "severity": "Critical",
  "finding_summary": "Admin API trusted slug before tenant authorization.",
  "why_it_matters": "A logged-in user could potentially call another restaurant's admin API by changing slug.",
  "affected_files": [
    "worker/web/app/api/admin/restaurants/[slug]/orders/route.ts"
  ],
  "fix_applied": "Added request-aware tenant guard before service-role queries.",
  "checks_rerun": [
    "TypeScript",
    "Targeted ESLint",
    "Integrity Review",
    "Focused Tenant Boundary Review"
  ],
  "evidence": [
    {
      "type": "commit",
      "label": "aacb946 Protect admin API tenant boundaries",
      "url_or_path": "git:aacb946"
    }
  ],
  "remaining_risk": "Live two-tenant runtime proof still needed before production deploy.",
  "executive_commentary": [
    "This finding touches tenant authorization and should stay linked to runtime proof evidence."
  ],
  "next_action": "Run runtime two-tenant proof."
}
```

## Status Values and Colors

Canonical status values:

- passed: green
- failed: red
- blocked: red/dark
- warning: yellow
- running: blue
- skipped: gray
- not_applicable: gray
- auto_fixed: purple
- passed_after_fix: green with fix indicator
- needs_approval: dark/black
- waived: yellow/gray

## Confidence Rules

- Confidence should be 0-100 in dashboard, even if CLI internally uses 0.00-1.00.
- Store both raw score and display percent when useful.
- Always show confidence with blocker count or policy status.
- Confidence can improve after fixes and checks rerun.
- Confidence can drop when a change introduces risk.

## Release Readiness Policy Data

```json
{
  "policy_id": "stage-clean-before-prod",
  "environment": "stage",
  "requires": {
    "critical": 0,
    "high": 0,
    "minimum_confidence": 100,
    "evidence_required": true
  },
  "result": "blocked",
  "reason": "One High session/cookie finding remains unresolved."
}
```

## History Data

Local generated history files:

- `docs/architecture/architecture-confidence-history.json`
- `docs/architecture/vault-score-history.json`
- `docs/reviews/dev-integrity-review-history.json`

These are generated artifacts for future dashboards. They show score changes over time and should store metrics, counts, statuses, and high-level routing data only.

History files must not include:

- raw source code
- raw diffs
- secret values
- environment variable values
- customer data
- payment data
- session data
- private logs

### ArchitectureConfidenceHistoryEntry

```json
{
  "timestamp": "2026-05-17T00:00:00.000Z",
  "commit_sha": "abc123",
  "project": "saanaos",
  "architecture_confidence": 60,
  "total_files": 321,
  "routes_count": 106,
  "api_routes_count": 58,
  "webhook_routes_count": 3,
  "external_services_count": 11,
  "env_vars_count": 35,
  "high_risk_nodes_count": 12,
  "unknowns_count": 62,
  "unclassified_nodes_count": 0,
  "service_role_paths_count": 36,
  "tenant_scoped_routes_count": 40
}
```

### VaultScoreHistoryEntry

```json
{
  "timestamp": "2026-05-17T00:00:00.000Z",
  "commit_sha": "abc123",
  "project": "saanaos",
  "vault_score": 67,
  "inventory_found": true,
  "inventoried_secret_names_count": 56,
  "detected_env_vars_count": 35,
  "used_not_in_inventory_count": 0,
  "inventoried_not_used_count": 21,
  "secret_like_public_env_count": 2,
  "required_unknown_status_count": 1
}
```

### DevIntegrityReviewHistoryEntry

```json
{
  "timestamp": "2026-05-17T00:00:00.000Z",
  "commit_sha": "abc123",
  "project": "saanaos",
  "trigger_type": "working_tree",
  "confidence_score": 0.9,
  "confidence_percent": 90,
  "confidence_interpretation": "safe auto-fix candidate",
  "selected_skills": ["saana-plan", "saana-guard"],
  "critical_findings_count": 0,
  "high_findings_count": 0,
  "medium_findings_count": 0,
  "low_findings_count": 0,
  "changed_files_count": 1,
  "project_map_used": true,
  "architecture_confidence": 60,
  "exit_reason": "passed"
}
```

History writers should suppress duplicate entries when the latest run has the same commit, score, changed-file count, selected reviews, finding counts, and exit reason.

## Executive Commentary

`executive_commentary` is an array of 1-3 plain-English lines generated from structured data.

Rules:

- Generate commentary from scores, deltas, trends, blocker counts, unknowns, findings, and inventory coverage.
- Do not invent facts manually.
- Do not include secrets, raw source code, raw diffs, logs, env values, payment data, session data, or customer records.
- Use commentary to explain highlights, risks, and next actions.
- Show commentary in Dev Control Room, Audit Control Room, Architecture Control Room, and future Vault Control Room.

Example:

```json
{
  "executive_commentary": [
    "The project file map is fully classified; no unclassified nodes remain.",
    "Architecture confidence remains below 70 because runtime proof and webhook trust unknowns still need review.",
    "Vault inventory covers all env vars currently detected in code."
  ]
}
```

## MVP Data Requirements

For first dashboard MVP, only require:

- projects
- latest run
- stages/statuses
- confidence before/after
- Critical/High count
- evidence link
- final decision
- clickable detail payload

## Future Data Requirements

Later add:

- historical confidence trends
- multi-environment audit history
- alerts
- waivers
- screenshots
- PR comments
- integration with GitHub checks
- hosted API run ingestion

## Principle

The dashboard should not invent status. It should render structured evidence produced by the CLI/API/review engine.
