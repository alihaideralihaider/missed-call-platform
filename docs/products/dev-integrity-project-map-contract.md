# AuthToolkit Dev Integrity Project Map Contract

## Purpose

Define the JSON/data shape for the Architecture Control Room and future local architecture scanner.

The project map is a structured snapshot of a repository. It helps AuthToolkit Dev Integrity understand routes, APIs, services, trust boundaries, env vars, workflows, and risk areas. It can later feed Dev Control Room routing, Audit Control Room exposure checks, and Architecture Control Room visualization.

## Core Principles

- The project map should describe the system, not make unsupported claims.
- Static scanning should classify what it can see and mark uncertain items as unknown.
- The map should be useful before full visual dashboard exists.
- The map should help answer: what did AI build, how is it connected, and where are the risks?
- The map should feed review routing and audit checks.

## Top-Level Shape

Example:

```json
{
  "schema_version": "0.1",
  "project": "saanaos",
  "stack": "nextjs-cloudflare-supabase",
  "snapshot_id": "arch_2026_05_16_001",
  "commit_sha": "abc123",
  "created_at": "2026-05-16T00:00:00Z",
  "summary": {},
  "nodes": [],
  "edges": [],
  "flows": [],
  "external_services": [],
  "env_vars": [],
  "risk_summary": {},
  "unknowns": []
}
```

## Project Summary

Fields:

```json
{
  "total_files": 0,
  "routes_count": 0,
  "api_routes_count": 0,
  "webhook_routes_count": 0,
  "public_routes_count": 0,
  "protected_routes_count": 0,
  "tenant_scoped_routes_count": 0,
  "service_role_paths_count": 0,
  "external_services_count": 0,
  "env_vars_count": 0,
  "high_risk_nodes_count": 0,
  "unclassified_nodes_count": 0,
  "architecture_confidence": 87
}
```

## Node Object

Define `ProjectNode`:

```json
{
  "node_id": "node_001",
  "type": "file",
  "name": "orders route",
  "path": "worker/web/app/api/admin/restaurants/[slug]/orders/route.ts",
  "classification": "tenant_scoped_admin_api",
  "trust_boundary": "tenant_admin",
  "access_level": "authenticated_tenant_admin",
  "risk_tags": ["tenant-boundary", "service-role", "customer-data", "orders"],
  "review_packs": ["security", "tenant-boundary", "api-exposure"],
  "external_services": ["supabase"],
  "env_vars": ["SUPABASE_SERVICE_ROLE_KEY"],
  "metadata": {
    "framework": "nextjs",
    "route": "/api/admin/restaurants/[slug]/orders",
    "methods": ["GET"],
    "uses_service_role": true,
    "uses_tenant_guard": true,
    "uses_params_slug": true
  },
  "confidence": 90,
  "status": "mapped"
}
```

Node types:

- `folder`
- `file`
- `page_route`
- `api_route`
- `webhook_route`
- `component`
- `library`
- `database`
- `migration`
- `env_var`
- `external_service`
- `workflow`
- `config`
- `script`
- `unknown`

Classifications:

- `public_page`
- `protected_page`
- `admin_page`
- `public_api`
- `protected_api`
- `tenant_scoped_api`
- `tenant_scoped_admin_api`
- `provider_webhook`
- `auth_route`
- `checkout_route`
- `payment_route`
- `messaging_route`
- `database_helper`
- `service_role_helper`
- `config_file`
- `deployment_file`
- `unknown`

Trust boundaries:

- `public`
- `authenticated`
- `admin`
- `tenant_admin`
- `service_role`
- `provider_webhook`
- `internal`
- `external`
- `unknown`

Status values:

- `mapped`
- `partial`
- `unknown`
- `risky`
- `needs_review`

## Edge Object

Define `ProjectEdge`:

```json
{
  "edge_id": "edge_001",
  "source_node_id": "node_orders_route",
  "target_node_id": "node_supabase",
  "relationship_type": "uses_service",
  "label": "queries orders through Supabase service role",
  "risk_tags": ["service-role", "customer-data"],
  "confidence": 80,
  "metadata": {}
}
```

Relationship types:

