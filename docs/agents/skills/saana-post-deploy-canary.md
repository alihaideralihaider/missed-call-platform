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

## Output

Summarize production health, checked URLs, log findings, webhook status, and rollback readiness.
