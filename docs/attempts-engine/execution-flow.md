# Execution Flow

This document describes the current live missed-call recovery flow in SaanaOS.

## 1. Missed Call

A customer calls the restaurant phone line and the inbound voice webhook receives the call event.

The existing Twilio/IVR flow remains responsible for consent handling and customer interaction.

## 2. Attempt Job Created

SaanaOS creates an `attempt_jobs` row for the missed-call recovery use case.

The job stores durable recovery context, including the customer contact value, restaurant context, expiry, attempt count, max attempts, and metadata.

## 3. First SMS Sent

When the initial recovery SMS is sent, the engine records the message in `attempt_messages`.

If the message is sent successfully:

- `attempt_count` reflects the first attempt
- `metadata.orderLink` is stored on the job
- `metadata.restaurantSlug` is stored on the job
- `metadata.lastMessageType` is updated
- `next_attempt_at` is set to now plus 10 minutes

If the message is suppressed or failed:

- `next_attempt_at` is cleared
- the job is not scheduled for the next reminder

## 4. Cron Sends Reminder

The cron route finds active jobs where:

- `agent_type = missed_call_recovery`
- `status = active`
- `next_attempt_at <= now`
- `attempt_count < max_attempts`

The route processes at most 25 jobs per batch.

Attempt 2 message:

```text
Still want to order? Here is your link again: {{orderLink}} Reply STOP to opt out.
```

If sent, the job is scheduled for the final reminder after 30 minutes.

## 5. Cron Sends Final Reminder

Attempt 3 message:

```text
Last reminder - you can still place your order here: {{orderLink}} Reply STOP to opt out.
```

After the final attempt is sent, the job is marked expired with outcome `max_attempts_reached` and `next_attempt_at` is cleared.

## 6. Order Placed

If the customer places an order, checkout marks the matching attempt job as succeeded.

The job update must:

- set `status = succeeded`
- set `outcome_event_type = order_placed`
- set `completed_at`
- clear `next_attempt_at`
- preserve existing metadata such as `orderLink`, `restaurantSlug`, and `lastMessageType`
- add order metadata such as order number and total

## 7. No Order

If the customer does not place an order before the final attempt or expiry window, the job becomes expired.

Expired jobs are no longer eligible for execution.
