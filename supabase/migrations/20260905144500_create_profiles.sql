-- One profile per auth user. Progress columns stay null until S-02 writes them.
-- Inserts come only from the auth.users trigger (no client INSERT policy).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  current_set text null,
  last_accuracy_percent real null,
  last_average_response_ms integer null,
  last_completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_current_set_check
    check (current_set is null or current_set in ('random', 'stepwise')),
  constraint profiles_last_accuracy_percent_check
    check (
      last_accuracy_percent is null
      or (last_accuracy_percent >= 0 and last_accuracy_percent <= 100)
    )
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
