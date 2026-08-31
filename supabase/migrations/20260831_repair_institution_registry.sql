-- Completes the KIPROD institution registry when an earlier or partial table
-- already existed before the multi-institution migration was applied.
-- This migration is idempotent and does not touch portfolio-risk logic.

begin;

create extension if not exists pgcrypto;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid()
);

alter table public.institutions add column if not exists name text;
alter table public.institutions add column if not exists slug text;
alter table public.institutions add column if not exists approved_domain text;
alter table public.institutions add column if not exists primary_contact_email text;
alter table public.institutions add column if not exists status text;
alter table public.institutions add column if not exists created_at timestamptz;
alter table public.institutions add column if not exists updated_at timestamptz;

alter table public.institutions alter column id set default gen_random_uuid();
alter table public.institutions alter column status set default 'Active';
alter table public.institutions alter column created_at set default now();
alter table public.institutions alter column updated_at set default now();

update public.institutions
set
  name = coalesce(nullif(name, ''), 'Institution ' || left(id::text, 8)),
  slug = coalesce(nullif(slug, ''), 'institution-' || replace(id::text, '-', '')),
  status = case when status in ('Pending', 'Active', 'Suspended') then status else 'Active' end,
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.institutions alter column name set not null;
alter table public.institutions alter column slug set not null;
alter table public.institutions alter column status set not null;
alter table public.institutions alter column created_at set not null;
alter table public.institutions alter column updated_at set not null;

create unique index if not exists institutions_slug_key on public.institutions (slug);

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

alter table public.institutions enable row level security;
drop policy if exists "KIPROD institutions read" on public.institutions;
create policy "KIPROD institutions read" on public.institutions
for select to authenticated
using (public.kiprod_is_platform_admin() or id = public.kiprod_current_institution_id());
drop policy if exists "KIPROD institutions create" on public.institutions;
create policy "KIPROD institutions create" on public.institutions
for insert to authenticated with check (public.kiprod_is_platform_admin());
drop policy if exists "KIPROD institutions update" on public.institutions;
create policy "KIPROD institutions update" on public.institutions
for update to authenticated
