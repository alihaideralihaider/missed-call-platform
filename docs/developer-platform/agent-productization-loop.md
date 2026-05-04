# Agent Productization Loop

Every agent must be defined as both a technical execution loop and a buyer-facing product loop.

The platform is not only building agents. It is building repeatable outcome products that can be explained, sold, measured, billed, and improved.

## Full Loop

```text
Painful Business Event
-> Buyer-Facing Product Promise
-> Event Intake
-> Agent Run
-> Actions / Skills
-> Attempts / Follow-Up
-> Outcome
-> Delivery Back to Client
-> Metering
-> Billing
-> Deal Room / Buyer Enablement
-> Learning Loop
```

## 1. Painful Business Event

What it means:
The real business moment that creates urgency, lost revenue, wasted effort, or missed follow-up.

Examples:
- `missed_call`
- `checkout_completed`
- `lead_created`
- `payment_failed`
- `order_delivered`
- `review_eligible`

Required question:
What painful business moment are we recovering or monetizing?

## 2. Buyer-Facing Product Promise

What it means:
The simple promise a buyer can understand without knowing the internal system design.

Examples:
- Missed calls become orders.
- Checkouts become add-on revenue.
- Completed orders become reviews.

Required question:
How does a normal buyer understand the value without technical language?

## 3. Event Intake

What it means:
The way the platform receives the trigger that starts the agent lifecycle.

Examples:
- Webhook
- API
- Twilio inbound call
- CSV import later
- Platform connector later

Required question:
How does the system receive the trigger?

## 4. Agent Run

What it means:
The traceable lifecycle created from an accepted event. Agent runs are stored as `agent_runs`.

Example:
A `missed_call` event creates one agent run for a missed-call recovery lifecycle.

Required question:
What traceable lifecycle did the agent start?

## 5. Actions / Skills

What it means:
The meaningful steps the agent can perform or log during the run.

Examples:
- `send_sms`
- `send_whatsapp`
- `generate_order_link`
- `suggest_modifier`
- `apply_modifier`
- `send_webhook`
- `request_review`
- `create_payment_link`

Required question:
What actions can the agent perform?

## 6. Attempts / Follow-Up

What it means:
The durable retry and follow-up system that keeps working until the opportunity converts, expires, or stops safely.

Stored through:
- `attempt_jobs`
- `attempt_messages`
- `attempt_events`

Example:
A missed-call recovery job sends an initial ordering link, then scheduled reminders until the job succeeds or expires.

Required question:
What retry, expiration, opt-out, and stop rules apply?

## 7. Outcome

What it means:
The result that proves the agent worked, stopped, or failed safely.

Examples:
- `order_placed`
- `add_on_purchased`
- `review_submitted`
- `lead_booked`
- `deposit_paid`
- `payment_recovered`
- `expired`
- `failed`
- `stopped`

Required question:
What result proves the agent worked or stopped safely?

## 8. Delivery Back to Client

What it means:
The approved way the client receives outcomes, files, or status updates.

Allowed methods:
- `webhook_realtime`
- `sftp_batch_pull`

Email is not an approved delivery method.

Required question:
How does the client receive outcomes?

## 9. Metering

What it means:
The usage record created from agent work, before billing is calculated. Metering is stored as `usage_events`.

Metrics:
- `accepted_event`
- `agent_run`
- `action_execution`
- `attempt_execution`
- `outcome_recorded`
- `webhook_delivery`
- `batch_file_generated`
- `sftp_file_downloaded`

Required question:
What usage should be recorded?

## 10. Billing

What it means:
The future process that converts usage into explainable invoice lines.

Future flow:

```text
usage_events -> rollups -> plan rules -> invoice line items -> Stripe invoice
```

Required question:
How will usage become explainable billing later?

## 11. Deal Room / Buyer Enablement

What it means:
The assets a buyer needs to understand, trust, and purchase the agent without a long sales call.

Must include:
- Problem
- Flow
- Setup steps
- Demo
- FAQ
- Compliance
- Pricing/fit
- Screenshots
- Calculator if useful

Required question:
What does the buyer need to confidently buy without a long sales call?

## 12. Learning Loop

What it means:
The feedback system that improves the agent, product offer, pricing, docs, and messaging.

