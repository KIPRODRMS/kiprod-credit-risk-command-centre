-- KIPROD Command Centre
-- Shared Institution Profile + controlled Board Report overrides + protected audit trail

create extension if not exists pgcrypto;

create or replace function public.kiprod_request_institution_id()
returns uuid
language sql
stable
as $$
  select case
    when coalesce(current_setting('request.headers', true), '{}')::jsonb
      ->> 'x-kiprod-institution-id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then (
      coalesce(current_setting('request.headers', true), '{}')::jsonb
      ->> 'x-kiprod-institution-id'
    )::uuid
    else null
  end;
$$;

create table if not exists public.institution_profiles (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null unique,
  institution_name text not null default '',
  institution_type text not null default 'SACCO',
  county_region text not null default '',
  primary_contact text not null default '',
  reporting_month text not null default '',
  board_reporting_frequency text not null default 'Monthly',
  reporting_currency text not null default 'KES',
  risk_lead text not null default '',
  credit_manager text not null default '',
  recovery_lead text not null default '',
  board_chair_risk_lead text not null default '',
  governance_mode text not null default 'Management prepares. Board oversees.',
  updated_by_role text,
  updated_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_report_overrides (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  reporting_period text not null,
  field_key text not null check (
    field_key in (
      'institutionName',
      'institutionType',
      'reportingMonth',
      'reportingCurrency',
      'riskLead',
      'creditManager',
      'recoveryLead',
      'boardChair'
    )
  ),
  master_value_snapshot text not null default '',
  override_value text not null,
  reason text not null check (length(trim(reason)) >= 5),
  updated_by_role text,
  updated_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, reporting_period, field_key)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  module text not null,
  action_type text not null,
  record_ref text not null default '',
  old_value text not null default '',
  new_value text not null default '',
  role text not null default 'MVP User',
  user_name text not null default 'MVP User',
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.audit_logs add column if not exists institution_id uuid;
alter table public.audit_logs add column if not exists module text;
alter table public.audit_logs add column if not exists action_type text;
alter table public.audit_logs add column if not exists record_ref text;
alter table public.audit_logs add column if not exists old_value text;
alter table public.audit_logs add column if not exists new_value text;
alter table public.audit_logs add column if not exists role text;
alter table public.audit_logs add column if not exists user_name text;
alter table public.audit_logs add column if not exists note text;
alter table public.audit_logs add column if not exists created_at timestamptz default now();

create index if not exists institution_profiles_institution_idx
  on public.institution_profiles (institution_id);
create index if not exists board_report_overrides_lookup_idx
  on public.board_report_overrides (institution_id, reporting_period);
create index if not exists audit_logs_institution_created_idx
  on public.audit_logs (institution_id, created_at desc);

create or replace function public.kiprod_audit_institution_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_context text;
  new_context text;
begin
  old_context := case when tg_op = 'INSERT' then 'No shared master record' else
    jsonb_build_object(
      'institutionName', old.institution_name,
      'institutionType', old.institution_type,
      'reportingMonth', old.reporting_month,
      'reportingCurrency', old.reporting_currency,
      'riskLead', old.risk_lead,
      'creditManager', old.credit_manager,
      'recoveryLead', old.recovery_lead,
      'boardChair', old.board_chair_risk_lead
    )::text end;
  new_context := jsonb_build_object(
    'institutionName', new.institution_name,
    'institutionType', new.institution_type,
    'reportingMonth', new.reporting_month,
    'reportingCurrency', new.reporting_currency,
    'riskLead', new.risk_lead,
    'creditManager', new.credit_manager,
    'recoveryLead', new.recovery_lead,
    'boardChair', new.board_chair_risk_lead
  )::text;

  insert into public.audit_logs (
    institution_id, module, action_type, record_ref, old_value, new_value,
    role, user_name, note
  ) values (
    new.institution_id,
    'Institution Profile',
    case when tg_op = 'INSERT' then 'MASTER_PROFILE_CREATED' else 'MASTER_PROFILE_UPDATED' end,
    coalesce(nullif(new.institution_name, ''), new.institution_id::text),
    old_context,
    new_context,
    coalesce(new.updated_by_role, 'MVP User'),
    coalesce(new.updated_by_name, new.updated_by_role, 'MVP User'),
    'Shared Institution Profile master record saved.'
  );
  return new;
end;
$$;

drop trigger if exists kiprod_institution_profile_audit on public.institution_profiles;
create trigger kiprod_institution_profile_audit
after insert or update on public.institution_profiles
for each row execute function public.kiprod_audit_institution_profile();

create or replace function public.kiprod_save_board_report_override(
  p_institution_id uuid,
  p_reporting_period text,
  p_field_key text,
  p_master_value text,
  p_previous_report_value text,
  p_override_value text,
  p_reason text,
  p_role text,
  p_user_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
  field_label text;
begin
  if p_institution_id is distinct from public.kiprod_request_institution_id() then
    raise exception 'Institution scope does not match the Command Centre request.';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'A clear override reason is required.';
  end if;
  if p_field_key not in (
    'institutionName', 'institutionType', 'reportingMonth', 'reportingCurrency',
    'riskLead', 'creditManager', 'recoveryLead', 'boardChair'
  ) then
    raise exception 'This field cannot be overridden.';
  end if;

  insert into public.board_report_overrides (
    institution_id, reporting_period, field_key, master_value_snapshot,
    override_value, reason, updated_by_role, updated_by_name, updated_at
  ) values (
    p_institution_id, p_reporting_period, p_field_key, coalesce(p_master_value, ''),
    trim(p_override_value), trim(p_reason), p_role, p_user_name, now()
  )
  on conflict (institution_id, reporting_period, field_key)
  do update set
    master_value_snapshot = excluded.master_value_snapshot,
    override_value = excluded.override_value,
    reason = excluded.reason,
    updated_by_role = excluded.updated_by_role,
    updated_by_name = excluded.updated_by_name,
    updated_at = now()
  returning id into saved_id;

  field_label := case p_field_key
    when 'institutionName' then 'Institution Name'
    when 'institutionType' then 'Institution Type'
    when 'reportingMonth' then 'Reporting Month'
    when 'reportingCurrency' then 'Reporting Currency'
    when 'riskLead' then 'Risk Lead'
    when 'creditManager' then 'Credit Manager'
    when 'recoveryLead' then 'Recovery Lead'
    when 'boardChair' then 'Board Chair / Risk Lead'
  end;

  insert into public.audit_logs (
    institution_id, module, action_type, record_ref, old_value, new_value,
    role, user_name, note
  ) values (
    p_institution_id,
    'Board Report',
    'REPORT_FIELD_OVERRIDDEN',
    p_reporting_period || ' - ' || field_label,
    coalesce(nullif(p_previous_report_value, ''), 'Not set'),
    trim(p_override_value),
    coalesce(nullif(p_role, ''), 'MVP User'),
    coalesce(nullif(p_user_name, ''), nullif(p_role, ''), 'MVP User'),
    'Controlled report override: ' || trim(p_reason)
  );
  return saved_id;
end;
$$;

create or replace function public.kiprod_remove_board_report_override(
  p_override_id uuid,
  p_master_value text,
  p_reason text,
  p_role text,
  p_user_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.board_report_overrides%rowtype;
begin
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'A clear restoration reason is required.';
  end if;

  select * into existing
  from public.board_report_overrides
  where id = p_override_id
    and institution_id = public.kiprod_request_institution_id();
  if not found then
    raise exception 'The report override was not found in this institution.';
  end if;

  delete from public.board_report_overrides where id = existing.id;
  insert into public.audit_logs (
    institution_id, module, action_type, record_ref, old_value, new_value,
    role, user_name, note
  ) values (
    existing.institution_id,
    'Board Report',
    'REPORT_OVERRIDE_REMOVED',
    existing.reporting_period || ' - ' || existing.field_key,
    existing.override_value,
    coalesce(nullif(p_master_value, ''), 'Not set'),
    coalesce(nullif(p_role, ''), 'MVP User'),
    coalesce(nullif(p_user_name, ''), nullif(p_role, ''), 'MVP User'),
    'Report field restored to the master record: ' || trim(p_reason)
  );
end;
$$;

alter table public.institution_profiles enable row level security;
alter table public.board_report_overrides enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Command Centre profile read" on public.institution_profiles;
create policy "Command Centre profile read"
on public.institution_profiles for select
to anon, authenticated
using (institution_id = public.kiprod_request_institution_id());

drop policy if exists "Command Centre profile create" on public.institution_profiles;
create policy "Command Centre profile create"
on public.institution_profiles for insert
to anon, authenticated
with check (institution_id = public.kiprod_request_institution_id());

drop policy if exists "Command Centre profile update" on public.institution_profiles;
create policy "Command Centre profile update"
on public.institution_profiles for update
to anon, authenticated
using (institution_id = public.kiprod_request_institution_id())
with check (institution_id = public.kiprod_request_institution_id());

drop policy if exists "Command Centre overrides read" on public.board_report_overrides;
create policy "Command Centre overrides read"
on public.board_report_overrides for select
to anon, authenticated
using (institution_id = public.kiprod_request_institution_id());

drop policy if exists "Command Centre overrides create" on public.board_report_overrides;
drop policy if exists "Command Centre overrides update" on public.board_report_overrides;
drop policy if exists "Command Centre overrides delete" on public.board_report_overrides;

drop policy if exists "Command Centre audit read" on public.audit_logs;
create policy "Command Centre audit read"
on public.audit_logs for select
to anon, authenticated
using (institution_id = public.kiprod_request_institution_id());

drop policy if exists "Command Centre audit append" on public.audit_logs;
create policy "Command Centre audit append"
on public.audit_logs for insert
to anon, authenticated
with check (institution_id = public.kiprod_request_institution_id());

-- Deliberately no UPDATE or DELETE policies on audit_logs.
-- Audit records are append-only from the Command Centre client.

grant select, insert, update on public.institution_profiles to anon, authenticated;
revoke insert, update, delete on public.board_report_overrides from anon, authenticated;
grant select on public.board_report_overrides to anon, authenticated;
grant select, insert on public.audit_logs to anon, authenticated;
revoke all on function public.kiprod_save_board_report_override(
  uuid, text, text, text, text, text, text, text, text
) from public;
revoke all on function public.kiprod_remove_board_report_override(
  uuid, text, text, text, text
) from public;
grant execute on function public.kiprod_save_board_report_override(
  uuid, text, text, text, text, text, text, text, text
) to anon, authenticated;
grant execute on function public.kiprod_remove_board_report_override(
  uuid, text, text, text, text
) to anon, authenticated;
