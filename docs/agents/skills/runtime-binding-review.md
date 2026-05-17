# Runtime Binding Review

## Purpose

Review whether runtime bindings, provider targets, service bindings, and deployed environment wiring match the expected project inventory.

## When To Run

Run this skill when:

- changing wrangler config
- changing OpenNext or Cloudflare deployment
- adding Cloudflare service bindings
- adding queue, R2, D1, KV, bucket, or Durable Object bindings
- changing Worker names or routes
- changing webhook URLs
- changing Supabase project alignment
- changing provider endpoint configuration

## Inputs

- git diff
- deployment config
- expected runtime binding inventory
- provider dashboard notes for webhook URLs and project IDs
- environment names and deployment targets
- Cloudflare, Supabase, Stripe, Twilio, Resend, Meta/WhatsApp, Google, or GitHub integration notes

Do not collect or print secret values.

## Checks

- Cloudflare Worker bindings match expected services
- service bindings point to the expected Worker or service target
- Supabase project references match the intended environment
- Stripe, Twilio, Resend, Meta/WhatsApp, and OAuth callback URLs match expected routes
- production, preview, staging, and local targets are not accidentally crossed
- webhook endpoints align with deployed routes
- queue, R2, D1, KV, and bucket bindings use expected environment-specific resources
- runtime drift is documented with status and remediation notes
- wrong Worker, wrong project, or wrong provider target risks are surfaced

## Findings Format

Use this format:

- Severity: Critical, High, Medium, Low
- Area: Runtime Binding
- Binding or provider target: name only, never secret value
- Expected target: documented target
- Observed or changed target: observed target if available
- Risk: practical runtime impact
- Required action: validation, config correction, or provider update

## Pass Examples

- Production Worker route points to the expected Worker.
- Supabase production keys and URLs reference the production project, not preview.
- Stripe webhook URL matches the deployed production route.

## Fail Examples

- A production Worker points at a preview service binding.
- A Twilio webhook URL targets an old domain.
- An R2 bucket binding name changed without inventory or recovery notes.
- Supabase project alignment is unknown after an env change.

## Follow-Up Actions

- Correct wrong bindings or provider target configuration.
- Update the runtime binding record.
- Rerun affected build, deployment, webhook, and post-deploy canary checks.
- Record any environment drift and rollback notes.
