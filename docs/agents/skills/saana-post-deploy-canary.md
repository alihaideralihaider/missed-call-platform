# saana-post-deploy-canary

Purpose: verify production health after deployment.

Use this after a production deploy. It is a checklist for human or agent-assisted verification, not a deployment automation script.

## Checklist

- Deployment URL: record the exact production URL or Worker deployment target.
- Cloudflare Worker status: confirm deployment succeeded and the Worker is reachable.
- Known public pages: load core marketing, restaurant, QR/hub, and support pages as applicable.
- Auth/login route: verify login page and protected route behavior.
- Order route: verify a representative order path or safe smoke-test route.
- Webhook endpoints: verify applicable endpoints are reachable and reject/accept requests as expected.
- Logs/tail checks: inspect recent Cloudflare, app, webhook, and provider logs for errors.
- Rollback notes: record the last known good version and rollback command/path.

## Canary Failure Rules

If post-deploy canary finds a failure:

Classify severity:

- Critical: checkout/order/auth/admin/webhook production failure, data exposure, payment failure, or major outage.
- High: broken public route, major UI failure, repeated server errors, or provider integration failure.
- Medium: non-critical route issue, degraded UX, or isolated console/network errors.
- Low: copy, polish, or minor visual issue.

For Critical and High failures:

- Stop further deploy work.
- Decide rollback vs immediate fix.
- Roll back if customer/order/payment/security impact is active.
- Rerun canary after rollback or fix.
- Run relevant review skill: Security, Payment, SMS Compliance, or Browser QA.
- Create an incident note only if there is real operational learning.

For Medium and Low failures:

- Document the issue.
- Fix immediately only if small and safe.
- Otherwise create a follow-up note.

Before closure:

- Record final production status.
- Record rollback/fix action taken.
- Record remaining risk.
- Confirm canary passed or clearly state what remains unresolved.

## Output

Summarize production health, checked URLs, log findings, webhook status, and rollback readiness.
