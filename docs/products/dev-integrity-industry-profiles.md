# AuthToolkit Dev Integrity Industry Profiles

Purpose: document the broader set of industries and project profiles AuthToolkit Dev Integrity could eventually support, while clearly stating that initial development will focus only on three profiles.

## Current Development Focus

For this round of development until go-live, focus only on:

1. SaaS Apps
2. Restaurant Tech / Local Commerce
3. Agency Websites / GoHighLevel-style Operators

All other profiles are future expansion candidates and should not distract current implementation.

## Profile Template

For each profile include:

- Who it serves
- Common systems
- Main risks
- Suggested review packs
- Example findings AuthToolkit could catch

## Profiles

### 1. SaaS Apps

Who it serves:

- SaaS founders
- B2B tools
- AI-coded apps
- subscription software
- multi-tenant dashboards

Common systems:

- auth/login
- admin dashboards
- subscriptions
- billing
- APIs
- webhooks
- customer data
- team roles

Main risks:

- auth bypass
- tenant-boundary failures
- exposed APIs
- leaked env vars
- weak webhook verification
- billing/payment state bugs
- service-role misuse
- production deploy regressions

Suggested review packs:

- Auth & Session Review
- Tenant Boundary Review
- API & Exposure Audit
- Secrets & Env Review
- Payments & Webhooks Review
- Database/RLS Review
- Deploy Canary

Example findings:

- Admin API trusts slug before tenant authorization.
- NEXT_PUBLIC variable looks like a secret.
- Stripe webhook route changed without signature verification.

### 2. Restaurant Tech / Local Commerce

Who it serves:

- restaurant ordering systems
- QR ordering platforms
- missed-call ordering
- pickup/delivery tools
- local commerce apps

Common systems:

- menu management
- QR/hub pages
- ordering
- payments
- SMS/WhatsApp
- restaurant admin
- kitchen flow
- customer phone numbers

Main risks:

- customer/order data exposure
- restaurant admin cross-tenant access
- SMS consent mistakes
- payment mismatch
- menu/order state bugs
- QR route abuse
- pickup status confusion

Suggested review packs:

- Restaurant UX Review
- Order Flow Review
- Payment Integrity Review
- SMS/Consent Review
- Tenant Boundary Review
- Admin API Review
- QR/Hub Route Review
- Deploy Canary

Example findings:

- User A can access Restaurant B admin API by changing slug.
- Checkout marks order paid before provider webhook confirms.
- SMS opt-in is preselected.

### 3. Agency Websites / GoHighLevel-style Operators

Who it serves:

- marketing agencies
- funnel builders
- GoHighLevel operators
- landing page builders
- non-technical business operators
- social media/reel-driven builders

Common systems:

- landing pages
- forms
- webhooks
- CRM integrations
- tracking pixels
- calendars
- lead routing
- automations
- payment links

Main risks:

- exposed lead forms
- webhooks sending data to wrong destination
- missing consent language
- tracking script leakage
- public admin links
- exposed API keys
- unsafe redirects
- broken lead routing
- client data exposure

Suggested review packs:

- Lead Capture Integrity Review
- Form/Webhook Review
- Tracking Script Review
- Public Exposure Audit
- Consent/Privacy Review
- Client Handoff Review
- SEO/Performance Basic Review
- Deploy Canary

Example findings:

- Lead form posts to unauthenticated public endpoint.
- Phone number collection has no consent language.
- Client API key appears in page JavaScript.

### 4. E-commerce

Who it serves:

- Shopify apps
- WooCommerce stores
- custom storefronts
- marketplace sellers
- direct-to-consumer brands

Common systems:

- product catalog
- cart/checkout
- payment providers
- order webhooks
- shipping integrations
- discounts
- customer accounts
- abandoned cart flows

Main risks:

- payment state mismatch
- discount abuse
- order webhook spoofing
- customer data leakage
- inventory race conditions
- unsafe refund flow
- exposed admin APIs

Suggested review packs:

- Checkout Integrity Review
- Payment/Webhook Review
- Discount/Promo Abuse Review
- Customer Data Review
- Order State Review
- API Exposure Audit

Example findings:

- Success page marks order paid without webhook.
- Discount code can be stacked beyond allowed rules.
- Refund API lacks admin authorization.

### 5. Fintech / Payments

Who it serves:

- payment apps
- invoicing tools
- marketplace platforms
- lending tools
- wallets
- payout systems

Common systems:

- payment intents
- ledgers
- bank feeds
- KYC/KYB
- payouts
- transfers
- disputes
- reconciliation

Main risks:

- ledger mismatch
- webhook trust failure
- payout misrouting
- double charge/refund
- weak idempotency
- sensitive financial data exposure
- unclear negative balance ownership

Suggested review packs:

- Ledger Integrity Review
- Payment State Review
- Webhook Verification Review
- Payout/Transfer Review
- Reconciliation Review
- Financial Data Exposure Audit

Example findings:

- Payment confirmed from redirect instead of provider webhook.
- Transfer created without storing connected account ID.
- Duplicate webhook can update ledger twice.

### 6. Healthcare / Wellness

Who it serves:

- clinics
- telehealth apps
- appointment systems
- patient portals
- wellness platforms

Common systems:

- patient records
- appointments
- intake forms
- messaging
- provider dashboards
- payments
- insurance placeholders

Main risks:

- health data exposure
- weak role access
- appointment privacy leaks
- insecure forms
- messaging consent problems
- audit trail gaps
- data retention issues

Suggested review packs:

- Sensitive Data Exposure Review
- Role Access Review
- Form Privacy Review
- Messaging Consent Review
- Audit Trail Review
- Environment Exposure Audit

