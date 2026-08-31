-- KIPROD multi-institution access and support layer.
-- This migration does not alter any portfolio-risk formula or classification.

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  approved_domain text,
  primary_contact_email text,
  status text not null default 'Active' check (status in ('Pending', 'Active', 'Suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete restrict,
  full_name text,
  email text not null,
  roles text[] not null default '{}',
  status text not null default 'Active' check (status in ('Invited', 'Active', 'Disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.institution_access_settings (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  executive_cockpit_roles text[] not null default array['CEO']::text[],
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.authentication_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  event_type text not null,
  selected_role text,
  note text,
  created_at timestamptz not null default now()
);

create or replace function public.kiprod_roles_from_metadata(metadata jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(value), '{}'::text[])
  from jsonb_array_elements_text(coalesce(metadata -> 'kiprod_roles', '[]'::jsonb)) as value;
$$;

create or replace function public.kiprod_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_institution uuid;
begin
  begin
    requested_institution := nullif(new.raw_user_meta_data ->> 'institution_id', '')::uuid;
  exception when others then
    requested_institution := null;
  end;

  insert into public.user_profiles (
    user_id, institution_id, full_name, email, roles, status
  ) values (
    new.id,
    requested_institution,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    public.kiprod_roles_from_metadata(new.raw_user_meta_data),
    case when new.confirmed_at is null then 'Invited' else 'Active' end
  )
  on conflict (user_id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    roles = excluded.roles,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists kiprod_auth_user_profile on auth.users;
create trigger kiprod_auth_user_profile
after insert or update of email, raw_user_meta_data, confirmed_at on auth.users
for each row execute function public.kiprod_new_user_profile();

insert into public.user_profiles (user_id, institution_id, full_name, email, roles, status)
select
  user_row.id,
  case
    when coalesce(user_row.raw_user_meta_data ->> 'institution_id', '') ~* '^[0-9a-f-]{36}$'
      then (user_row.raw_user_meta_data ->> 'institution_id')::uuid
    else null
  end,
  coalesce(user_row.raw_user_meta_data ->> 'full_name', split_part(user_row.email, '@', 1)),
  user_row.email,
  public.kiprod_roles_from_metadata(user_row.raw_user_meta_data),
  case when user_row.banned_until is not null and user_row.banned_until > now() then 'Disabled' else 'Active' end
from auth.users user_row
on conflict (user_id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  roles = excluded.roles,
  updated_at = now();

create or replace function public.kiprod_current_roles()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(roles, '{}'::text[])
  from public.user_profiles
  where user_id = auth.uid();
$$;

create or replace function public.kiprod_current_institution_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select institution_id
  from public.user_profiles
  where user_id = auth.uid();
$$;

create or replace function public.kiprod_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select 'KIPROD Admin' = any(coalesce(public.kiprod_current_roles(), '{}'::text[]));
$$;

create or replace function public.kiprod_record_auth_event(
  p_event_type text,
  p_email text default null,
  p_selected_role text default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.authentication_events (
    institution_id, user_id, email, event_type, selected_role, note
  ) values (
    public.kiprod_current_institution_id(),
    auth.uid(),
    lower(nullif(trim(p_email), '')),
    left(coalesce(p_event_type, 'UNKNOWN'), 80),
    left(coalesce(p_selected_role, ''), 80),
    left(coalesce(p_note, ''), 500)
  );
end;
$$;

alter table public.institutions enable row level security;
alter table public.user_profiles enable row level security;
alter table public.institution_access_settings enable row level security;
alter table public.authentication_events enable row level security;

drop policy if exists "KIPROD institutions read" on public.institutions;
create policy "KIPROD institutions read" on public.institutions
for select to authenticated
using (public.kiprod_is_platform_admin() or id = public.kiprod_current_institution_id());

drop policy if exists "KIPROD institutions create" on public.institutions;
create policy "KIPROD institutions create" on public.institutions
for insert to authenticated
with check (public.kiprod_is_platform_admin());

drop policy if exists "KIPROD institutions update" on public.institutions;
create policy "KIPROD institutions update" on public.institutions
for update to authenticated
using (public.kiprod_is_platform_admin())
with check (public.kiprod_is_platform_admin());

drop policy if exists "KIPROD profiles read" on public.user_profiles;
create policy "KIPROD profiles read" on public.user_profiles
for select to authenticated
using (
  public.kiprod_is_platform_admin()
  or user_id = auth.uid()
  or (
    institution_id = public.kiprod_current_institution_id()
    and 'Institution Admin' = any(coalesce(public.kiprod_current_roles(), '{}'::text[]))
  )
);

drop policy if exists "KIPROD profiles update" on public.user_profiles;
create policy "KIPROD profiles update" on public.user_profiles
for update to authenticated
using (
  public.kiprod_is_platform_admin()
  or (
    institution_id = public.kiprod_current_institution_id()
    and 'Institution Admin' = any(coalesce(public.kiprod_current_roles(), '{}'::text[]))
  )
)
with check (
  public.kiprod_is_platform_admin()
  or (
    institution_id = public.kiprod_current_institution_id()
    and not ('KIPROD Admin' = any(roles))
  )
);

drop policy if exists "KIPROD access settings read" on public.institution_access_settings;
create policy "KIPROD access settings read" on public.institution_access_settings
for select to authenticated
using (public.kiprod_is_platform_admin() or institution_id = public.kiprod_current_institution_id());

drop policy if exists "KIPROD access settings write" on public.institution_access_settings;
create policy "KIPROD access settings write" on public.institution_access_settings
for all to authenticated
using (
  public.kiprod_is_platform_admin()
  or (
    institution_id = public.kiprod_current_institution_id()
    and 'Institution Admin' = any(coalesce(public.kiprod_current_roles(), '{}'::text[]))
  )
)
with check (
  public.kiprod_is_platform_admin()
  or (
    institution_id = public.kiprod_current_institution_id()
    and 'Institution Admin' = any(coalesce(public.kiprod_current_roles(), '{}'::text[]))
  )
);

drop policy if exists "KIPROD authentication audit read" on public.authentication_events;
create policy "KIPROD authentication audit read" on public.authentication_events
for select to authenticated
using (
  public.kiprod_is_platform_admin()
  or (
    institution_id = public.kiprod_current_institution_id()
    and 'Institution Admin' = any(coalesce(public.kiprod_current_roles(), '{}'::text[]))
  )
);

-- Replace the earlier request-header audit policies with authenticated,
-- institution-scoped access. Audit remains append-only.
drop policy if exists "Command Centre audit read" on public.audit_logs;
create policy "Command Centre audit read" on public.audit_logs
for select to authenticated
using (
  public.kiprod_is_platform_admin()
  or institution_id = public.kiprod_current_institution_id()
);

drop policy if exists "Command Centre audit append" on public.audit_logs;
create policy "Command Centre audit append" on public.audit_logs
for insert to authenticated
with check (
  public.kiprod_is_platform_admin()
  or institution_id = public.kiprod_current_institution_id()
);

revoke all on public.institutions, public.user_profiles, public.institution_access_settings from anon;
grant select, insert, update on public.institutions to authenticated;
grant select, update on public.user_profiles to authenticated;
grant select, insert, update on public.institution_access_settings to authenticated;
grant select on public.authentication_events to authenticated;
revoke all on function public.kiprod_record_auth_event(text, text, text, text) from public;
grant execute on function public.kiprod_record_auth_event(text, text, text, text) to anon, authenticated;
revoke all on public.audit_logs from anon;
grant select, insert on public.audit_logs to authenticated;

-- Deliberately no UPDATE or DELETE grant/policy on audit_logs.
