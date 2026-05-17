# Vault Audit

Vault Audit is the evidence and review layer for Vault Control Room.

It verifies whether secrets, env vars, runtime bindings, rotation events, and recovery procedures are documented, safe, and recoverable without exposing secret values.

## Leak Audit

Question being answered:

- Was a secret exposed in Git, logs, screenshots, tickets, chats, local files, generated docs, or review evidence?

Evidence needed:

- git diff and recent commit scan
- ignored file review
- generated evidence review
- log and screenshot handling notes
- list of affected secret names only, never values

Pass examples:

- `.env` values are not committed.
- Documentation lists only secret names and purpose.
- Review evidence redacts secret values.

Fail examples:

- A raw API key appears in Git history.
- A screenshot includes a visible token.
- A ticket or chat includes a webhook signing secret.

Remediation actions:

- remove the exposed value from active files
- rotate the exposed secret at its source system
- revoke the old key
- verify production and CI use the replacement
- record rotation evidence without storing the value

## Access Audit

Question being answered:

- Who can view, change, rotate, deploy, or recover each secret and runtime binding?

Evidence needed:

- source-of-truth vault or password manager ownership
- Cloudflare, GitHub, Supabase, Stripe, Twilio, Resend, Meta, Google, and remote access account roles
- emergency access notes
- contractor or agency access status

Pass examples:

- Production secrets are limited to approved admins.
- Contractors have scoped access and offboarding notes.
- Emergency access is documented outside one laptop.

Fail examples:

- Only one founder knows where production secrets live.
- Former contractor access remains active.
- CI deploy token owner is unknown.

Remediation actions:

- remove stale users
- document owners
- move secrets to approved vault systems
- set least-privilege access
- record offboarding evidence

## Rotation Audit

Question being answered:

- Was the new key deployed, was the old key revoked, and was production verified after rotation?

Evidence needed:

- rotation event record
- source system key status
- deployment or secret update evidence
- post-rotation smoke test results
- rollback notes

Pass examples:

- New key is deployed to production and preview.
- Old key is revoked.
- Webhook or API flow was verified after rotation.

Fail examples:

- New key was created but old key remains active indefinitely.
- Production deploy was not verified after rotation.
- Rotation happened on a laptop but was never reflected in CI or Cloudflare.

Remediation actions:

- deploy the new key to all required environments
- revoke the old key
- rerun affected provider checks
- update the secret inventory
- document rollback path

## Runtime Usage Audit

Question being answered:

- Which service consumes this secret, is it still active, and is it orphaned?

Evidence needed:

- secret inventory
- env var usage map
- Cloudflare Worker bindings
- CI/CD secret usage
- route, webhook, and provider consumer list

Pass examples:

- Each secret has named runtime and CI consumers.
- Unused secrets are removed or marked deprecated.
- Server-only secrets are not exposed to client builds.

Fail examples:

- A service-role key has unknown consumers.
- A webhook signing secret exists but no route uses it.
- A client-public env var looks secret-like.

Remediation actions:

- map consumers
- remove orphaned secrets
- rename ambiguous env vars
- move server-only secrets out of client exposure
- add missing webhook verification notes

## Revocation Evidence

Question being answered:

- Can the team prove that retired, leaked, or replaced credentials are no longer usable?

Evidence needed:

- source system revocation status
- timestamp of revocation
- rotated_by identity
- affected environments
- verification result

Pass examples:

- Old Stripe webhook secret is disabled after migration.
- Old deployment token is revoked after CI replacement.
- Revocation evidence links to a rotation event.

Fail examples:

- Old keys remain active because nobody knows whether they are still used.
- Revocation was assumed but not verified.

Remediation actions:

- confirm active key list in the provider
- revoke obsolete keys
- verify runtime after revocation
- update rotation and recovery records

## Recovery Audit

Question being answered:

- Could a new laptop or server rebuild the project safely without founder memory?

Evidence needed:

- documented secret inventory
- source-of-truth vault location
- local bootstrap notes
- CI deploy requirements
- emergency access procedure
- missing recovery item list

Pass examples:

- A new developer can identify required secret names without seeing values.
- CI can deploy without a founder laptop.
- Emergency access and owner escalation are documented.

Fail examples:

- Production works but no one can rebuild local development.
- Required env vars are only known from shell history.
- Deploy depends on one machine or one unstored token.

Remediation actions:

- create or update inventory
- move values into approved vault/password manager
- document bootstrap procedure
- document emergency access
- test machine-independent recovery

## Audit Timeline

Question being answered:

- What changed, when, who changed it, what evidence exists, and what risk remains?

Evidence needed:

- inventory updates
- rotation events
- access changes
- binding drift findings
- recovery checks
- post-change verification

Pass examples:

- Secret rotation has a date, owner, evidence link, and verification status.
- Binding drift is recorded with remediation notes.

Fail examples:

- A key changed but no one knows why.
- Runtime target changed without evidence or rollback notes.

Remediation actions:

- record the event
- attach evidence
- rerun the affected Vault skills
- document remaining risks