Example findings:

- Patient intake response returned to unauthenticated route.
- Provider dashboard trusts URL patient ID.
- Sensitive form payload logged to console.

### 7. Legal / Professional Services

Who it serves:

- law firms
- accountants
- consultants
- document portals
- client intake tools

Common systems:

- client portals
- intake forms
- document uploads
- billing
- appointment booking
- signatures
- messaging

Main risks:

- confidential document exposure
- client boundary failure
- insecure uploads
- billing/payment issues
- unsafe email notifications
- weak admin roles

Suggested review packs:

- Client Boundary Review
- Document Exposure Audit
- Upload Security Review
- Billing Review
- Notification Privacy Review

Example findings:

- Uploaded client file accessible without signed URL.
- Consultant can access another client workspace by changing ID.
- Email notification includes confidential content.

### 8. Real Estate / Property Management

Who it serves:

- landlords
- property managers
- tenant portals
- maintenance platforms
- rental marketplaces

Common systems:

- tenant accounts
- leases
- maintenance requests
- payments
- documents
- property dashboards
- notifications

Main risks:

- tenant/property boundary failure
- lease document exposure
- payment mismatch
- maintenance request privacy issues
- unsafe file uploads
- weak staff roles

Suggested review packs:

- Tenant/Property Boundary Review
- Document Exposure Audit
- Payment Review
- Maintenance Workflow Review
- Role Access Review

Example findings:

- Tenant can access another property's lease by changing ID.
- Maintenance notes expose private tenant phone numbers.
- Rent payment marked complete before provider confirmation.

### 9. Education / EdTech

Who it serves:

- schools
- tutors
- LMS platforms
- course creators
- student portals

Common systems:

- student accounts
- courses
- assignments
- grades
- payments
- messaging
- parent/teacher roles

Main risks:

- student data exposure
- role boundary mistakes
- grade/assignment privacy leaks
- payment bugs
- unsafe file uploads
- messaging consent issues

Suggested review packs:

- Student Data Review
- Role Access Review
- Content Access Review
- Payment Review
- Messaging Review

Example findings:

- Student can access another class by changing course ID.
- Parent role can see unrelated student data.
- Assignment upload endpoint lacks authorization.

### 10. Logistics / Field Services

Who it serves:

- delivery companies
- pest control
- cleaning services
- HVAC
- dispatch platforms
- technician apps

Common systems:

- dispatch boards
- technician apps
- customer records
- job status
- quotes/invoices
- messaging
- maps/location

Main risks:

- customer/job data exposure
- technician role boundary failure
- unsafe status updates
- invoice/payment mismatch
- location privacy issues
- WhatsApp/SMS compliance issues

Suggested review packs:

- Job Boundary Review
- Technician Role Review
- Customer Data Exposure Audit
- Messaging Compliance Review
- Invoice/Payment Review
- Dispatch Workflow Review

Example findings:

- Technician can update jobs not assigned to them.
- Customer phone number exposed in public route.
- Invoice status updated without payment confirmation.

### 11. Nonprofits / Donations

Who it serves:

- nonprofits
- churches
- community organizations
- fundraising platforms
- donation pages

Common systems:

- donation forms
- donor records
- recurring payments
- campaign pages
- receipts
- email/SMS follow-up

Main risks:

- donor data exposure
- payment receipt mismatch
- recurring donation state bugs
- unsafe campaign admin access
- missing consent language
- webhook trust issues

Suggested review packs:

- Donation Payment Review
- Donor Data Review
- Campaign Admin Review
- Messaging Consent Review
- Webhook Review

Example findings:

- Donation marked complete before provider confirmation.
- Donor list API has no admin authorization.
- SMS thank-you flow lacks opt-out language.

### 12. Marketplaces

Who it serves:

- two-sided marketplaces
- service marketplaces
- vendor platforms
- creator marketplaces

Common systems:

- buyers/sellers
- listings
- marketplace payments
- payouts
- disputes
- messaging
- reviews

Main risks:

- buyer/seller data crossing
- payout errors
- dispute state bugs
- listing ownership bypass
- review abuse
- messaging privacy issues

Suggested review packs:

- Marketplace Boundary Review
- Payout/Transfer Review
- Listing Ownership Review
- Dispute Workflow Review
- Messaging Privacy Review

Example findings:

- Seller can edit another seller's listing by changing listing ID.
- Payout transfer does not map to connected account.
- Buyer can view private seller payout data.

### 13. AI Apps / Agent Platforms

Who it serves:

- AI SaaS apps
- agent platforms
- prompt/workflow builders
- AI automation products

Common systems:

- prompts
- tools
- API keys
- agent memory
- user workspaces
- file uploads
- executions
- webhooks

Main risks:

- prompt/tool injection
- API key leakage
- cross-workspace memory leakage
- unsafe tool execution
- exposed uploaded files
- agent takes action without approval
- hallucinated config changes

Suggested review packs:

- Agent Tool Safety Review
- Workspace Boundary Review
- API Key Exposure Audit
- Memory/Data Boundary Review
- Approval Gate Review
- File Exposure Audit

Example findings:

- Agent tool can call external webhook without approval.
- Workspace A can read Workspace B memory.
- Uploaded file URL is publicly accessible.

## First Build Scope

Only the first three profiles are in scope for current development:

- SaaS Apps
- Restaurant Tech / Local Commerce
- Agency Websites / GoHighLevel-style Operators

## Future Note

These profiles are starting templates. Customers may combine profiles, such as:

- SaaS + payments
- agency website + lead capture + SMS
- marketplace + payouts
- restaurant tech + local commerce + SMS
