-- Extensions
create extension if not exists pgcrypto;

-- =========================
-- CORE PLATFORM TABLES
-- =========================

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  vertical text not null default 'generic',
  status text not null default 'active',
  timezone text not null default 'America/New_York',

  default_destination_type text not null default 'external_link',
  default_destination_url text,

  sms_enabled boolean not null default true,
  sms_from_number text,
  sms_template text not null default 'Thanks for calling {{business_name}}. Continue here: {{link}} Reply STOP to opt out.',

  send_on_missed boolean not null default true,
  send_on_busy boolean not null default true,
  send_on_no_answer boolean not null default true,
  send_on_after_hours boolean not null default true,
  send_on_answered boolean not null default false,

  duplicate_window_minutes integer not null default 720,
  max_sms_per_caller_per_day integer not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint businesses_vertical_check check (vertical in ('restaurant', 'salon', 'clinic', 'services', 'generic')),
  constraint businesses_status_check check (status in ('active', 'inactive', 'suspended')),
  constraint businesses_default_destination_type_check check (default_destination_type in ('order', 'booking', 'form', 'external_link'))
);

create table if not exists business_numbers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,

  provider text not null default 'twilio',
  phone_number text not null unique,
  provider_sid text,
  capabilities jsonb not null default '{}'::jsonb,

  is_active boolean not null default true,
  label text,

  created_at timestamptz not null default now(),

  constraint business_numbers_provider_check check (provider in ('twilio'))
);

create table if not exists flows (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,

  name text not null,
  trigger_type text not null default 'call_event',
  trigger_condition text not null default 'missed',

  destination_type text not null default 'external_link',
  destination_url text not null,

  sms_template text,
  is_active boolean not null default true,
  priority integer not null default 100,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint flows_trigger_type_check check (trigger_type in ('call_event')),
  constraint flows_trigger_condition_check check (trigger_condition in ('missed', 'busy', 'no_answer', 'answered', 'after_hours', 'voicemail', 'failed')),
  constraint flows_destination_type_check check (destination_type in ('order', 'booking', 'form', 'external_link'))
);

create table if not exists call_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  business_number_id uuid references business_numbers(id) on delete set null,
  flow_id uuid references flows(id) on delete set null,

  provider text not null default 'twilio',
  provider_call_sid text not null unique,

  from_number text not null,
  to_number text not null,

  direction text not null default 'inbound',
  call_status text,
  outcome text not null,
  was_answered boolean not null default false,
  duration_seconds integer not null default 0,

  started_at timestamptz,
  ended_at timestamptz,
  received_at timestamptz not null default now(),

  raw_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint call_events_provider_check check (provider in ('twilio')),
  constraint call_events_direction_check check (direction in ('inbound')),
  constraint call_events_outcome_check check (outcome in ('missed', 'busy', 'no_answer', 'answered', 'after_hours', 'voicemail', 'failed')),
  constraint call_events_duration_seconds_check check (duration_seconds >= 0)
);

create table if not exists sms_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  call_event_id uuid references call_events(id) on delete set null,

  provider text not null default 'twilio',
  provider_message_sid text unique,

  from_number text,
  to_number text not null,

  template_used text,
  rendered_message text not null,

  status text not null default 'queued',
  error_code text,
  error_message text,

  sent_at timestamptz,
  delivered_at timestamptz,

  created_at timestamptz not null default now(),

  constraint sms_events_provider_check check (provider in ('twilio')),
  constraint sms_events_status_check check (status in ('queued', 'sent', 'delivered', 'failed', 'undelivered'))
);

create table if not exists link_tokens (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  call_event_id uuid references call_events(id) on delete set null,
  sms_event_id uuid references sms_events(id) on delete set null,

  token text not null unique,
  destination_type text not null default 'external_link',
  destination_url text not null,

  expires_at timestamptz,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  constraint link_tokens_destination_type_check check (destination_type in ('order', 'booking', 'form', 'external_link'))
);

create table if not exists click_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  link_token_id uuid not null references link_tokens(id) on delete cascade,
  sms_event_id uuid references sms_events(id) on delete set null,
  call_event_id uuid references call_events(id) on delete set null,

  clicked_at timestamptz not null default now(),
  ip_hash text,
  user_agent text,
  referer text,

  created_at timestamptz not null default now()
);

create table if not exists opt_outs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  phone_number text not null,
  source text not null default 'sms_reply',
  created_at timestamptz not null default now(),

  constraint opt_outs_source_check check (source in ('sms_reply', 'manual', 'import')),
  unique (business_id, phone_number)
);

