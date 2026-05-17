# AuthToolkit Dev Integrity Architecture Control Room

## Purpose

Document the product framework for a visual architecture map that helps founders, agencies, developers, and non-coders understand what an AI-built project contains, how the repo is connected, where trust boundaries exist, what external services are used, and where risk lives.

## Core Thesis

AI-assisted development creates speed, but it can also create systems nobody fully understands.

The Architecture Control Room answers:

- What did AI build?
- How is the project connected?
- Where are the dangerous parts?
- Which files/routes/APIs touch auth, tenants, payments, customer data, secrets, sessions, or external services?

## Relationship to Other Control Rooms

AuthToolkit Dev Integrity has three major control rooms:

1. Dev Control Room
   - What changed?
   - What failed?
   - What got fixed?
   - Can it ship?

2. Audit Control Room
   - Is Stage safe?
   - Is Production exposed?
   - Are APIs, sessions, secrets, webhooks, and environments safe?

3. Architecture Control Room
   - How does the project actually work?
   - What are the major components?
   - How do routes, APIs, data, auth, services, and workflows connect?

The Architecture Control Room powers the other two by giving them project context.

## Primary Users

- Founders using AI coding tools
- Non-coders building production apps
- Agencies managing client apps
- Developers reviewing unfamiliar codebases
- Technical leads monitoring multiple repos
- Security/compliance reviewers
- Future AuthToolkit support/implementation team

## Main Question

What is inside this project, how does it work, and where are the risks?

## Core Views

### 1. Repo Map

Shows:

- folders
- app routes
- API routes
- components
- libraries
- database/migrations
- config files
- scripts
- docs
- tests
- generated files

Purpose:

Help users understand the project structure.

Example classifications:

- public page
- admin page
- API route
- webhook
- auth helper
- database helper
- payment helper
- messaging helper
- config
- deployment file

### 2. Route Map

Shows:

- public routes
- protected routes
- admin routes
- tenant-scoped routes
- API routes
- webhook endpoints
- auth/login routes
- checkout/payment routes
- customer-facing routes

Purpose:

Show who can access what.

Example for SaanaOS:

- `/r/[slug]` public storefront
- `/r/[slug]/hub` public restaurant hub
- `/login` public login page
- `/admin` protected admin
- `/api/admin/restaurants/[slug]` protected tenant-scoped admin APIs
- `/api/twilio/*` provider webhooks
- `/api/stripe/*` provider webhooks

### 3. Trust Boundary Map

Shows security boundaries:

- public
- authenticated
- admin
- tenant-scoped
- service-role
- provider-webhook
- internal-only
- external-service
- production-only

Purpose:

Make authorization boundaries visible.

Important rule:

Slug is routing, not authorization. Session is identity, not complete authorization. Tenant membership check is authorization.

Example finding:

Admin page guard exists, but API route uses service-role before tenant guard.

### 4. Data Flow Map

Shows how data moves through the system.

Example flows:

- customer order flow
- checkout/payment flow
- Stripe webhook flow
- SMS/missed-call flow
- admin menu update flow
- QR/hub scan flow
- login/session flow
- file upload flow

Purpose:

Show operational workflows and state transitions.

Example:

Customer order -> checkout -> payment provider -> webhook -> order state -> SMS/customer notification -> admin/kitchen view

### 5. External Services Map

Shows external dependencies:

- Supabase
- Stripe
- Twilio
- Resend
- Cloudflare
- OpenAI
- Meta/WhatsApp
- Google
- Firebase
- GitHub
- analytics/tracking tools

Purpose:

Show what the app depends on and where external risk exists.

For each service track:

- purpose
- files/routes using it
- env vars required
- webhooks involved
- sensitive data involved
- failure impact

### 6. Env Vars and Secrets Map

Shows:

- env var names
- where they are referenced
- client-exposed variables
- server-only variables
- secret-like names
- missing/placeholder values
- production vs local differences

