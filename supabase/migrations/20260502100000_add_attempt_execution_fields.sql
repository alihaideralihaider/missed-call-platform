alter table if exists attempt_jobs
  add column if not exists next_attempt_at timestamptz;

create index if not exists attempt_jobs_next_attempt_at_active_idx
  on attempt_jobs (next_attempt_at)
  where status = 'active';
