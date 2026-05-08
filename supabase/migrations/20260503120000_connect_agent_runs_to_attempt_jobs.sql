alter table if exists public.agent_runs
  add column if not exists attempt_job_id uuid;

create index if not exists agent_runs_attempt_job_id_idx
  on public.agent_runs (attempt_job_id)
  where attempt_job_id is not null;
