# saana-restaurant-ux-review

Purpose: review customer, storefront, admin, and kitchen experience.

Use this for restaurant-facing flows, customer ordering, QR/hub routes, checkout, order status, admin, kitchen, and future printer-compatible work.

## Checklist

- Mobile-first restaurant flow works on small screens.
- Scan/tap QR flow reaches the intended restaurant, hub, menu, offer, or catering path.
- Missed-call to order flow remains understandable and low-friction.
- Checkout clearly shows items, modifiers, totals, contact details, pickup expectations, and errors.
- Modifiers and add-ons are easy to select, review, and edit.
- Order confirmation clearly communicates success and next steps.
- Ready-for-pickup flow is clear for staff and customers.
- Admin usability supports repeated restaurant operations without hidden critical actions.
- Kitchen and printer future compatibility is not blocked by the change.

## UX Failure Rules

If the UX review detects friction, confusion, broken flow, or operational risk:

1. Classify severity:

- Critical: checkout blocked, order flow broken, QR route unusable, customer cannot complete order, or admin cannot operate critical workflow.
- High: confusing checkout, broken modifiers, mobile usability failure, pickup confusion, missed-call recovery friction, or major kitchen/admin inefficiency.
- Medium: unclear messaging, weak layout hierarchy, inconsistent navigation, accessibility weakness, or friction requiring extra steps.
- Low: cosmetic issues, copy polish, or spacing/alignment improvements.

2. Required action:

For Critical and High issues:

- Stop deploy or commit until fixed or explicitly waived.
- Apply the smallest safe UX fix.
- Rerun Browser QA and UX Review on affected paths.
- Rerun Payment Review if checkout/order/payment flow changed.
- Rerun SMS Compliance Review if messaging/consent/IVR flow changed.

For Medium issues:

- Fix immediately if low-risk and small.
- Otherwise document a follow-up improvement.

For Low issues:

- Record for future polish.

3. Before closure:

- Confirm affected role paths were retested: customer, restaurant admin, staff, kitchen, and delivery/pickup workflow if applicable.
- Confirm mobile-first behavior still works.
- Confirm no new UX regression was introduced.
- Record unresolved UX risks if intentionally deferred.

## Output

Report the affected role paths, friction points, mobile risks, and any browser QA that should be run.