Purpose:

Detect accidental exposure or missing secret recovery.

Rules:

- `NEXT_PUBLIC` should never contain secret-like values.
- Service-role keys must stay server-only.
- Env usage should be traceable to purpose and provider.

### 7. Risk Overlay

Each node/file/route/service can have risk badges:

- Auth
- Tenant Boundary
- API Exposure
- Secrets
- Service Role
- Customer Data
- Payment
- Webhook
- SMS/Consent
- Session/Cookie
- File Upload
- Admin
- Public
- Production Deploy

Purpose:

Help users see risky areas visually.

### 8. Recent Change Overlay

Shows:

- recently changed files
- recent commits
- recent review findings
- confidence impact
- open blockers
- linked evidence

Purpose:

Connect architecture map to active development.

Example:

This API route changed in the latest commit and triggered Security + Tenant Boundary reviews.

### 9. Clickable Node Detail

Clicking a node opens a side drawer.

Node detail should show:

- file/route/service name
- classification
- access level
- trust boundary
- related files
- env vars used
- external services used
- data touched
- review packs triggered
- recent commits
- findings
- evidence
- open risks
- recommended checks

Example:

File:

`worker/web/app/api/admin/restaurants/[slug]/orders/route.ts`

Classification:

Protected tenant-scoped admin API

Trust boundary:

Authenticated admin + restaurant membership required

Risks:

Tenant Boundary, Service Role, Customer Data, Orders

Required checks:

Security Review, Tenant Boundary Review, API Exposure Audit

## Architecture Map Data Model

Core objects:

### ProjectNode

Fields:

- `node_id`
- `project_id`
- `type`: `folder | file | route | api_route | webhook | component | library | service | database | env_var | workflow`
- `name`
- `path`
- `classification`
- `trust_boundary`
- `risk_tags`
- `metadata`

### ProjectEdge

Fields:

- `edge_id`
- `project_id`
- `source_node_id`
- `target_node_id`
- `relationship_type`: `imports | calls | reads | writes | authenticates | authorizes | sends_to | receives_from | deploys_to | uses_env`
- `metadata`

### ProjectFlow

Fields:

- `flow_id`
- `project_id`
- `name`
- `description`
- `nodes`
- `edges`
- `risk_tags`
- `status`

### RiskTag

Fields:

- `tag`
- `severity_default`
- `description`
- `suggested_review_packs`

### ServiceDependency

Fields:

- `service_id`
- `provider`
- `purpose`
- `env_vars`
- `files`
- `routes`
- `webhooks`
- `risk_tags`
- `failure_impact`

### ArchitectureSnapshot

Fields:

- `snapshot_id`
- `project_id`
- `commit_sha`
- `created_at`
- `nodes_count`
- `edges_count`
- `high_risk_nodes_count`
- `summary`
- `evidence_url`

## How Architecture Control Room Feeds Dev Integrity

Architecture map improves review routing.

Example:

Changed file:

`app/api/admin/restaurants/[slug]/orders/route.ts`

Architecture map knows:

- API route
- admin
- tenant-scoped
- service-role
- order/customer data

Therefore selected checks:

- Security Review
- Tenant Boundary Review
- API Exposure Audit
- Restaurant UX Review if order flow affected

## How Architecture Control Room Feeds Audit Control Room

Architecture map improves exposure audit.

Example:

Audit sees:

- public API route
- uses service-role
- no auth guard detected

Audit flags:

- Critical API exposure risk

## MVP Scope

Do not build full graph UI first.

MVP should produce:

1. Project map JSON
2. Classified file list
3. Route/API list
4. External services list
5. Env var usage list
6. Risk tags per file/route
7. Simple Markdown/JSON summary

MVP output example:

```json
{
  "project": "saanaos",
  "snapshot_id": "arch_001",
  "nodes": [],
  "edges": [],
  "high_risk_nodes": [],
  "external_services": [],
  "env_vars": [],
  "risk_summary": {}
}
```

