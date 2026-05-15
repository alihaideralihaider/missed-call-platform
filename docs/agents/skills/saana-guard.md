# saana-guard

Purpose: block risky behavior before implementation.

Use this before editing when a task touches production behavior, data, auth, messaging, payments, deployment, or a broad refactor.

## Guardrails

- Do not expose secrets, tokens, credentials, private URLs, customer data, or order data.
- Do not edit outside intended paths without explaining why the additional path is necessary.
- Do not make destructive database changes without explicit approval.
- Do not deploy production without build/test review and a rollback path.
- Do not change SMS, consent, Twilio, IVR, or payment logic without the required special review.
- Do not bypass auth, Supabase RLS, admin checks, webhook verification, or other security controls.
- Do not perform large refactors unless the user explicitly requested them.
- Do not change app behavior while doing documentation or workflow scaffolding work.

## Output

State any blocked action, approval needed, or special review required before implementation continues.
