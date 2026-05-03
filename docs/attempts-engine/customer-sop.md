# Customer SOP: Missed-Call Recovery Attempts

This SOP explains the customer-facing behavior for restaurants using SaanaOS missed-call recovery.

## What Happens When a Customer Misses a Call

When a customer calls and the restaurant cannot answer, SaanaOS starts the missed-call recovery flow.

The goal is simple: help the customer place a direct pickup order without sending them to a marketplace.

## SMS Follow-Up

If the customer has given the required consent through the configured call flow, SaanaOS can send an SMS order link.

The customer may receive:

1. the initial order link
2. a reminder if they have not ordered yet
3. a final reminder if they still have not ordered

The exact timing and templates are controlled by SaanaOS and should not be changed manually by restaurant staff.

## What the Restaurant Should Expect

Restaurants should expect:

- missed-call recovery to work in the background
- customers to receive a direct ordering link after consent
- recovered orders to appear in the dashboard
- successful orders to stop future reminders
- expired jobs to stop automatically

## What the Customer Should Expect

Customers should expect:

- a clear SMS with an ordering link
- no unlimited message loop
- STOP/opt-out language in reminders
- no promotional messaging unless properly consented

## Opt-Out Rules

Customers must be able to opt out where required by the messaging channel and provider.

SaanaOS follow-up should not be used for unrelated promotions unless the customer has given the required consent.

## No Promo Unless Consented

Missed-call recovery is transactional recovery behavior. It should not be treated as permission for marketing campaigns.

Restaurant staff should not describe the system as promotional texting unless the account has proper marketing consent workflows.

## How Success Is Measured

Success can be measured by:

- missed calls detected
- SMS recovery links sent
- reminders sent
- recovered pickup orders
- conversion rate from attempt job to order
- jobs that expired without order

## Support Checklist: Customer Says They Did Not Get a Text

Support should check:

1. Was the call received by the correct SaanaOS phone line?
2. Was the restaurant mapping correct?
3. Did the customer provide required consent?
4. Does `attempt_jobs` contain a job for the call?
5. Does `attempt_messages` show sent, suppressed, or failed?
6. Does `attempt_events` show skipped execution?
7. Is the phone number formatted correctly?
8. Did the provider suppress or fail the message?
9. Did the customer opt out?
