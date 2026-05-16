# AuthToolkit Dev Integrity Profile Builder

Core idea: start with a profile. AuthToolkit customizes the integrity pipeline based on the app's stack, capabilities, risks, and actual codebase.

Model:

- Profile = starting template
- Capabilities = what the app actually does
- Review Packs = selected checks
- Rules = scoring, blocking, evidence, autofix limits

## Why Profiles Alone Are Not Enough

Two SaaS apps can have different risks. Two restaurant apps can have different features. One agency website may only collect form leads, while another may process payments and send SMS.

Rigid profiles create false confidence. Open-ended AI-only setup can hallucinate or miss risks. The best approach is profile + questions + repo scan + editable config.

## Onboarding Flow

1. Pick closest starter profile:

- SaaS App
- Restaurant Tech / Local Commerce
- Agency Website / GoHighLevel-style Operator
- Other / Custom

2. Ask capability questions:

- Do users log in?
- Do you have admin users?
- Do customers belong to accounts, tenants, restaurants, or workspaces?
- Do you use Stripe or another payment provider?
- Do you use webhooks?
- Do you send SMS, WhatsApp, or email?
- Do you collect phone numbers?
- Do you store customer data?
- Do you upload or serve files?
- Do you have staging and production?
- Do you use Supabase, Firebase, Clerk, Auth0, Stripe, Twilio, Resend, Cloudflare, or similar providers?

3. Scan repository signals:

- package names
- API routes
- auth/session files
- env var names
- webhook routes
- payment files
- messaging files
- admin routes
- tenant/workspace/account patterns
- deployment files

4. Generate recommended capabilities:

```json
{
  "auth": true,
  "multiTenant": true,
  "adminDashboard": true,
  "payments": true,
  "webhooks": true,
  "sms": true,
  "customerData": true,
  "fileUploads": false,
  "productionDeploy": true
}
```

5. Generate enabled review packs:

```json
[
  "auth-session",
  "tenant-boundary",
  "api-exposure",
  "secrets-env",
  "payments-webhooks",
  "sms-consent",
  "browser-qa",
  "deploy-canary"
]
```

6. Generate authtoolkit.integrity.json.

7. User reviews and edits config.

8. AuthToolkit Dev Integrity starts running locally, in PRs, or through API.

## Starter Profiles

### SaaS App

Common capabilities:

- auth
- teams/workspaces/tenants
- admin dashboard
- subscriptions
- API/webhooks
- customer data

Default review packs:

- auth-session
- tenant-boundary
- api-exposure
- secrets-env
- payments-webhooks
- database-rls
- deploy-canary

### Restaurant Tech / Local Commerce

Common capabilities:

- restaurant/admin boundary
- menus
- orders
- QR/hub pages
- payments
- SMS/WhatsApp
- customer phone numbers
- pickup/delivery workflow

Default review packs:

- tenant-boundary
- restaurant-ux
- order-flow
- payments-webhooks
- sms-consent
- api-exposure
- deploy-canary

### Agency Website / GoHighLevel-style Operator

Common capabilities:

- landing pages
- forms
- lead capture
- webhooks
- CRM integrations
- tracking scripts
- calendars
- SMS/email automations
- payment links

Default review packs:

- lead-capture-integrity
- form-webhook
- public-exposure
- secrets-env
- consent-privacy
- tracking-script
- deploy-canary

## Config Shape

Example:

```json
{
  "profile": "restaurant-tech",
  "capabilities": {
    "auth": true,
    "multiTenant": true,
    "adminDashboard": true,
    "payments": true,
    "webhooks": true,
    "sms": true,
    "whatsapp": false,
    "customerData": true,
    "publicForms": false,
    "fileUploads": true,
    "productionDeploy": true
  },
  "enabledReviewPacks": [
    "auth-session",
    "tenant-boundary",
    "api-exposure",
    "payments-webhooks",
    "sms-consent",
    "restaurant-ux",
    "deploy-canary"
  ]
}
```

## AI Usage

Use AI to:

- interview the user
- infer capabilities
- suggest review packs
- explain risks in plain English
- draft the config
- summarize findings

Do not use AI as the only guardrail. Deterministic checks and explicit config should remain the enforcement foundation.

## Product Principle

AuthToolkit should not ask customers to understand every security concept. It should ask plain-English questions, inspect the codebase, then build a practical integrity pipeline.

Key phrase:
Start with a profile. Customize by capability. Verify with code signals. Enforce with review packs.
