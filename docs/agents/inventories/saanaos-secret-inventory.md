# SaanaOS Secret Inventory

Never store raw secret values in this file.
Only document secret names, purpose, source of truth, consumers, rotation cadence, status, and recovery notes.

## Purpose

This inventory supports Vault Control Room, Vault Audit, Runtime Binding Review, and Vault Recovery Review.

It documents secret names and runtime configuration needed for SaanaOS without storing secret values.

## Environments

Track:

- local
- preview
- production

## Source Systems

Expected source systems:

- Cloudflare Worker secrets
- Cloudflare dashboard/bindings
- Supabase project settings
- Stripe dashboard
- Twilio console
- Resend dashboard
- GitHub repository secrets/actions if used
- Google/Meta/WhatsApp provider consoles if used later
- approved password manager/vault

## Secret Inventory Table

| Project | Environment | Secret Name | Purpose | Secret Type | Source of Truth | Runtime Consumers | CI Consumers | Rotation Cadence | Last Rotated | Status | Recovery Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SaanaOS | local/preview/production | NEXT_PUBLIC_SUPABASE_URL | Public Supabase project URL for client and server helpers. | public runtime config | Supabase project settings / Cloudflare vars or secrets | Next.js app, Supabase client/server helpers, admin APIs | unknown | TBD | unknown | required | Must be documented as client-public, not secret. Confirm environment-specific project target. |
| SaanaOS | local/preview/production | NEXT_PUBLIC_SUPABASE_ANON_KEY | Public Supabase anon key for client-side Supabase access. | public runtime config | Supabase project settings / Cloudflare secrets | Supabase client/server helpers, checkout and phone verification flows | unknown | TBD | unknown | required | Public/non-secret by Supabase design, but review naming/exposure; NEXT_PUBLIC values are client-exposed and must not contain secrets. Rotate according to Supabase project policy. |
| SaanaOS | local/preview/production | SUPABASE_URL | Server-side Supabase project URL. | server runtime config | Supabase project settings / Cloudflare vars or secrets | Supabase admin helper, leads API, Supabase Edge Functions, legacy Worker | unknown | TBD | unknown | required | Confirm whether this duplicates NEXT_PUBLIC_SUPABASE_URL per environment. |
| SaanaOS | local/preview/production | SUPABASE_SERVICE_ROLE_KEY | Server-only privileged Supabase service-role access. | secret | Supabase project settings / approved vault / Cloudflare secrets | Admin APIs, server helpers, Supabase Edge Functions, legacy Worker | unknown | TBD | unknown | required | Server-only. Must never be exposed to client code. Recovery requires Supabase owner access. |
| SaanaOS | local/preview/production | RESEND_API_KEY | Resend API access for email delivery. | secret | Resend dashboard / approved vault / Cloudflare secrets | Resend helper, leads API, login link and onboarding email flows | unknown | TBD | unknown | required | Confirm production sender domain and owner. Missing value should fail only when email is used. |
| SaanaOS | local/preview/production | RESEND_FROM_EMAIL | Email sender identity for Resend flows. | provider config | Resend dashboard / Cloudflare secrets | Login link, platform auth, onboarding email flows | unknown | TBD | unknown | required | Confirm verified domain and fallback sender policy. |
| SaanaOS | local/preview/production | LEAD_ALERT_FROM_EMAIL | Sender identity for lead alert emails. | provider config | Resend dashboard / Cloudflare secrets | Leads API | unknown | TBD | unknown | optional | Confirm whether lead alerts are active in production. |
| SaanaOS | local/preview/production | LEAD_ALERT_TO_EMAIL | Destination for lead alert emails. | operational config | approved vault / Cloudflare secrets | Leads API | unknown | TBD | unknown | optional | Treat as sensitive contact routing data. Confirm owner and retention. |
| SaanaOS | local/preview/production | LEAD_ALERT_TO_PHONE | Destination for lead alert SMS or phone notifications. | operational config | approved vault / Cloudflare secrets | Leads API | unknown | TBD | unknown | optional | Treat as sensitive contact routing data. Confirm whether SMS alerts are enabled. |
| SaanaOS | local/preview/production | TWILIO_ACCOUNT_SID | Twilio account identifier for SMS, voice, and Verify. | provider credential | Twilio console / approved vault / Cloudflare secrets | Twilio SMS provider, Twilio Verify helper, Supabase SMS functions, legacy Worker | unknown | TBD | unknown | required | Confirm account owner and whether separate preview/prod accounts exist. |
| SaanaOS | local/preview/production | TWILIO_AUTH_TOKEN | Twilio API authentication token. | secret | Twilio console / approved vault / Cloudflare secrets | Twilio SMS provider, Twilio Verify helper, Supabase SMS functions, legacy Worker | unknown | TBD | unknown | required | Rotate from Twilio console. Must not appear in docs, logs, or client bundles. |
| SaanaOS | local/preview/production | TWILIO_FROM_NUMBER | Twilio sender phone number for SMS. | provider config | Twilio console / Cloudflare secrets | SMS provider, order status messaging, Supabase SMS functions, legacy Worker | unknown | TBD | unknown | required | Confirm A2P/consent status and production sender ownership. |
| SaanaOS | local/preview/production | TWILIO_VERIFY_SERVICE_SID | Twilio Verify service identifier for OTP flows. | provider config | Twilio console / Cloudflare secrets | Twilio Verify helper, auth OTP, phone verification APIs | unknown | TBD | unknown | required | Confirm service environment and OTP policy. |
| SaanaOS | local/preview/production | TWILIO_VOICE_CONSENT_TABLE | Table name used by Twilio voice consent route. | runtime config | Cloudflare secrets / Supabase schema docs | Twilio voice consent API | unknown | TBD | unknown | optional | Confirm table exists in each environment. |
| SaanaOS | local/preview/production | TWILIO_VOICE_CONSENT_SCHEMA | Schema name used by Twilio voice consent route. | runtime config | Cloudflare secrets / Supabase schema docs | Twilio voice consent API | unknown | TBD | unknown | optional | Confirm schema exists in each environment. |
| SaanaOS | local/preview/production | STRIPE_SECRET_KEY | Stripe API access for billing and checkout. | secret | Stripe dashboard / approved vault / Cloudflare secrets | Billing helper, checkout APIs, Stripe webhook route | unknown | TBD | unknown | required | Use environment-specific Stripe mode. Must remain server-only. |
| SaanaOS | local/preview/production | STRIPE_WEBHOOK_SECRET | Stripe webhook signing secret. | webhook signing secret | Stripe dashboard / approved vault / Cloudflare secrets | Stripe webhook route | unknown | TBD | unknown | required | Must match active production webhook endpoint. Rotate with webhook endpoint changes. |
| SaanaOS | unknown | NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Public Stripe publishable key if client-side Stripe checkout is enabled. | public runtime config | Stripe dashboard / Cloudflare Worker secrets or vars / approved vault | Detected by project map; direct runtime consumer needs confirmation | unknown | TBD | unknown | unknown | Public/non-secret by Stripe design when used as publishable key, but review naming/exposure; NEXT_PUBLIC values are client-exposed and must not contain secrets. Confirm whether this is active, generated-only, or removable. |
| SaanaOS | local/preview/production | STRIPE_PRICE_BASE_MONTHLY | Stripe price identifier for base monthly plan. | provider config | Stripe dashboard / Cloudflare secrets | Billing helper, subscription checkout APIs | unknown | TBD | unknown | required | Confirm price belongs to intended Stripe environment. |
| SaanaOS | local/preview/production | STRIPE_PRICE_PRO_MONTHLY | Stripe price identifier for pro monthly plan. | provider config | Stripe dashboard / Cloudflare secrets | Billing helper, subscription checkout APIs | unknown | TBD | unknown | required | Confirm price belongs to intended Stripe environment. |
| SaanaOS | local/preview/production | STRIPE_PRICE_PRO_PLUS_MONTHLY | Stripe price identifier for pro plus monthly plan. | provider config | Stripe dashboard / Cloudflare secrets | Billing helper, subscription checkout APIs | unknown | TBD | unknown | required | Confirm price belongs to intended Stripe environment. |
| SaanaOS | local/preview/production | STRIPE_PRICE_WEBSITE_SETUP | Stripe price identifier for website setup service. | provider config | Stripe dashboard / Cloudflare secrets | Billing helper, service checkout APIs | unknown | TBD | unknown | optional | Confirm service checkout remains active. |
| SaanaOS | local/preview/production | STRIPE_PRICE_USAGE_PACK | Stripe price identifier for usage pack. | provider config | Stripe dashboard / Cloudflare secrets | Billing helper, service checkout APIs | unknown | TBD | unknown | optional | Confirm service checkout remains active. |
| SaanaOS | local/preview/production | STRIPE_PRICE_ASSISTED_SUPPORT_MONTHLY | Stripe price identifier for assisted support add-on. | provider config | Stripe dashboard / Cloudflare secrets | Billing helper, service checkout APIs | unknown | TBD | unknown | optional | Confirm subscription or add-on policy. |
| SaanaOS | local/preview/production | STRIPE_PRICE_HOSTING_MONTHLY | Stripe price identifier for hosting add-on. | provider config | Stripe dashboard / Cloudflare secrets | Billing helper, service checkout APIs | unknown | TBD | unknown | optional | Confirm subscription or add-on policy. |
| SaanaOS | local/preview/production | STRIPE_PRICE_VIRTUAL_PHONE_MONTHLY | Stripe price identifier for virtual phone add-on. | provider config | Stripe dashboard / Cloudflare secrets | Billing helper, service checkout APIs | unknown | TBD | unknown | optional | Confirm subscription or add-on policy. |
| SaanaOS | local/preview/production | OPENAI_API_KEY | OpenAI API access for menu import, asset enhancement, and image generation features. | secret | OpenAI dashboard / approved vault / Cloudflare secrets | Admin menu import, asset enhance, promotion image generation routes | unknown | TBD | unknown | optional | Feature-specific. Confirm whether enabled in production and document spend controls. |
| SaanaOS | local/preview/production | OPENAI_IMAGE_MODEL | Model name for image generation/enhancement. | provider config | OpenAI dashboard / Cloudflare secrets | Asset enhance and promotion image generation routes | unknown | TBD | unknown | optional | Not a secret value, but must be environment-specific if behavior differs. |
| SaanaOS | local/preview/production | OPENAI_MENU_MODEL | Model name for menu import text generation. | provider config | OpenAI dashboard / Cloudflare secrets | Admin menu import route | unknown | TBD | unknown | optional | Not a secret value, but must be environment-specific if behavior differs. |
| SaanaOS | local/preview/production | OPENAI_TEXT_MODEL | Model name for text generation features. | provider config | OpenAI dashboard / Cloudflare secrets | Future or configured OpenAI text flows | unknown | TBD | unknown | unknown | Confirm whether still used. |
| SaanaOS | local/preview/production | CRON_SECRET | Shared secret for protected cron/test SMS endpoints. | secret | approved vault / Cloudflare secrets | Attempts cron API, admin messaging test API, docs/runbooks | unknown | TBD | unknown | required | Confirm caller locations and rotate if exposed in logs or docs. |
| SaanaOS | local/preview/production | ORDER_API_BASE_URL | Base URL fallback for order API forwarding when service binding is unavailable. | runtime config | Cloudflare secrets / deployment docs | Orders API | unknown | TBD | unknown | optional | Service binding appears configured for production; confirm whether this fallback is required for local/preview or can be removed. |
| SaanaOS | local/preview/production | NODE_ENV | Framework runtime mode used for production/local behavior branches. | runtime config | Next.js/Node runtime / deployment platform | Orders API, admin messaging test API, Supabase admin helper | unknown | TBD | unknown | required | Managed by runtime/build tooling; document expected production value by name only and do not store as a secret. |
| SaanaOS | unknown | NEXT_RUNTIME | Next.js runtime marker detected in generated/debug artifacts. | framework runtime config | Next.js/OpenNext runtime | Detected by project map; direct runtime consumer needs confirmation | unknown | TBD | unknown | unknown | Confirm whether this should be inventoried as framework-managed only or excluded from future Vault Audit comparisons. |
| SaanaOS | local/preview/production | NEXT_PUBLIC_API_BASE | Public API base for client calls. | public runtime config | Cloudflare secrets or vars / deployment docs | API helper | unknown | TBD | unknown | optional | Must be documented as client-public. Confirm active use. |
| SaanaOS | local/preview/production | NEXT_PUBLIC_APP_URL | Public app URL for redirects and links. | public runtime config | Cloudflare vars / deployment docs | Billing helper, app URL helper, admin menu UI | unknown | TBD | unknown | required | Must match deployed environment. |
| SaanaOS | local/preview/production | NEXT_PUBLIC_SITE_URL | Public site URL fallback. | public runtime config | Cloudflare vars / deployment docs | Billing helper, app URL helper | unknown | TBD | unknown | required | Must match deployed environment. |
| SaanaOS | local/preview/production | SITE_URL | Site URL for sitemap, robots, redirects, and billing fallback. | runtime config | Cloudflare vars / deployment docs | Sitemap, robots, app URL helper, billing helper | unknown | TBD | unknown | required | Confirm canonical production domain and preview equivalent. |
| SaanaOS | local/preview/production | PUBLIC_ORDER_BASE_URL | Public base URL for order and voice flows. | runtime config | Cloudflare vars / deployment docs | Twilio voice incoming and consent APIs | unknown | TBD | unknown | required | Confirm value matches public order domain per environment. |
| SaanaOS | local/preview/production | DEFAULT_RESTAURANT_ID | Default restaurant fallback identifier for voice consent flows. | runtime config | Supabase data / Cloudflare secrets | Twilio voice consent API | unknown | TBD | unknown | optional | Confirm fallback is intentional and tenant-safe. |
| SaanaOS | local/preview/production | DEFAULT_RESTAURANT_SLUG | Default restaurant fallback slug for voice consent flows. | runtime config | Supabase data / Cloudflare vars or secrets | Twilio voice consent API, Wrangler vars | unknown | TBD | unknown | optional | Confirm fallback is intentional and tenant-safe. |
| SaanaOS | local/preview/production | PLATFORM_ADMIN_EMAILS | Comma-separated platform admin allowlist. | access policy config | approved vault / Cloudflare secrets | Platform access helper | unknown | TBD | unknown | required | Review on team changes and contractor offboarding. |
| SaanaOS | local/preview/production | IPINFO_TOKEN | IPInfo API access for IP risk/geolocation features. | secret | IPInfo dashboard / approved vault / Cloudflare secrets | Platform IP geo helper, trust APIs | unknown | TBD | unknown | optional | Confirm feature is active and rate limits are acceptable. |
| SaanaOS | local/preview/production | IPINFO_BASE_URL | IPInfo API base URL override. | provider config | Cloudflare secrets / deployment docs | Platform IP geo helper | unknown | TBD | unknown | optional | Confirm override is needed; otherwise use provider default. |
| SaanaOS | local/preview/production | SMS_PROVIDER_OVERRIDE | Selects SMS provider implementation. | runtime config | Cloudflare secrets / deployment docs | SMS send helper | unknown | TBD | unknown | optional | Confirm production provider and fallback policy. |
| SaanaOS | local/preview/production | SMS_FALLBACK_TO_TWILIO | Enables Twilio fallback from alternate SMS provider. | runtime config | Cloudflare secrets / deployment docs | SMS send helper | unknown | TBD | unknown | optional | Confirm fallback is intended and compliance-reviewed. |
| SaanaOS | local/preview/production | SIGNALHOUSE_API_KEY | SignalHouse API access. | secret | SignalHouse dashboard / approved vault / Cloudflare secrets | SignalHouse SMS provider | unknown | TBD | unknown | optional | Optional/test provider unless production SMS routing uses SignalHouse. |
| SaanaOS | local/preview/production | SIGNALHOUSE_FROM_NUMBER | SignalHouse sender number. | provider config | SignalHouse dashboard / Cloudflare secrets | SignalHouse SMS provider | unknown | TBD | unknown | optional | Confirm A2P/consent status if active. |
| SaanaOS | local/preview/production | SIGNALHOUSE_BASE_URL | SignalHouse API base URL. | provider config | SignalHouse dashboard / Cloudflare secrets | SignalHouse SMS provider | unknown | TBD | unknown | optional | Confirm provider endpoint if active. |
| SaanaOS | local/preview/production | INTERNAL_FUNCTION_TOKEN | Shared token for Supabase function-to-function calls. | secret | approved vault / Supabase function secrets | Supabase voice webhook and order-link SMS function | unknown | TBD | unknown | required | Rotate if exposed. Confirm all Supabase functions share intended value by name only. |
| SaanaOS | local/preview/production | PUBLIC_BASE_URL | Public base URL used by Supabase order-link SMS function. | runtime config | Supabase function secrets / deployment docs | Supabase send-order-link-sms function | unknown | TBD | unknown | required | Confirm environment-specific public domain. |
| SaanaOS | local/preview/production | SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN | Supabase Auth SMS Twilio token. | secret | Supabase auth settings / Twilio console / approved vault | Supabase auth SMS integration if enabled | unknown | TBD | unknown | unknown | Confirm whether Supabase Auth SMS is active. |
| SaanaOS | local/preview/production | SUPABASE_AUTH_EXTERNAL_APPLE_SECRET | Supabase external Apple auth secret. | secret | Supabase auth settings / Apple developer console / approved vault | Supabase auth external provider if enabled | unknown | TBD | unknown | future | Confirm whether Apple auth is planned or active. |
| SaanaOS | local/preview/production | S3_SECRET_KEY | S3 storage secret for Supabase storage config if enabled. | secret | Storage provider / Supabase settings / approved vault | Supabase storage config if enabled | unknown | TBD | unknown | unknown | Confirm whether S3 storage integration is active. |
| SaanaOS | local/preview/production | APP_BASE_URL | Legacy Worker app base URL. | runtime config | Cloudflare vars or secrets / deployment docs | Legacy Worker | unknown | TBD | unknown | unknown | Confirm whether legacy Worker remains active. |
| SaanaOS | local/preview/production | SMS_COST_ESTIMATE | SMS usage cost estimate. | runtime config | deployment docs / code default | Usage metering helpers | unknown | TBD | unknown | optional | Not a secret. Confirm whether environment override exists. |

