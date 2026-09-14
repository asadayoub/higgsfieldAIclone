create type public.app_role as enum ('tester', 'superadmin');
create type public.generation_status as enum ('draft', 'awaiting_confirmation', 'queued', 'processing', 'complete', 'failed', 'cancelled');
create type public.asset_visibility as enum ('private', 'public');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'tester',
  created_at timestamptz not null default now()
);

create table public.provider_credentials (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null, label text not null, ciphertext text not null, iv text not null, auth_tag text not null,
  fingerprint text not null, last_four text not null, is_valid boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id, provider, fingerprint)
);

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(), owner_id uuid references public.profiles(id) on delete cascade,
  provider text not null, model text not null, media_type text not null, prompt text not null, settings jsonb not null default '{}'::jsonb,
  status public.generation_status not null default 'draft', external_id text, error_code text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(), owner_id uuid references public.profiles(id) on delete cascade,
  generation_id uuid not null references public.generation_jobs(id) on delete cascade,
  storage_bucket text not null, storage_path text not null, media_type text not null,
  visibility public.asset_visibility not null default 'private', is_favorite boolean not null default false,
  created_at timestamptz not null default now(), unique(generation_id, storage_path)
);

alter table public.profiles enable row level security;
alter table public.provider_credentials enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.assets enable row level security;

create policy "profiles_read_self" on public.profiles for select using (auth.uid() = id);
create policy "credentials_owner_all" on public.provider_credentials for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "jobs_owner_read" on public.generation_jobs for select using (owner_id = auth.uid());
create policy "jobs_owner_insert" on public.generation_jobs for insert with check (owner_id = auth.uid());
create policy "assets_owner_all" on public.assets for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "assets_public_read" on public.assets for select using (visibility = 'public');

insert into storage.buckets (id, name, public) values ('showcase-public', 'showcase-public', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('generation-private', 'generation-private', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('reference-private', 'reference-private', false) on conflict do nothing;

create policy "public_showcase_read" on storage.objects for select using (bucket_id = 'showcase-public');
create policy "private_generation_owner" on storage.objects for all using (bucket_id = 'generation-private' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text) with check (bucket_id = 'generation-private' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "private_reference_owner" on storage.objects for all using (bucket_id = 'reference-private' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text) with check (bucket_id = 'reference-private' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text);
