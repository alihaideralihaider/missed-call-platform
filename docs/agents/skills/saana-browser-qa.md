# saana-browser-qa

Purpose: manual/browser QA checklist.

Use this when UI, route behavior, forms, checkout, auth, admin, QR/hub pages, or browser-visible states change.

## Checklist

- Live route loads without server or rendering errors.
- Mobile layout is usable at common phone widths.
- Checkout path works through item selection, modifiers, cart, and confirmation where applicable.
- Admin login path works or fails with the expected guard.
- QR/hub route loads and links to the intended destination.
- Console has no unexpected errors.
- Network panel has no unexpected failed requests.
- Form validation handles missing, invalid, and edge-case input.
- Accessibility basics: keyboard focus, labels, contrast, headings, and obvious button/link names.

## When QA finds an issue

Severity levels:

- Blocker: checkout, order, auth, or admin flow is broken.
- High: mobile layout is unusable, QR/hub flow is broken, or major console/network errors affect the flow.
- Medium: form validation, accessibility, visual defects, degraded UX, or non-critical route failures.
- Low: minor polish, copy, spacing, or isolated accessibility issues that do not block the flow.

For Blocker and High issues:

- Stop and do not commit or deploy until fixed or explicitly waived.
- Create a fix plan before editing.
- Apply the smallest safe code change that resolves the issue without broad refactors or unrelated behavior changes.
- Rerun Browser QA on the affected routes and any directly connected flow.
- Run Security Review if the fix touches auth, API behavior, customer data, admin protection, webhooks, or secrets.
- Run SMS Compliance Review if the fix touches messaging, consent, Twilio, IVR, STOP/HELP, or A2P behavior.
- Run Payment Review if the fix touches Stripe, billing, checkout totals, payment state, pricing, or webhooks.
- Show the diff before commit.

For Medium and Low issues:

- Document the finding.
- Fix immediately only if the change is small and low-risk.
- Otherwise create a follow-up task.

## Output

Record routes tested, viewport sizes, important console/network findings, and unresolved visual or accessibility risks.