## Runtime Binding Inventory

| Project | Environment | Binding Name | Platform | Service/Worker | Expected Target | Actual Target | Status | Drift Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SaanaOS | production | web | Cloudflare Worker | worker/web | OpenNext SaanaOS web Worker | `worker/web/wrangler.jsonc` name `web` | required | Confirm deployed Worker matches production route. |
| SaanaOS | production | saanaos.com route | Cloudflare Worker route | worker/web | production apex domain route | configured in `worker/web/wrangler.jsonc` | required | Confirm Cloudflare dashboard route points to `web`. |
| SaanaOS | production | www.saanaos.com route | Cloudflare Worker route | worker/web | production www domain route | configured in `worker/web/wrangler.jsonc` | required | Confirm Cloudflare dashboard route points to `web`. |
| SaanaOS | production | ASSETS | Cloudflare assets binding | worker/web | `.open-next/assets` output | configured in `worker/web/wrangler.jsonc` | required | Confirm OpenNext build output exists before deploy. |
| SaanaOS | production | WORKER_SELF_REFERENCE | Cloudflare service binding | worker/web | `web` Worker | configured in `worker/web/wrangler.jsonc` | required | Confirm self-reference binding remains required by OpenNext. |
| SaanaOS | production | ORDER_API_SERVICE | Cloudflare service binding | worker/web | `authtoolkit` Worker | configured in `worker/web/wrangler.jsonc` | required | Drift risk if `authtoolkit` Worker is deprecated or points to wrong environment. |
| SaanaOS | production | IMAGES | Cloudflare Images binding | worker/web | Cloudflare Images service | configured in `worker/web/wrangler.jsonc` | optional | Confirm image features require this binding in production. |
| SaanaOS | production | authtoolkit | Cloudflare Worker | worker | legacy/order API Worker | configured in `worker/wrangler.jsonc` | unknown | Confirm whether this Worker is active, legacy, or required by `ORDER_API_SERVICE`. |
| SaanaOS | production | Supabase project target | Supabase | web app and Supabase functions | production Supabase project | unknown from repo without provider dashboard | required | Confirm local/preview/prod project separation. |
| SaanaOS | production | Stripe webhook target | Stripe dashboard | `/api/stripe/webhook` | production SaanaOS Stripe webhook endpoint | unknown from repo without provider dashboard | required | Must match `STRIPE_WEBHOOK_SECRET`. |
| SaanaOS | production | Twilio Verify provider | Twilio console | Twilio Verify helper | production Twilio Verify service | unknown from repo without provider dashboard | required | Must match `TWILIO_VERIFY_SERVICE_SID`. |
| SaanaOS | production | Twilio voice incoming webhook | Twilio console | `/api/twilio/voice/incoming` | production voice webhook URL | unknown from repo without provider dashboard | optional | Confirm active phone numbers and callback URLs. |
| SaanaOS | production | Twilio voice consent webhook | Twilio console | `/api/twilio/voice/consent` | production consent callback URL | unknown from repo without provider dashboard | optional | Confirm callback URL and signature validation strategy. |
| SaanaOS | production | Resend email provider | Resend dashboard | Resend helper and email routes | verified production sending domain | unknown from repo without provider dashboard | required | Confirm sender identities and domain verification. |
| SaanaOS | production | OpenNext output | OpenNext/Cloudflare | worker/web | `.open-next/worker.js` | configured in `worker/web/wrangler.jsonc` | required | Confirm build command runs before deploy. |
| SaanaOS | production | Queue/R2/D1/KV bindings | Cloudflare | worker/web | none expected from repo | none found in Wrangler config | optional | Add inventory rows if future bindings are introduced. |