Sources:
- Attempts
- Runs
- Actions
- Outcomes
- Usage
- Support questions
- Deal-room questions
- Calculator inputs

Required question:
What data will improve the agent, offer, pricing, docs, or messaging?

## Short Versions

Founder/product version:

```text
Pain -> Promise -> Agent -> Outcome -> Proof -> Billing -> Learning
```

Developer/platform version:

```text
Event -> Run -> Action -> Attempt -> Outcome -> Delivery -> Usage -> Invoice
```

Public-facing version:

```text
Business event -> Recovery agent -> Follow-up -> Measurable result
```

## Required Before Building Any New Agent

- Painful event defined
- Product promise written
- Event schema drafted
- Agent run type named
- Actions/skills listed
- Attempt rules defined
- Outcomes defined
- Delivery method defined
- Metering metrics defined
- Billing impact noted
- Deal room outline drafted
- Learning signals defined

## Example: Missed Call Recovery Agent

Painful Business Event:
A restaurant misses a customer call during rush hours, after hours, or while staff are busy.

Buyer-Facing Product Promise:
Missed calls become direct pickup order opportunities.

Event Intake:
Twilio receives the inbound call and the SaanaOS webhook records the missed-call trigger.

Agent Run:
The platform can create or trace an agent run for the missed-call recovery lifecycle.

Actions / Skills:
The agent creates an order link, sends SMS follow-up through the existing messaging system, records action traces, and listens for order outcomes.

Attempts / Follow-Up:
The Universal Attempts Engine creates an `attempt_job`, records `attempt_messages`, logs `attempt_events`, schedules reminders, and stops when the job succeeds or expires.

Outcome:
The job records `order_placed` when checkout completes. If the customer never orders, the job records `expired` after the maximum attempts.

Delivery Back to Client:
Realtime delivery is webhook-based where applicable. Batch delivery is SFTP pull. All timestamps are UTC.

Metering:
Current non-billable usage can record `accepted_event`, `agent_run`, `action_execution`, `attempt_execution`, and `outcome_recorded`.

Billing:
Billing is future work downstream of metering. No immediate charge is made by the agent.

Deal Room / Buyer Enablement:
The buyer needs the missed-call problem, recovery flow, setup steps, consent explanation, SMS behavior, pricing fit, screenshots, and a simple recovery calculator.

Learning Loop:
Learning comes from missed-call volume, attempt counts, order outcomes, opt-outs, support questions, and buyer objections.

## Example: Post-Checkout Revenue Agent Future Pattern

Status:
Future supported pattern. This is not live yet.

Painful Business Event:
A customer completes checkout, but the business misses the chance to offer a relevant add-on, referral, review, or repeat-purchase path.

Buyer-Facing Product Promise:
Completed checkouts become one more sale, review, referral, or repeat customer.

Event Intake:
A future checkout platform sends a `checkout_completed` event through webhook, API, or native connector.

Agent Run:
The platform creates one agent run for the post-checkout lifecycle.

Actions / Skills:
Future actions may include `offer_addon`, `create_payment_link`, `request_review`, `issue_coupon`, `send_webhook`, or `send_sms` where consent allows.

Attempts / Follow-Up:
Attempt rules must define timing windows, suppression, opt-out, expiration, and safe stop conditions before implementation.

Outcome:
Possible outcomes include `add_on_purchased`, `review_submitted`, `referral_created`, `repeat_order_placed`, `expired`, `failed`, or `stopped`.

Delivery Back to Client:
Realtime outcomes should be delivered by webhook. Batch outcome files should be available by SFTP pull. All timestamps are UTC.

Metering:
Usage should record accepted events, agent runs, action executions, attempts, outcomes, and delivery records as non-billable until pricing is validated.

Billing:
Billing must remain downstream of metering. Pricing and invoice rules should not be finalized until usage data is validated.

Deal Room / Buyer Enablement:
The buyer needs the checkout-growth promise, example flows, setup steps, compliance notes, demo screenshots, FAQ, pricing fit, and a calculator showing possible add-on or repeat-order lift.

Learning Loop:
Learning should come from conversion rate, accepted offers, skipped offers, support questions, deal-room questions, calculator inputs, and outcome data.