- `imports`
- `calls`
- `reads`
- `writes`
- `authenticates`
- `authorizes`
- `uses_env`
- `uses_service`
- `sends_to`
- `receives_from`
- `redirects_to`
- `deploys_to`
- `triggers`
- `unknown`

## Flow Object

Define `ProjectFlow`:

```json
{
  "flow_id": "flow_order_checkout",
  "name": "Order checkout flow",
  "description": "Customer places order, payment provider confirms, order state updates.",
  "nodes": ["node_menu", "node_checkout", "node_stripe", "node_webhook", "node_order_state"],
  "edges": ["edge_checkout_to_stripe", "edge_stripe_to_webhook"],
  "risk_tags": ["payment", "webhook", "customer-data"],
  "status": "partial",
  "confidence": 70,
  "unknowns": ["Runtime payment state transitions need verification."]
}
```

Example flows:

- login/session flow
- admin tenant access flow
- customer order flow
- checkout/payment flow
- webhook confirmation flow
- SMS/missed-call flow
- QR/hub scan flow
- file upload flow
- deployment flow

## External Service Object

Define `ServiceDependency`:

```json
{
  "service_id": "service_supabase",
  "provider": "Supabase",
  "purpose": "database, auth, storage",
  "files": ["worker/web/lib/supabase/admin.ts"],
  "routes": ["worker/web/app/api/admin/restaurants/[slug]/orders/route.ts"],
  "env_vars": ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  "webhooks": [],
  "risk_tags": ["database", "auth", "service-role"],
  "failure_impact": "Admin APIs and order data may fail."
}
```

Common services:

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
- analytics/tracking

## Env Var Object

Define `EnvVarUsage`:

```json
{
  "name": "SUPABASE_SERVICE_ROLE_KEY",
  "exposure": "server_only",
  "secret_like": true,
  "files": ["worker/web/lib/supabase/admin.ts"],
  "services": ["Supabase"],
  "risk_tags": ["secret", "service-role"],
  "warnings": []
}
```

Exposure values:

- `client_public`
- `server_only`
- `unknown`

Rules:

- `NEXT_PUBLIC_*` is `client_public`.
- Secret-like `NEXT_PUBLIC` names should create warning.
- service role keys should be `server_only`.
- unknown exposure should be marked for review.

## Risk Summary

Example:

```json
{
  "critical": 0,
  "high": 3,
  "medium": 8,
  "low": 14,
  "risk_tags": {
    "tenant-boundary": 19,
    "service-role": 12,
    "payment": 6,
    "webhook": 4,
    "sms-consent": 5,
    "secrets": 3,
    "customer-data": 24
  },
  "high_risk_nodes": [
    "worker/web/app/api/admin/restaurants/[slug]/orders/route.ts"
  ]
}
```

## Unknowns

Unknowns should be explicit.

Example:

```json
{
  "type": "runtime_proof_missing",
  "message": "Live two-tenant proof has not been run.",
  "related_nodes": ["node_orders_route"],
  "suggested_action": "Run runtime two-tenant proof before production deploy."
}
```

Other unknown types:

- `unclassified_route`
- `unknown_auth_boundary`
- `unknown_env_exposure`
- `unknown_payment_state`
- `unknown_webhook_trust`
- `unknown_file_upload_access`
- `runtime_proof_missing`

## Architecture Confidence

Architecture confidence is not code safety confidence. It measures how well the system is mapped and classified.

Factors increasing confidence:

- routes classified
- env vars mapped
- external services detected
- trust boundaries known
- high-risk nodes reviewed
- flows identified

Factors decreasing confidence:

- unknown routes
- unclassified APIs
- unmapped service-role paths
- unknown env exposure
- unknown auth boundary
- missing runtime proof

Scale:

- 90-100: well mapped
- 70-89: mostly mapped with some unknowns
- 40-69: partial map, needs review
- below 40: poorly understood

## SaanaOS Example Snapshot

This abbreviated snapshot shows a public restaurant hub route, a protected admin API route, Supabase service dependency, Twilio webhook, Stripe/payment placeholder, and tenant-boundary risk tags.