## Required Production Secrets

The following names appear required for production deploy/runtime or core production features:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- RESEND_FROM_EMAIL
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_FROM_NUMBER
- TWILIO_VERIFY_SERVICE_SID
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_BASE_MONTHLY
- STRIPE_PRICE_PRO_MONTHLY
- STRIPE_PRICE_PRO_PLUS_MONTHLY
- CRON_SECRET
- NEXT_PUBLIC_APP_URL
- NEXT_PUBLIC_SITE_URL
- SITE_URL
- PUBLIC_ORDER_BASE_URL
- PLATFORM_ADMIN_EMAILS
- INTERNAL_FUNCTION_TOKEN
- PUBLIC_BASE_URL
- NODE_ENV

## Optional/Future Provider Secrets

The following names appear optional, feature-specific, legacy, or future until confirmed:

- LEAD_ALERT_FROM_EMAIL
- LEAD_ALERT_TO_EMAIL
- LEAD_ALERT_TO_PHONE
- TWILIO_VOICE_CONSENT_TABLE
- TWILIO_VOICE_CONSENT_SCHEMA
- STRIPE_PRICE_WEBSITE_SETUP
- STRIPE_PRICE_USAGE_PACK
- STRIPE_PRICE_ASSISTED_SUPPORT_MONTHLY
- STRIPE_PRICE_HOSTING_MONTHLY
- STRIPE_PRICE_VIRTUAL_PHONE_MONTHLY
- OPENAI_API_KEY
- OPENAI_IMAGE_MODEL
- OPENAI_MENU_MODEL
- OPENAI_TEXT_MODEL
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- NEXT_RUNTIME
- ORDER_API_BASE_URL
- NEXT_PUBLIC_API_BASE
- DEFAULT_RESTAURANT_ID
- DEFAULT_RESTAURANT_SLUG
- IPINFO_TOKEN
- IPINFO_BASE_URL
- SMS_PROVIDER_OVERRIDE
- SMS_FALLBACK_TO_TWILIO
- SIGNALHOUSE_API_KEY
- SIGNALHOUSE_FROM_NUMBER
- SIGNALHOUSE_BASE_URL
- SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN
- SUPABASE_AUTH_EXTERNAL_APPLE_SECRET
- S3_SECRET_KEY
- APP_BASE_URL
- SMS_COST_ESTIMATE

