# saana-incident-capture

Purpose: capture operational learning after Critical or High severity issues.

Use this for operational incidents, failures, regressions, outages, security issues, deployment failures, compliance mistakes, payment failures, or production-risk discoveries when there is real operational learning to capture.

## When to use

- Production outage.
- Checkout/order failure.
- Payment issue.
- Auth/security issue.
- Webhook failure.
- Messaging/compliance issue.
- Failed deploy.
- Rollback.
- Customer-impacting regression.
- Data exposure risk.
- Infrastructure instability.
- Repeated operational failure.

## Incident Capture Template

- Incident title
- Severity (Critical/High/Medium/Low)
- Date/time detected
- Affected systems
- Customer impact
- Restaurant impact
- Payment impact
- Messaging impact
- Deployment/version involved
- Trigger event
- Root cause summary
- What failed technically
- What protection or check failed
- Immediate mitigation
- Rollback performed?
- Final resolution
- Remaining risks
- Prevention added or needed
- Links to related commits/issues/docs

## Operational Rules

- For Critical or High issues, create a short incident note only when there is real operational learning.
- No tickets, ceremony, status workflow, or heavyweight process is required by this skill.
- Capture what broke, why it broke, the fix, any rollback, and prevention.
- Do not hide failed assumptions or operator mistakes.
- Focus on prevention and operational learning, not blame.
- Add or improve guardrails/reviews when patterns repeat.
- Record rollback steps if rollback occurred.
- Capture provider involvement if Twilio, Stripe, Supabase, Cloudflare, or other vendors were involved.

## Output

Summarize:

- What happened.
- Why it happened.
- How it was fixed.
- What changed operationally to reduce recurrence.
