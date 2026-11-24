-- Energiestroom MVP: every mutable row is owned by exactly one authenticated user.
create extension if not exists pgcrypto;

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  energy_cost integer not null check (energy_cost between 0 and 100),
  energy_gain integer not null check (energy_gain between 0 and 100),
  category text not null check (category in ('Rust', 'Beweging', 'Huishouden', 'Werk', 'Creativiteit', 'Gezin', 'Buiten', 'Ontspanning')),
  description text not null default '',
  created_at timestamptz not null default now()
);

create table public.daily_check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  check_in_date date not null,
  energy integer not null check (energy between 0 and 100),
  asks_energy text not null default '',
  gives_energy text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, check_in_date)
);

create table public.planned_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Built-in demo activities use stable text keys; custom activities use their UUID as text.
  activity_id text not null check (char_length(activity_id) between 1 and 100),
  planned_date date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.evening_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reflection_date date not null,
  gave_energy text not null default '',
  cost_energy text not null default '',
  feeling integer not null check (feeling between 0 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, reflection_date)
);

create index activities_user_id_idx on public.activities(user_id);
create index daily_check_ins_user_date_idx on public.daily_check_ins(user_id, check_in_date desc);
create index planned_activities_user_date_idx on public.planned_activities(user_id, planned_date desc);
create index evening_reflections_user_date_idx on public.evening_reflections(user_id, reflection_date desc);

alter table public.activities enable row level security;
alter table public.daily_check_ins enable row level security;
alter table public.planned_activities enable row level security;
alter table public.evening_reflections enable row level security;

-- USING protects reads/deletes and WITH CHECK prevents inserting or moving a row to another owner.
create policy "Users manage only their activities"
  on public.activities for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage only their check-ins"
  on public.daily_check_ins for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage only their plans"
  on public.planned_activities for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage only their reflections"
  on public.evening_reflections for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.activities, public.daily_check_ins, public.planned_activities, public.evening_reflections from anon;
grant select, insert, update, delete on public.activities, public.daily_check_ins, public.planned_activities, public.evening_reflections to authenticated;
