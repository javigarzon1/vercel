
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Agents
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  doc_type text not null default 'avales_internacionales',
  system_prompt text not null,
  knowledge_base text,
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agents enable row level security;

create policy "Users can view own agents or templates" on public.agents
  for select using (auth.uid() = user_id or is_template = true);
create policy "Users can insert own agents" on public.agents
  for insert with check (auth.uid() = user_id);
create policy "Users can update own agents" on public.agents
  for update using (auth.uid() = user_id);
create policy "Users can delete own agents" on public.agents
  for delete using (auth.uid() = user_id);

create index agents_user_id_idx on public.agents(user_id);

-- Validations
create table public.validations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  input_data jsonb not null default '{}'::jsonb,
  report_md text,
  generated_doc_md text,
  created_at timestamptz not null default now()
);

alter table public.validations enable row level security;

create policy "Users can view own validations" on public.validations
  for select using (auth.uid() = user_id);
create policy "Users can insert own validations" on public.validations
  for insert with check (auth.uid() = user_id);
create policy "Users can delete own validations" on public.validations
  for delete using (auth.uid() = user_id);

create index validations_user_id_idx on public.validations(user_id);
create index validations_agent_id_idx on public.validations(agent_id);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger agents_updated_at
  before update on public.agents
  for each row execute function public.set_updated_at();
