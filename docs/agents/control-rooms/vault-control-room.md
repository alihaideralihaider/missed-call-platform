# Vault Control Room

## Purpose

Vault Control Room manages secrets, env vars, runtime bindings, rotation, environment drift, runtime validation, access policies, recovery, rollback, and evidence.

It extends AuthToolkit Dev Integrity beyond code review. Integrity is not only code integrity. It also includes secret integrity, runtime integrity, environment integrity, deploy integrity, and recovery integrity.

## Why It Exists

Secrets and runtime configuration cannot live only on one laptop, one server, or in founder memory.

The operational lesson is simple:

- local machine secrets can be lost
- production may still work while local development is broken
- secrets may exist across Cloudflare, GitHub, Supabase, Stripe, Twilio, Resend, Google, Meta/WhatsApp, Tailscale, and other systems
- founder memory is not a reliable recovery system

Vault Control Room gives every project a documented, recoverable, auditable secrets and runtime strategy without storing raw secret values in Git.

## Scope

Vault Control Room covers:

- secret inventory
- env variable inventory
- runtime bindings
- CI/CD secrets
- Cloudflare Worker secrets
- Supabase keys
- Stripe keys and webhook secrets
- Twilio keys and webhook secrets
- Resend and email provider secrets
- WhatsApp/Meta app credentials
- OAuth credentials
- remote access credentials
- deployment tokens
- webhook signing secrets

## Out of Scope For Now

- compliance dashboard
- runtime control room dashboard
- customer-facing dashboard
- automatic key rotation
- secret value storage inside Git

## Core Objects

### Secret Record

Fields:

- project
- environment
- secret_name
- purpose
- secret_type
- owner
- source_of_truth
- runtime_consumers
- ci_consumers
- rotation_cadence
- last_rotated_at
- next_rotation_due
- recovery_notes
- status

### Runtime Binding Record

Fields:

- project
- environment
- binding_name
- platform
- service_or_worker
- expected_target
- actual_target
- status
- drift_notes

### Rotation Event

Fields:

- secret_name
- old_key_revoked
- new_key_deployed
- verification_status
- rotated_by
- rotated_at
- evidence_link
- rollback_notes

### Recovery Check

Fields:

- project
- machine_independent
- documented_inventory_exists
- ci_can_deploy_without_local_machine
- emergency_access_documented
- missing_recovery_items
- recovery_score

## Control Room Checks

Vault Control Room should answer:

- required secret names exist
- no raw secret values are committed
- no secrets are pasted in docs, issues, PRs, screenshots, tickets, or chats
- production and preview envs match expected inventory
- Cloudflare bindings match expected services
- webhook signing secrets exist
- old keys are revoked after rotation
- service-role keys are server-only
- local development can be bootstrapped safely
- CI can deploy without depending on one machine
- recovery procedure is documented

## Integrity Score

Future score sections:

- Vault Integrity
- Runtime Drift
- Rotation Health
- Recovery Readiness
- Access Hygiene
- Evidence Completeness

The score should measure operational recoverability and runtime correctness. It should not require storing raw secret values in AuthToolkit, the repo, or any generated documentation.

## Future Dashboard Placeholder

Potential future dashboard surfaces:

- Vault Control Room
- Vault Audit Timeline
- Runtime Drift Panel
- Rotation Health Panel
- Recovery Readiness Score
- Access Hygiene Panel

This document is documentation-first only. Do not build dashboards, database tables, UI, runtime logic, or automatic secret rotation until explicitly requested.