create table if not exists conversions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  call_event_id uuid references call_events(id) on delete set null,
  click_event_id uuid references click_events(id) on delete set null,

  conversion_type text not null,
  conversion_value numeric(12,2),
  external_reference text,

  created_at timestamptz not null default now(),

  constraint conversions_conversion_type_check check (conversion_type in ('order', 'booking', 'lead', 'api_usage', 'other'))
);

-- =========================
-- REVSHARE TABLES
-- =========================

create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  partner_type text not null,
  status text not null default 'active',
  email text,
  phone text,
  payout_method text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint partners_partner_type_check check (partner_type in ('sales_office', 'sales_rep', 'agency', 'api_partner', 'reseller')),
  constraint partners_status_check check (status in ('active', 'inactive', 'suspended'))
);

create table if not exists business_partner_attribution (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  partner_id uuid not null references partners(id) on delete cascade,

  attribution_type text not null,
  is_active boolean not null default true,

  starts_at timestamptz not null default now(),
  ends_at timestamptz,

  created_at timestamptz not null default now(),

  constraint business_partner_attribution_type_check check (attribution_type in ('owner', 'referrer', 'closer', 'api_source'))
);

create table if not exists commission_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  commission_type text not null,

  flat_amount numeric(12,2),
  percent_rate numeric(8,4),

  applies_to text not null,
  minimum_payout_threshold numeric(12,2) not null default 0,

  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint commission_plans_commission_type_check check (commission_type in ('flat', 'percent', 'hybrid')),
  constraint commission_plans_applies_to_check check (applies_to in ('subscription', 'sms', 'conversion', 'order', 'booking', 'api_usage', 'all'))
);

create table if not exists partner_commission_assignments (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  business_id uuid references businesses(id) on delete cascade,
  commission_plan_id uuid not null references commission_plans(id) on delete cascade,

  priority integer not null default 100,
  is_active boolean not null default true,

  starts_at timestamptz not null default now(),
  ends_at timestamptz,

  created_at timestamptz not null default now()
);

create table if not exists payout_events (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,

  source_type text not null,
  source_id uuid,
  gross_amount numeric(12,2) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  currency text not null default 'USD',

  status text not null default 'pending',
  notes text,

  created_at timestamptz not null default now(),
  paid_at timestamptz,

  constraint payout_events_source_type_check check (source_type in ('subscription', 'sms', 'conversion', 'order', 'booking', 'api_usage')),
  constraint payout_events_status_check check (status in ('pending', 'approved', 'paid', 'void'))
);

-- =========================
-- INDEXES
-- =========================

create index if not exists idx_business_numbers_business_id
  on business_numbers (business_id);

create index if not exists idx_flows_business_id
  on flows (business_id);

create index if not exists idx_flows_business_trigger_active_priority
  on flows (business_id, trigger_condition, is_active, priority);

create index if not exists idx_call_events_business_id
  on call_events (business_id);

create index if not exists idx_call_events_business_received_at
  on call_events (business_id, received_at desc);

create index if not exists idx_call_events_from_number
  on call_events (from_number);

create index if not exists idx_call_events_to_number
  on call_events (to_number);

create index if not exists idx_call_events_outcome
  on call_events (outcome);

create index if not exists idx_sms_events_business_id
  on sms_events (business_id);

create index if not exists idx_sms_events_call_event_id
  on sms_events (call_event_id);

create index if not exists idx_sms_events_to_number
  on sms_events (to_number);

create index if not exists idx_sms_events_status
  on sms_events (status);

create index if not exists idx_link_tokens_business_id
  on link_tokens (business_id);

create index if not exists idx_link_tokens_call_event_id
  on link_tokens (call_event_id);

create index if not exists idx_click_events_business_id
  on click_events (business_id);

create index if not exists idx_click_events_link_token_id
  on click_events (link_token_id);

create index if not exists idx_opt_outs_business_phone
  on opt_outs (business_id, phone_number);

create index if not exists idx_conversions_business_id
  on conversions (business_id);

create index if not exists idx_conversions_call_event_id
  on conversions (call_event_id);

create index if not exists idx_partners_partner_type
  on partners (partner_type);

create index if not exists idx_business_partner_attribution_business_id
  on business_partner_attribution (business_id);

create index if not exists idx_business_partner_attribution_partner_id
  on business_partner_attribution (partner_id);

create index if not exists idx_partner_commission_assignments_partner_id
  on partner_commission_assignments (partner_id);

create index if not exists idx_partner_commission_assignments_business_id
  on partner_commission_assignments (business_id);

create index if not exists idx_payout_events_partner_id
  on payout_events (partner_id);

create index if not exists idx_payout_events_business_id
  on payout_events (business_id);

create index if not exists idx_payout_events_status
  on payout_events (status);

create index if not exists idx_payout_events_source_type
  on payout_events (source_type);