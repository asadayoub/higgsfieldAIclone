alter table public.provider_credentials add column if not exists key_version integer not null default 1;
alter table public.provider_credentials add column if not exists account_label text;
alter table public.provider_credentials add column if not exists validation_error text;
alter table public.provider_credentials add column if not exists validated_at timestamptz;
alter table public.provider_credentials add column if not exists revoked_at timestamptz;

create unique index if not exists provider_credentials_owner_provider_idx
  on public.provider_credentials (owner_id, provider);

drop policy if exists "credentials_owner_all" on public.provider_credentials;

create table if not exists public.provider_connection_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  action text not null,
  outcome text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.generation_events (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generation_jobs(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete cascade,
  status public.generation_status not null,
  progress integer,
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint generation_events_progress_check check (progress is null or (progress >= 0 and progress <= 100))
);

create table if not exists public.asset_favorites (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, asset_id)
);

create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null unique references public.assets(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  published_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.provider_connection_events enable row level security;
alter table public.generation_events enable row level security;
alter table public.asset_favorites enable row level security;
alter table public.publications enable row level security;

do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'provider_connection_events' and policyname = 'connection_events_owner_read') then create policy "connection_events_owner_read" on public.provider_connection_events for select using (owner_id = auth.uid()); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'provider_connection_events' and policyname = 'connection_events_superadmin_read') then create policy "connection_events_superadmin_read" on public.provider_connection_events for select using (public.is_superadmin()); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'generation_events' and policyname = 'generation_events_owner_read') then create policy "generation_events_owner_read" on public.generation_events for select using (owner_id = auth.uid()); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'generation_events' and policyname = 'generation_events_superadmin_read') then create policy "generation_events_superadmin_read" on public.generation_events for select using (public.is_superadmin()); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'asset_favorites' and policyname = 'favorites_owner_all') then create policy "favorites_owner_all" on public.asset_favorites for all using (owner_id = auth.uid()) with check (owner_id = auth.uid()); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'publications' and policyname = 'publications_public_read') then create policy "publications_public_read" on public.publications for select using (revoked_at is null); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'publications' and policyname = 'publications_owner_all') then create policy "publications_owner_all" on public.publications for all using (owner_id = auth.uid()) with check (owner_id = auth.uid()); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'generation_jobs' and policyname = 'jobs_superadmin_read') then create policy "jobs_superadmin_read" on public.generation_jobs for select using (public.is_superadmin()); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'assets' and policyname = 'assets_superadmin_read') then create policy "assets_superadmin_read" on public.assets for select using (public.is_superadmin()); end if; end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists provider_credentials_set_updated_at on public.provider_credentials;
create trigger provider_credentials_set_updated_at before update on public.provider_credentials for each row execute procedure public.set_updated_at();

drop trigger if exists generation_jobs_set_updated_at on public.generation_jobs;
create trigger generation_jobs_set_updated_at before update on public.generation_jobs for each row execute procedure public.set_updated_at();

drop trigger if exists provider_flags_set_updated_at on public.provider_feature_flags;
create trigger provider_flags_set_updated_at before update on public.provider_feature_flags for each row execute procedure public.set_updated_at();
