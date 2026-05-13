# Repository Workflow

Future AI coding agents must read `worker/AGENTS.md` first and follow its Cloudflare-specific instructions for any work under `worker/`.

## Minimum Change Workflow

1. Plan: define the scope, files likely affected, risks, and validation approach before editing.
2. Git History Review: inspect relevant recent history for the files or behavior being changed.
3. Implement: keep edits scoped, follow existing patterns, and do not modify unrelated app code.
4. Test: run the narrowest meaningful checks first, then broader checks when risk warrants it.
5. Code Review: review the diff for regressions, missing tests, edge cases, and maintainability.
6. Security Review: check auth, secrets, input validation, data exposure, abuse paths, and dependency risk.
7. Commit: commit only after the above steps pass or after clearly documenting any skipped checks.

## Conditional Reviews

- Frontend changes: review responsive behavior, accessibility, loading/error states, and visual consistency.
- Restaurant, customer, staff, or kitchen UX changes: review the affected workflow end to end from that role's perspective.
- SMS or compliance changes: review consent, opt-out handling, message content, rate limits, provider failure modes, and auditability.
- Billing or payment changes: review pricing, idempotency, reconciliation, webhook handling, failure states, and PCI-sensitive boundaries.
- Database or schema changes: review migrations, rollback strategy, data backfill needs, indexes, constraints, and access policies.