## Inventory Items Not Detected In Code

Not detected in code does not automatically mean unused. Some secrets live only in provider dashboards, webhooks, Cloudflare, Supabase function settings, CI, or future integrations.
Not detected in code does not mean unused. Do not delete secrets or provider configuration from this list without owner confirmation, provider dashboard review, runtime verification, and evidence.

| Secret Name | Classification | Reason | Recommended Next Action | Deletion Status |
| --- | --- | --- | --- | --- |
| APP_BASE_URL | unknown | Legacy Worker runtime config may not be referenced by the current web app scan. | Confirm source of truth, active environment, and runtime consumer. | do_not_delete |
| INTERNAL_FUNCTION_TOKEN | supabase-function-only | Used for Supabase function-to-function calls and may live only in Supabase function settings. | Confirm Supabase function settings and document active environments. | do_not_delete |
| LEAD_ALERT_FROM_EMAIL | optional | Lead alert sender configuration may only be used when lead alerts are enabled. | Confirm whether lead alerts are active and document owner/source of truth. | do_not_delete |
| LEAD_ALERT_TO_EMAIL | optional | Lead alert destination configuration may only be used when lead alerts are enabled. | Confirm whether lead email alerts are active and document owner/source of truth. | do_not_delete |
| LEAD_ALERT_TO_PHONE | optional | Lead alert phone destination may only be used when SMS or phone lead alerts are enabled. | Confirm whether lead SMS/phone alerts are active and document owner/source of truth. | do_not_delete |
| OPENAI_TEXT_MODEL | future | Listed for future or configured OpenAI text flows not currently detected in scanned code. | Confirm whether future text-generation flows still need this name. | do_not_delete |
| PUBLIC_BASE_URL | supabase-function-only | Supabase order-link SMS function may use this from Supabase function settings. | Confirm Supabase function environment variables and active callback URLs. | do_not_delete |
| PUBLIC_ORDER_BASE_URL | cloudflare-only | Cloudflare runtime config may be supplied through Wrangler vars and used by voice/order flows. | Confirm Cloudflare production and preview vars match expected public order domain. | do_not_delete |
| S3_SECRET_KEY | unknown | Supabase storage/S3 config candidate is present in Supabase config but active usage is unclear. | Confirm source of truth, active environment, and runtime consumer. | do_not_delete |
| SMS_COST_ESTIMATE | optional | Usage metering cost estimate may be a code default or optional runtime override, not a secret. | Confirm whether an environment override exists or should be removed from inventory later. | do_not_delete |
| STRIPE_PRICE_ASSISTED_SUPPORT_MONTHLY | stripe-price-config | Stripe price identifier may be managed in Stripe dashboard or Cloudflare config rather than direct code references. | Confirm price exists in the intended Stripe environment and billing catalog. | do_not_delete |
| STRIPE_PRICE_BASE_MONTHLY | stripe-price-config | Stripe price identifier may be managed in Stripe dashboard or Cloudflare config rather than direct code references. | Confirm price exists in the intended Stripe environment and billing catalog. | do_not_delete |
| STRIPE_PRICE_HOSTING_MONTHLY | stripe-price-config | Stripe price identifier may be managed in Stripe dashboard or Cloudflare config rather than direct code references. | Confirm price exists in the intended Stripe environment and billing catalog. | do_not_delete |
| STRIPE_PRICE_PRO_MONTHLY | stripe-price-config | Stripe price identifier may be managed in Stripe dashboard or Cloudflare config rather than direct code references. | Confirm price exists in the intended Stripe environment and billing catalog. | do_not_delete |
| STRIPE_PRICE_PRO_PLUS_MONTHLY | stripe-price-config | Stripe price identifier may be managed in Stripe dashboard or Cloudflare config rather than direct code references. | Confirm price exists in the intended Stripe environment and billing catalog. | do_not_delete |
| STRIPE_PRICE_USAGE_PACK | stripe-price-config | Stripe price identifier may be managed in Stripe dashboard or Cloudflare config rather than direct code references. | Confirm price exists in the intended Stripe environment and billing catalog. | do_not_delete |
| STRIPE_PRICE_VIRTUAL_PHONE_MONTHLY | stripe-price-config | Stripe price identifier may be managed in Stripe dashboard or Cloudflare config rather than direct code references. | Confirm price exists in the intended Stripe environment and billing catalog. | do_not_delete |
| STRIPE_PRICE_WEBSITE_SETUP | stripe-price-config | Stripe price identifier may be managed in Stripe dashboard or Cloudflare config rather than direct code references. | Confirm price exists in the intended Stripe environment and billing catalog. | do_not_delete |
| SUPABASE_AUTH_EXTERNAL_APPLE_SECRET | future | Supabase external Apple auth provider secret is inventoried for a possible auth provider integration. | Confirm whether Apple auth is planned or active in Supabase auth settings. | do_not_delete |
| SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN | provider-dashboard-only | Supabase Auth SMS integration may store this in Supabase auth settings instead of app code. | Confirm whether Supabase Auth SMS is active and document Twilio/Supabase ownership. | do_not_delete |

## Recovery Checklist

- Can a new laptop identify all required env var names?
- Are actual values stored outside Git in approved vault/provider consoles?
- Can CI/deploy work without one local machine?
- Are Cloudflare production secrets present by name?
- Are webhook signing secrets documented by name?
- Are old keys/unused secrets known and removable?
- Is emergency access documented?

## Open Questions

- Which secrets are required for production versus optional features?
- Where is the approved password manager/vault?
- Who owns each provider account?
- What is the rotation cadence?
- Which secrets are used only locally?
- Which provider webhooks are active in production?
- Which secrets can be removed?
- Is the root `authtoolkit` Worker still active or legacy?
- Should preview use separate Supabase, Stripe, Twilio, Resend, and OpenAI provider targets?
- Which GitHub repository secrets/actions are required for CI/CD, if any?
