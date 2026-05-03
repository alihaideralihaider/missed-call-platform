# Troubleshooting

## Cron Route Returns 404

Likely cause: the route has not been deployed yet or the deployed version is older than the code containing `/api/cron/attempts/run`.

Check:

- deployment version
- route list in build output
- production domain path

## Cron Route Returns 500

Known issue encountered: the cron route needed `runtime = "nodejs"` for the current deployment environment.

Check logs with:

```bash
npx wrangler tail
```

## `attempt_jobs` Missing

Likely cause: base attempts migrations were not applied.

Check:

```sql
select to_regclass('public.attempt_jobs');
select to_regclass('public.attempt_messages');
select to_regclass('public.attempt_events');
```

## `ON CONFLICT` Constraint Error

Known issue encountered: an upsert or conflict handler needs a matching unique constraint or unique index.

Fix was to add the appropriate unique index for the relevant conflict target.

## Succeeded Job Still Has `next_attempt_at`

This is incorrect. A succeeded job must never remain eligible for cron execution.

One-time cleanup:

```sql
update attempt_jobs
set next_attempt_at = null,
    updated_at = now()
where status = 'succeeded'
  and next_attempt_at is not null;
```

Expected code behavior:

- order placed marks job `succeeded`
- `next_attempt_at` is cleared
- existing metadata is preserved and merged

## Missing `orderLink`

If `metadata.orderLink` is missing, cron should skip execution for that job and log an execution skipped event.

Expected:

- no SMS is sent
- failure/skipped reason is logged
- job does not crash the entire batch

## No SMS Received

Check:

- consent state
- Twilio/send provider logs
- `attempt_messages.status`
- `attempt_events` for skipped or failed execution
- `contact_value`
- `metadata.orderLink`
- `next_attempt_at`

## Job Does Not Run

Check:

```sql
select id, status, attempt_count, max_attempts, next_attempt_at, expires_at
from attempt_jobs
where id = 'PASTE_ATTEMPT_JOB_ID';
```

The job must be:

- `status = active`
- `next_attempt_at <= now()`
- `attempt_count < max_attempts`
- not expired

## Batch Processes Some Jobs but Not Others

This is expected. The engine is designed to continue processing other jobs if one job fails.

Check `attempt_events` for per-job failure details.