## Future UI

Architecture Control Room layout:

Left panel:

- repo tree
- filters
- risk tags

Center:

- visual graph/map
- grouped by routes, services, workflows, trust boundaries

Right drawer:

- selected node details
- risks
- evidence
- related findings
- recommended checks

Top hero:

- Architecture Confidence
- High-Risk Nodes
- Public APIs
- Service-Role Paths
- External Services
- Secrets/Env Warnings

## Hero Metrics

Primary tiles:

- Architecture Confidence
- Architecture Confidence Trend
- High-Risk Nodes
- Public API Routes
- Tenant-Scoped Routes
- Service-Role Paths
- External Services
- Env/Secret Warnings
- Unmapped Flows

Example:

```text
[Architecture Confidence: 87%]
[Trend: +5 improved]
[High-Risk Nodes: 14]
[Public APIs: 22]
[Service-Role Paths: 8]
[Env Warnings: 1]
[Unmapped Flows: 3]
```

Purpose:

A founder or lead should see whether the project is understandable and whether risky areas are mapped.

## Architecture Confidence History

Architecture Control Room should show whether mapping quality is improving or declining over time.

Generated local artifact:

`docs/architecture/architecture-confidence-history.json`

History entry signals:

- architecture confidence
- total files
- route/API/webhook counts
- external services count
- env vars count
- high-risk nodes count
- unknowns count
- unclassified nodes count
- service-role paths count
- tenant-scoped routes count

The dashboard should show:

- current Architecture Confidence
- previous Architecture Confidence
- confidence delta
- trend: improved, declined, unchanged, or unknown
- remaining unknowns that still need review
- whether runtime proof is still missing for tenant or sensitive boundaries

History stores metrics and counts only. It must not include raw source code, raw diffs, secret values, env values, customer data, payment data, session data, or private logs.

## Executive Commentary

Architecture Control Room should include 1-3 deterministic plain-English commentary lines generated from structured map data.

Examples:

- The project file map is fully classified; no unclassified nodes remain.
- Architecture confidence remains below 70 because runtime proof, webhook trust, auth boundary, or file-upload unknowns still need review.
- High-risk nodes remain in the map and should be reviewed before production-sensitive changes.

Commentary should explain:

- whether the map is becoming more complete
- whether high-risk nodes remain
- what still needs runtime proof
- whether Vault inventory covers detected env vars

Commentary must not include raw source code, raw diffs, secret values, env values, customer data, payment data, session data, or private logs.

## Suggested Status Colors

- Green: mapped and reviewed
- Yellow: mapped with warning
- Red: risky/unprotected
- Blue: external service
- Purple: service-role/internal privileged path
- Gray: unknown/unclassified
- Orange: payment/messaging sensitive

## Non-goals

- Do not replace full architecture documentation.
- Do not promise complete static analysis.
- Do not pretend all data flows can be inferred automatically.
- Do not block development solely because a graph is incomplete.
- Do not overbuild visual graph rendering in v1.

## Product Value

For non-coders:

- understand what AI built
- see risky parts without reading code
- know what needs review

For founders:

- monitor system complexity
- see external dependencies
- see where customer/payment/admin data flows
- explain the system to contractors or investors

For developers:

- onboard faster
- see route/service relationships
- know which files trigger which checks

For agencies:

- explain client systems visually
- produce architecture evidence
- reduce handoff risk

## Key Phrases

- Architecture Control Room for AI-built software.
- Know what AI built before you ship it.
- Visualize routes, APIs, services, trust boundaries, and risk.
- Turn vibe-coded projects into understandable systems.
- From repo chaos to architecture clarity.

## Next Milestones

1. Document Architecture Control Room framework.
2. Define project-map JSON contract.
3. Build local architecture scanner.
4. Generate project-map.json from SaanaOS.
5. Feed project-map.json into Dev Integrity routing.
6. Later build visual dashboard.
