# Secret Inventory Template

Never store raw secret values in this file.

Document only secret names, purpose, owner or source system, consumers, rotation cadence, and recovery notes. Store actual values in the approved vault, password manager, provider console, or CI/CD secret store.

| Project | Environment | Secret Name | Purpose | Source of Truth | Runtime Consumers | CI Consumers | Rotation Cadence | Last Rotated | Status | Recovery Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| example-project | production | EXAMPLE_API_KEY | Provider API access | Approved vault/provider console | Cloudflare Worker | GitHub Actions | 90 days | YYYY-MM-DD | active | Recovery owner and provider console location, no values. |
