# Dev Integrity Extraction Plan

## Current State

SaanaOS currently has:

- AGENTS.md
- docs/agents/skills/*
- docs/agents/dev-integrity-automation.md
- scripts/dev-integrity-review.mjs
- worker/web/package.json npm scripts

The script is currently SaanaOS-aware and uses Saana-specific skill names.

## Goal

Extract the internal SaanaOS workflow into a reusable AuthToolkit Dev Integrity CLI/API foundation while preserving SaanaOS-specific rules as one project profile.

## Product Boundary

Reusable core should include:

- git diff parser
- staged/working tree modes
- changed file router
- confidence scoring
- deterministic runner framework
- evidence writer
- JSON output
- exit-code gating

Project-specific layer should include:

- route patterns
- review pack names
- confidence deductions
- framework assumptions
- tenant-boundary rules
- stack-specific checks

## Proposed Package Structure

Future package:

```text
packages/dev-integrity-cli/
- src/cli.ts
- src/git.ts
- src/router.ts
- src/confidence.ts
- src/runners/
- src/evidence.ts
- src/config.ts
```

Project config:

```text
authtoolkit.integrity.json
```

Example:

```json
{
  "project": "saanaos",
  "stack": "nextjs-cloudflare-supabase",
  "reviewPacks": ["security", "tenant-boundary", "payments", "sms-compliance", "browser-qa"],
  "blockOn": ["Critical", "High"],
  "evidence": {
    "mode": "local",
    "path": "docs/reviews"
  }
}
```

## Migration Steps

1. Keep current script working in SaanaOS.
2. Add config format documentation.
3. Refactor script internally into small functions only if needed.
4. Extract reusable logic into package folder.
5. Make SaanaOS consume config instead of hardcoded rules.
6. Add CLI command:
   authtoolkit-integrity review
7. Add JSON output contract.
8. Add GitHub Action/GitHub App later.
9. Add hosted API only after CLI is stable.

## Risks

- Overgeneralizing too early.
- Turning product into generic lint tool.
- Allowing unsafe autofix too soon.
- Making claims that imply guaranteed security.
- Losing the strong SaanaOS tenant/payment/SMS lessons during extraction.

## Non-goals

- Full security scanner.
- Full CI/CD platform.
- Replacing human security review for critical systems.
- Guaranteed vulnerability detection.
- Production deployment automation in v1.

## Next Implementation Milestone

Create an authtoolkit.integrity.json draft for SaanaOS and modify the local script to read it later.
