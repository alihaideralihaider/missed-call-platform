# Testing Guide

This guide covers manual testing for the current missed-call recovery implementation.

## Prerequisites

Required:

- deployed app
- Supabase migrations applied
- Twilio webhook configured
- `CRON_SECRET` configured
- restaurant phone line mapped to a restaurant

## 1. Trigger the Voice Webhook

Use a test call SID and real test phone values:

```bash
curl -i -X POST https://saanaos.com/api/twilio/voice/incoming \
  -d "CallSid=test_attempt_001&From=%2B19176647792&To=%2B15632786786"
```

Expected:

- webhook returns TwiML or expected voice response
- an attempt job is created if the inbound number maps correctly
- no real retry behavior changes

## 2. Query `attempt_jobs`

Example SQL:

```sql
select
  id,
  agent_type,
  status,
  contact_value,
  attempt_count,
  max_attempts,
  next_attempt_at,
  expires_at,
  outcome_event_type,
  metadata,
  created_at,
  updated_at
from attempt_jobs
order by created_at desc
limit 10;
```

Expected after initial SMS:

- `status = active`
- `attempt_count = 1`
- `next_attempt_at` is populated
- `metadata.orderLink` exists

## 3. Fast-Forward `next_attempt_at`

For a test job:

```sql
update attempt_jobs
set next_attempt_at = now() - interval '1 minute',
    updated_at = now()
where id = 'PASTE_ATTEMPT_JOB_ID';
```

## 4. Run Cron Endpoint

```bash
curl -X GET "https://saanaos.com/api/cron/attempts/run?secret=YOUR_CRON_SECRET"
```

Or:

```bash
curl -X GET https://saanaos.com/api/cron/attempts/run \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response shape:

```json
{
  "processed": 1,
  "sent": 1,
  "suppressed": 0,
  "expired": 0,
  "failed": 0
}
```

## 5. Verify Attempt Count and Status

After attempt 2:

- `attempt_count = 2`
- `status = active`
- `next_attempt_at` is about 30 minutes later

After attempt 3:

- `attempt_count = 3`
- `status = expired`
- `outcome_event_type = max_attempts_reached`
- `next_attempt_at is null`

## 6. Verify Succeeded Flow

When a customer places an order through the recovery link:

```sql
select
  id,
  status,
  attempt_count,
  next_attempt_at,
  completed_at,
  outcome_event_type,
  outcome_event_id,
  metadata
from attempt_jobs
where id = 'PASTE_ATTEMPT_JOB_ID';
```

Expected:

- `status = succeeded`
- `outcome_event_type = order_placed`
- `outcome_event_id` contains the order ID
- `completed_at` is populated
- `next_attempt_at is null`

## 7. Verify Messages and Events

```sql
select *
from attempt_messages
where attempt_job_id = 'PASTE_ATTEMPT_JOB_ID'
order by created_at;
```

```sql
select *
from attempt_events
where attempt_job_id = 'PASTE_ATTEMPT_JOB_ID'
order by created_at;
```

Expected:

- each sent or skipped SMS has a message record
- engine decisions and terminal state changes have event records