```json
{
  "schema_version": "0.1",
  "project": "saanaos",
  "stack": "nextjs-cloudflare-supabase",
  "snapshot_id": "arch_2026_05_16_001",
  "commit_sha": "abc123",
  "created_at": "2026-05-16T00:00:00Z",
  "summary": {
    "total_files": 0,
    "routes_count": 4,
    "api_routes_count": 2,
    "webhook_routes_count": 1,
    "public_routes_count": 1,
    "protected_routes_count": 1,
    "tenant_scoped_routes_count": 1,
    "service_role_paths_count": 1,
    "external_services_count": 3,
    "env_vars_count": 5,
    "high_risk_nodes_count": 2,
    "unclassified_nodes_count": 1,
    "architecture_confidence": 72
  },
  "nodes": [
    {
      "node_id": "node_public_hub",
      "type": "page_route",
      "name": "Restaurant hub",
      "path": "worker/web/app/r/[slug]/hub/page.tsx",
      "classification": "public_page",
      "trust_boundary": "public",
      "access_level": "public",
      "risk_tags": ["public", "customer-facing"],
      "review_packs": ["restaurant-ux"],
      "external_services": ["supabase"],
      "env_vars": ["NEXT_PUBLIC_SUPABASE_URL"],
      "metadata": {
        "framework": "nextjs",
        "route": "/r/[slug]/hub",
        "uses_params_slug": true
      },
      "confidence": 85,
      "status": "mapped"
    },
    {
      "node_id": "node_orders_route",
      "type": "api_route",
      "name": "Orders API",
      "path": "worker/web/app/api/admin/restaurants/[slug]/orders/route.ts",
      "classification": "tenant_scoped_admin_api",
      "trust_boundary": "tenant_admin",
      "access_level": "authenticated_tenant_admin",
      "risk_tags": ["tenant-boundary", "service-role", "customer-data", "orders"],
      "review_packs": ["security", "tenant-boundary", "api-exposure"],
      "external_services": ["supabase"],
      "env_vars": ["SUPABASE_SERVICE_ROLE_KEY"],
      "metadata": {
        "framework": "nextjs",
        "route": "/api/admin/restaurants/[slug]/orders",
        "methods": ["GET"],
        "uses_service_role": true,
        "uses_tenant_guard": true,
        "uses_params_slug": true
      },
      "confidence": 90,
      "status": "mapped"
    },
    {
      "node_id": "node_twilio_webhook",
      "type": "webhook_route",
      "name": "Twilio webhook",
      "path": "worker/web/app/api/twilio/missed-call/route.ts",
      "classification": "provider_webhook",
      "trust_boundary": "provider_webhook",
      "access_level": "provider_signed_or_verified",
      "risk_tags": ["webhook", "sms-consent", "customer-data"],
      "review_packs": ["security", "api-exposure"],
      "external_services": ["twilio"],
      "env_vars": ["TWILIO_AUTH_TOKEN"],
      "metadata": {
        "framework": "nextjs",
        "route": "/api/twilio/missed-call",
        "methods": ["POST"]
      },
      "confidence": 75,
      "status": "partial"
    },
    {
      "node_id": "node_stripe_placeholder",
      "type": "external_service",
      "name": "Stripe",
      "path": null,
      "classification": "payment_route",
      "trust_boundary": "external",
      "access_level": "external_service",
      "risk_tags": ["payment", "webhook"],
      "review_packs": ["security", "api-exposure"],
      "external_services": ["stripe"],
      "env_vars": ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
      "metadata": {
        "status": "placeholder",
        "needs_runtime_verification": true
      },
      "confidence": 50,
      "status": "needs_review"
    }
  ],
  "edges": [
    {
      "edge_id": "edge_orders_to_supabase",
      "source_node_id": "node_orders_route",
      "target_node_id": "service_supabase",
      "relationship_type": "uses_service",
      "label": "queries tenant orders through Supabase service role",
      "risk_tags": ["service-role", "tenant-boundary", "customer-data"],
      "confidence": 80,
      "metadata": {}
    }
  ],
  "flows": [
    {
      "flow_id": "flow_customer_order",
      "name": "Customer order flow",
      "description": "Customer enters through public restaurant route and order state is later visible in protected admin APIs.",
      "nodes": ["node_public_hub", "node_orders_route", "node_stripe_placeholder"],
      "edges": ["edge_orders_to_supabase"],
      "risk_tags": ["tenant-boundary", "payment", "customer-data"],
      "status": "partial",
      "confidence": 65,
      "unknowns": ["Runtime payment state transitions need verification."]
    }
  ],
  "external_services": [
    {
      "service_id": "service_supabase",
      "provider": "Supabase",
      "purpose": "database, auth, storage",
      "files": ["worker/web/lib/supabase/admin.ts"],
      "routes": ["worker/web/app/api/admin/restaurants/[slug]/orders/route.ts"],
      "env_vars": ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      "webhooks": [],
      "risk_tags": ["database", "auth", "service-role"],
      "failure_impact": "Admin APIs and order data may fail."
    },
    {
      "service_id": "service_twilio",
      "provider": "Twilio",
      "purpose": "missed-call SMS workflow",
      "files": ["worker/web/app/api/twilio/missed-call/route.ts"],
      "routes": ["worker/web/app/api/twilio/missed-call/route.ts"],
      "env_vars": ["TWILIO_AUTH_TOKEN"],
      "webhooks": ["worker/web/app/api/twilio/missed-call/route.ts"],
      "risk_tags": ["webhook", "sms-consent"],
      "failure_impact": "Missed-call capture and customer SMS notifications may fail."
    },
    {
      "service_id": "service_stripe",
      "provider": "Stripe",
      "purpose": "payment processing",
      "files": [],
      "routes": [],
      "env_vars": ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
      "webhooks": [],
      "risk_tags": ["payment", "webhook"],
      "failure_impact": "Checkout or payment confirmation may fail."
    }
  ],
  "env_vars": [
    {
      "name": "SUPABASE_SERVICE_ROLE_KEY",
      "exposure": "server_only",
      "secret_like": true,
      "files": ["worker/web/lib/supabase/admin.ts"],
      "services": ["Supabase"],
      "risk_tags": ["secret", "service-role"],
      "warnings": []
    },
    {
      "name": "NEXT_PUBLIC_SUPABASE_URL",
      "exposure": "client_public",
      "secret_like": false,
      "files": ["worker/web/app/r/[slug]/hub/page.tsx"],
      "services": ["Supabase"],
      "risk_tags": [],
      "warnings": []
    },
    {
      "name": "TWILIO_AUTH_TOKEN",
      "exposure": "server_only",
      "secret_like": true,
      "files": ["worker/web/app/api/twilio/missed-call/route.ts"],
      "services": ["Twilio"],
      "risk_tags": ["secret", "webhook"],
      "warnings": []
    }
  ],
  "risk_summary": {
    "critical": 0,
    "high": 2,
    "medium": 3,
    "low": 1,
    "risk_tags": {
      "tenant-boundary": 2,
      "service-role": 2,
      "payment": 2,
      "webhook": 2,
      "sms-consent": 1,
      "secrets": 2,
      "customer-data": 3
    },
    "high_risk_nodes": [
      "worker/web/app/api/admin/restaurants/[slug]/orders/route.ts",
      "worker/web/app/api/twilio/missed-call/route.ts"
    ]
  },
  "unknowns": [
    {
      "type": "runtime_proof_missing",
      "message": "Live two-tenant proof has not been run.",
      "related_nodes": ["node_orders_route"],
      "suggested_action": "Run runtime two-tenant proof before production deploy."
    },
    {
      "type": "unknown_payment_state",
      "message": "Stripe/payment path is represented as a placeholder until implementation and runtime state transitions are verified.",
      "related_nodes": ["node_stripe_placeholder"],
      "suggested_action": "Map payment routes and webhooks after checkout implementation is present."
    }
  ]
}
```

## MVP Scanner Output

First local scanner should generate:

`project-map.json`

Containing:

- summary
- nodes
- external_services
- env_vars
- risk_summary
- unknowns

Edges and flows may be partial in v1.

## Future Dashboard Use

Architecture Control Room will use this contract for:

- repo tree
- visual graph
- route map
- external service map
- risk overlay
- clickable node drawer
- hero metrics
- recent change overlay

## Principle

The project map should make AI-built software understandable before it tries to make it perfect.
