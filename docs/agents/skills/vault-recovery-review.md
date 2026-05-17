# Vault Recovery Review

## Purpose

Review whether a project can be recovered, bootstrapped, and deployed from a fresh machine or replacement server without relying on founder memory or one local environment.

## When To Run

Run this skill when:

- setting up a new machine
- changing deployment workflow
- changing required local env vars
- changing password manager or vault process
- onboarding contractors or new developers
- changing emergency access, ownership, or provider account structure

## Inputs

- secret inventory
- local bootstrap documentation
- deployment documentation
- CI/CD secret requirements
- approved vault or password manager location names
- emergency access procedure
- owner and escalation notes

Do not collect or print raw secret values.

## Checks

- fresh machine bootstrap can identify all required secret names
- actual values live in a recoverable vault, password manager, provider console, or CI/CD secret store
- CI can deploy without depending on one laptop
- emergency access is documented
- project owners and recovery contacts are known
- optional providers are clearly marked optional
- required production providers are clearly marked required
- missing recovery items are listed
- local development setup does not require undocumented shell history or founder memory

## Findings Format

Use this format:

- Severity: Critical, High, Medium, Low
- Area: Recovery Integrity
- Recovery dependency: machine, CI, provider, vault, owner, or bootstrap docs
- Evidence: documentation path or missing inventory item
- Risk: practical recovery failure
- Required action: smallest documentation or process fix

## Pass Examples

- A new developer can find every required env var name and its source of truth without seeing values.
- CI can deploy from documented secrets without a founder laptop.
- Emergency provider access and owner escalation are documented.

## Fail Examples

- Production works, but local development cannot be rebuilt because required secrets exist only on one laptop.
- Deploy depends on a token stored only in one shell profile.
- No one knows who owns the Stripe, Twilio, Cloudflare, or Supabase credentials.

## Follow-Up Actions

- Update the secret inventory.
- Move values into the approved vault or provider secret store.
- Document bootstrap and recovery steps.
- Test a fresh-machine or machine-independent recovery path.
- Escalate unresolved single-person or single-machine dependency as High risk.
