# Developer Quickstart

This guide explains how to set up and test the Universal Attempts Engine for the current SaanaOS missed-call recovery use case.

## Environment Variables

Required:

- `CRON_SECRET`
- Supabase service credentials used by the app
- Twilio/SMS provider configuration used by existing SaanaOS messaging

Optional for provider testing:

- SMS provider override variables already supported by the messaging layer

## Required Migrations

Apply the base attempts migrations that create:

- `attempt_jobs`
- `attempt_messages`
- `attempt_events`

Also apply execution and traceability migrations:

- add `next_attempt_at` to `attempt_jobs`
- add `agent_runs.attempt_job_id`
- add action logging hardening for `agent_actions`

## Cron Endpoint

Endpoint:

```text
GET /api/cron/attempts/run
```

Authorization:

```http
Authorization: Bearer <CRON_SECRET>
```

Alternative test form:

```text
/api/cron/attempts/run?secret=<CRON_SECRET>
```

## Manual Webhook Test

```bash
curl -i -X POST https://saanaos.com/api/twilio/voice/incoming \
  -d "CallSid=test_attempt_001&From=%2B19176647792&To=%2B15632786786"
```

## Manual Cron Test

```bash
curl -X GET https://saanaos.com/api/cron/attempts/run \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## SQL Verification Queries

Latest jobs:

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
limit 20;
```

Messages for one job:

```sql
select *
from attempt_messages
where attempt_job_id = 'PASTE_ATTEMPT_JOB_ID'
order by created_at;
```

Events for one job:

```sql
select *
from attempt_events
where attempt_job_id = 'PASTE_ATTEMPT_JOB_ID'
order by created_at;
```

## Fast-Forward a Job

```sql
update attempt_jobs
set next_attempt_at = now() - interval '1 minute',
    updated_at = now()
where id = 'PASTE_ATTEMPT_JOB_ID';
```

## Link Agent API Runs with `attempt_job_id`

When creating an Agent API event, pass the attempt job ID:

```json
{
  "event_type": "missed_call",
  "source_system": "saanaos",
  "source_slug": "demo-restaurant",
  "attempt_job_id": "550e8400-e29b-41d4-a716-446655440000",
  "customer": {
    "phone": "+15555550123"
  },
  "metadata": {
    "call_sid": "CA_demo_123"
  }
}
```

Then inspect:

```text
GET /api/v1/agent/runs/{agent_run_id}
```

The run response includes `attempt_job_id`, allowing this trace:

```text
event -> attempt_job -> agent_run -> agent_actions -> outcome
```

## Notes

- All timestamps should be treated as UTC ISO-8601.
- The current implementation is missed-call recovery only.
- Post-Checkout is a future supported pattern, not live execution yet.
