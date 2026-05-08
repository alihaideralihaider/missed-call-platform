alter table if exists public.agent_actions
  add column if not exists action_version text not null default 'v1';

create unique index if not exists agent_actions_request_id_unique_idx
  on public.agent_actions (request_id)
  where request_id is not null;
