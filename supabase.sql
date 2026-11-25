-- Execute este arquivo no Supabase: SQL Editor > New query > Run.
-- Cada pessoa só consegue consultar e alterar os próprios dados.

create extension if not exists pgcrypto;

create table if not exists public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity numeric default 0,
  unit text default 'un',
  expiry_date date,
  created_at timestamptz default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null check (category in ('acompanhamento','legumes','proteínas','lanches')),
  difficulty text not null check (difficulty in ('fácil','intermediário','elaborado')),
  servings integer not null default 2 check (servings > 0),
  ingredients jsonb not null default '[]'::jsonb,
  method text not null default '',
  created_at timestamptz default now()
);

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  day_index integer not null check (day_index between 0 and 6),
  meal_type text not null check (meal_type in ('almoço','jantar')),
  recipe_id uuid references public.recipes(id) on delete set null,
  created_at timestamptz default now(),
  unique(user_id, week_start, day_index, meal_type)
);

alter table public.pantry_items enable row level security;
alter table public.recipes enable row level security;
alter table public.meal_plans enable row level security;

drop policy if exists "pantry own rows" on public.pantry_items;
create policy "pantry own rows" on public.pantry_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recipes own rows" on public.recipes;
create policy "recipes own rows" on public.recipes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "plans own rows" on public.meal_plans;
create policy "plans own rows" on public.meal_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists pantry_user_idx on public.pantry_items(user_id);
create index if not exists recipes_user_idx on public.recipes(user_id);
create index if not exists meal_plans_user_week_idx on public.meal_plans(user_id, week_start);
