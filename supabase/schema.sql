-- HomePassportAI — Supabase schema
-- Run in Supabase SQL editor after creating a project.

create extension if not exists "pgcrypto";

create table if not exists appliances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  nickname text not null default 'Appliance',
  room text not null default 'Other',
  appliance_type text,
  brand text,
  model_number text,
  serial_number text,
  color_description text,
  dimensions_description text,
  estimated_current_value text,
  suggested_retail_price text,
  appliance_photo_path text,
  label_photo_path text,
  receipt_photo_path text,
  confidence text,
  repair_company jsonb,
  scanned_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Run on existing projects:
-- alter table appliances add column if not exists color_description text;
-- alter table appliances add column if not exists dimensions_description text;
-- alter table appliances add column if not exists estimated_current_value text;
-- alter table appliances add column if not exists suggested_retail_price text;

alter table appliances enable row level security;

drop policy if exists "Users read own appliances" on appliances;
drop policy if exists "Users insert own appliances" on appliances;
drop policy if exists "Users update own appliances" on appliances;
drop policy if exists "Users delete own appliances" on appliances;

create policy "Users read own appliances"
  on appliances for select
  using (auth.uid() = user_id);

create policy "Users insert own appliances"
  on appliances for insert
  with check (auth.uid() = user_id);

create policy "Users update own appliances"
  on appliances for update
  using (auth.uid() = user_id);

create policy "Users delete own appliances"
  on appliances for delete
  using (auth.uid() = user_id);

-- Storage bucket (private)
insert into storage.buckets (id, name, public)
values ('appliance-photos', 'appliance-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "Users upload own photos" on storage.objects;
drop policy if exists "Users read own photos" on storage.objects;
drop policy if exists "Users update own photos" on storage.objects;
drop policy if exists "Users delete own photos" on storage.objects;

create policy "Users upload own photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'appliance-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read own photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'appliance-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'appliance-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'appliance-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin inventory aggregates (called server-side with service role only)
create or replace function admin_inventory_stats()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'total_items', (select count(*)::int from appliances),
    'users_with_inventory', (select count(distinct user_id)::int from appliances)
  );
$$;

revoke all on function admin_inventory_stats() from public;
revoke all on function admin_inventory_stats() from anon;
revoke all on function admin_inventory_stats() from authenticated;
grant execute on function admin_inventory_stats() to service_role;

-- For analytics_events + full admin dashboard RPCs, also run:
-- supabase/migrations/20260718000000_admin_analytics.sql

revoke all on function public.admin_inventory_stats() from public;
revoke all on function public.admin_inventory_stats() from anon;
revoke all on function public.admin_inventory_stats() from authenticated;
grant execute on function public.admin_inventory_stats() to service_role;

-- Optional admin analytics migration:
-- also run supabase/migrations/20260718000000_admin_analytics.sql
-- for analytics_events + admin_dashboard_database_stats().
