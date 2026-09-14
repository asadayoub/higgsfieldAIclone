create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'superadmin') $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))) on conflict (id) do nothing; return new; end $$;

create or replace trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1)) from auth.users
on conflict (id) do nothing;

create table if not exists public.provider_feature_flags (
  provider text primary key, image_enabled boolean not null default false, video_enabled boolean not null default false,
  maintenance_message text, updated_by uuid references public.profiles(id), updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(), actor_id uuid not null references public.profiles(id), action text not null,
  target_type text not null, target_id text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

alter table public.provider_feature_flags enable row level security;
alter table public.admin_audit_events enable row level security;

do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_superadmin_read') then create policy "profiles_superadmin_read" on public.profiles for select using (public.is_superadmin()); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_superadmin_update') then create policy "profiles_superadmin_update" on public.profiles for update using (public.is_superadmin()) with check (public.is_superadmin()); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'provider_feature_flags' and policyname = 'flags_authenticated_read') then create policy "flags_authenticated_read" on public.provider_feature_flags for select to authenticated using (true); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'provider_feature_flags' and policyname = 'flags_superadmin_all') then create policy "flags_superadmin_all" on public.provider_feature_flags for all using (public.is_superadmin()) with check (public.is_superadmin()); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_audit_events' and policyname = 'audit_superadmin_read') then create policy "audit_superadmin_read" on public.admin_audit_events for select using (public.is_superadmin()); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_audit_events' and policyname = 'audit_superadmin_insert') then create policy "audit_superadmin_insert" on public.admin_audit_events for insert with check (public.is_superadmin() and actor_id = auth.uid()); end if; end $$;

insert into public.provider_feature_flags (provider, image_enabled, video_enabled)
values ('guided', true, true), ('openai', false, false), ('replicate', false, false)
on conflict (provider) do nothing;
