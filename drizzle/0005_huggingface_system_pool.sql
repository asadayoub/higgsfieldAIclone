-- Encrypted Hugging Face system credential pool, atomic leasing, and provider-aware quota reservation.
-- Additive and rerunnable. All execution controls start disabled.

alter table public.generation_jobs add column if not exists system_credential_id uuid;
alter table public.generation_jobs add column if not exists provider_attempt_count integer not null default 0;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'generation_jobs_provider_attempt_count_check') then
    alter table public.generation_jobs add constraint generation_jobs_provider_attempt_count_check
      check (provider_attempt_count >= 0 and provider_attempt_count <= 10);
  end if;
end $$;

create table if not exists public.system_provider_credentials (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('huggingface')),
  label text not null check (char_length(label) between 1 and 80),
  ciphertext text,
  iv text,
  auth_tag text,
  fingerprint text not null,
  last_four text not null check (char_length(last_four) = 4),
  provider_account_hash text not null,
  key_version integer not null default 1 check (key_version > 0),
  status text not null default 'active'
    check (status in ('active','draining','cooldown','exhausted','invalid','disabled','revoked')),
  priority integer not null default 100 check (priority between 0 and 1000),
  max_concurrency integer not null default 1 check (max_concurrency between 1 and 10),
  active_leases integer not null default 0 check (active_leases >= 0),
  cooldown_until timestamptz,
  allowed_media text[] not null default array['image']::text[],
  allowed_models text[] not null default '{}'::text[],
  validation_status text not null default 'valid'
    check (validation_status in ('valid','unreachable','invalid','unknown')),
  validation_error_code text,
  validated_at timestamptz,
  last_selected_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  request_limit_daily integer not null default 5 check (request_limit_daily between 1 and 1000),
  requests_used_today integer not null default 0 check (requests_used_today >= 0),
  usage_date date not null default ((now() at time zone 'utc')::date),
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  secret_erased_at timestamptz,
  constraint system_provider_credentials_fingerprint_unique unique(provider,fingerprint),
  constraint system_provider_credentials_secret_state_check check (
    (status = 'revoked' and ciphertext is null and iv is null and auth_tag is null and revoked_at is not null and secret_erased_at is not null)
    or
    (status <> 'revoked' and ciphertext is not null and iv is not null and auth_tag is not null and revoked_at is null and secret_erased_at is null)
  ),
  constraint system_provider_credentials_media_check check (
    cardinality(allowed_media) > 0 and allowed_media <@ array['image']::text[]
  ),
  constraint system_provider_credentials_models_check check (cardinality(allowed_models) > 0)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'generation_jobs_system_credential_id_fkey') then
    alter table public.generation_jobs add constraint generation_jobs_system_credential_id_fkey
      foreign key (system_credential_id) references public.system_provider_credentials(id) on delete set null;
  end if;
end $$;

create table if not exists public.system_credential_leases (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.system_provider_credentials(id),
  generation_id uuid not null references public.generation_jobs(id) on delete cascade,
  attempt_number integer not null check (attempt_number between 1 and 10),
  state text not null default 'active'
    check (state in ('active','completed','failed','expired','ambiguous')),
  leased_at timestamptz not null default now(),
  expires_at timestamptz not null,
  released_at timestamptz,
  safe_error_code text,
  constraint system_credential_lease_time_check check (expires_at > leased_at),
  constraint system_credential_lease_release_check check (
    (state = 'active' and released_at is null)
    or (state <> 'active' and released_at is not null)
  ),
  constraint system_credential_attempt_unique unique(generation_id,attempt_number)
);

create table if not exists public.provider_generation_attempts (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generation_jobs(id) on delete cascade,
  credential_id uuid references public.system_provider_credentials(id) on delete set null,
  lease_id uuid references public.system_credential_leases(id) on delete set null,
  attempt_number integer not null check (attempt_number between 1 and 10),
  provider text not null,
  model text not null,
  outcome text not null default 'started'
    check (outcome in ('started','accepted','complete','rejected','failed','ambiguous')),
  provider_request_id text,
  http_status integer check (http_status is null or http_status between 100 and 599),
  safe_error_code text,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  usage jsonb,
  actual_cost_usd numeric(12,6) check (actual_cost_usd is null or actual_cost_usd >= 0),
  started_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint provider_generation_attempt_unique unique(generation_id,attempt_number)
);

create unique index if not exists system_credential_active_generation_idx
  on public.system_credential_leases(generation_id) where state = 'active';
create index if not exists system_credentials_selection_idx
  on public.system_provider_credentials(provider,status,priority desc,active_leases,last_selected_at);
create index if not exists system_credentials_account_idx
  on public.system_provider_credentials(provider,provider_account_hash,status);
create index if not exists system_credential_leases_expiry_idx
  on public.system_credential_leases(state,expires_at);
create index if not exists provider_attempts_generation_idx
  on public.provider_generation_attempts(generation_id,attempt_number);
create index if not exists provider_attempts_credential_created_idx
  on public.provider_generation_attempts(credential_id,created_at desc);
create index if not exists generation_jobs_system_credential_idx
  on public.generation_jobs(system_credential_id,created_at desc);

alter table public.system_provider_credentials enable row level security;
alter table public.system_credential_leases enable row level security;
alter table public.provider_generation_attempts enable row level security;

revoke all on table public.system_provider_credentials from public,anon,authenticated;
revoke all on table public.system_credential_leases from public,anon,authenticated;
revoke all on table public.provider_generation_attempts from public,anon,authenticated;

insert into public.provider_feature_flags
  (provider,image_enabled,video_enabled,system_image_enabled,system_video_enabled,personal_image_enabled,personal_video_enabled)
values ('huggingface',false,false,false,false,false,false)
on conflict (provider) do nothing;

drop trigger if exists system_provider_credentials_set_updated_at on public.system_provider_credentials;
create trigger system_provider_credentials_set_updated_at
before update on public.system_provider_credentials for each row execute procedure public.set_updated_at();

create or replace function public.reserve_system_generation(
  p_id uuid,
  p_owner uuid,
  p_provider text,
  p_model text,
  p_media text,
  p_prompt text,
  p_settings jsonb,
  p_capability_snapshot jsonb,
  p_global_daily_limit integer default 10
)
returns setof public.generation_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quota_date date := (now() at time zone 'utc')::date;
  v_user_used integer;
  v_global_used integer;
begin
  if p_provider not in ('openrouter','huggingface') or p_media not in ('image','video')
    or p_global_daily_limit < 1 or p_global_daily_limit > 1000 then
    raise exception 'invalid_generation_configuration';
  end if;
  if p_provider = 'huggingface' and p_media <> 'image' then
    raise exception 'invalid_generation_configuration';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
  if exists(select 1 from public.generation_jobs where id = p_id) then
    return query select * from public.generation_jobs where id = p_id and owner_id = p_owner;
    return;
  end if;

  if (select count(*) from public.generation_jobs where owner_id = p_owner and created_at > now() - interval '1 hour') >= 10
    or (select count(*) from public.generation_jobs where owner_id = p_owner and status::text in ('queued','processing','saving') and created_at > now() - interval '20 minutes') >= 3 then
    raise exception 'generation_limit';
  end if;
  if not exists(select 1 from auth.users where id = p_owner and email_confirmed_at is not null) then
    raise exception 'verified_email_required';
  end if;

  -- This lock string intentionally matches the existing OpenRouter reservation
  -- function so both providers serialize against the same shared quota ledger.
  perform pg_advisory_xact_lock(hashtextextended('openrouter-system:' || v_quota_date::text,0));
  select count(*) into v_user_used from public.generation_quota_reservations
    where owner_id = p_owner and quota_date = v_quota_date and state in ('reserved','consumed');
  if v_user_used >= 3 then raise exception 'daily_allowance_exhausted'; end if;
  select count(*) into v_global_used from public.generation_quota_reservations r
    join public.generation_jobs j on j.id = r.generation_id
    where r.quota_date = v_quota_date and r.state in ('reserved','consumed') and j.provider = p_provider;
  if v_global_used >= p_global_daily_limit then raise exception 'system_daily_limit'; end if;

  insert into public.generation_jobs(
    id,owner_id,provider,model,media_type,prompt,settings,status,
    funding_source,quota_date,quota_state,resolved_model,endpoint_tag,capability_snapshot
  ) values (
    p_id,p_owner,p_provider,p_model,p_media,p_prompt,p_settings,'queued',
    'system_free',v_quota_date,'reserved',p_model,
    case
      when p_provider = 'huggingface' then 'huggingface.textToImage'
      when p_media = 'video' then 'openrouter.videos.create'
      else 'openrouter.images.create'
    end,
    p_capability_snapshot
  );
  insert into public.generation_quota_reservations(generation_id,owner_id,quota_date,state)
    values (p_id,p_owner,v_quota_date,'reserved');
  return query select * from public.generation_jobs where id = p_id and owner_id = p_owner;
end $$;

create or replace function public.acquire_system_credential(
  p_generation uuid,
  p_provider text,
  p_media text,
  p_model text,
  p_lease_seconds integer default 300
)
returns table(credential_id uuid,lease_id uuid,attempt_number integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credential public.system_provider_credentials%rowtype;
  v_lease uuid;
  v_attempt integer;
begin
  if p_provider <> 'huggingface' or p_media <> 'image' or p_lease_seconds < 30 or p_lease_seconds > 900 then
    raise exception 'invalid_lease_request';
  end if;
  if not exists(select 1 from public.generation_jobs where id = p_generation and provider = p_provider and model = p_model and status::text in ('queued','processing')) then
    raise exception 'generation_not_leaseable';
  end if;

  update public.system_credential_leases
    set state = 'expired',released_at = now(),safe_error_code = 'lease_expired'
    where state = 'active' and expires_at <= now();
  update public.system_provider_credentials c set active_leases = (
    select count(*) from public.system_credential_leases l where l.credential_id = c.id and l.state = 'active'
  ) where c.provider = p_provider;

  select * into v_credential from public.system_provider_credentials c
    where c.provider = p_provider
      and c.status in ('active','cooldown')
      and (c.cooldown_until is null or c.cooldown_until <= now())
      and p_media = any(c.allowed_media)
      and p_model = any(c.allowed_models)
      and c.active_leases < c.max_concurrency
      and (c.usage_date <> (now() at time zone 'utc')::date or c.requests_used_today < c.request_limit_daily)
    order by c.priority desc,c.active_leases asc,c.last_selected_at asc nulls first,c.created_at asc
    for update skip locked limit 1;
  if v_credential.id is null then raise exception 'system_credential_unavailable'; end if;

  update public.system_provider_credentials set
    usage_date = (now() at time zone 'utc')::date,
    requests_used_today = case when usage_date = (now() at time zone 'utc')::date then requests_used_today + 1 else 1 end,
    active_leases = active_leases + 1,
    last_selected_at = now(),
    status = 'active',
    cooldown_until = null
    where id = v_credential.id;
  select coalesce(max(l.attempt_number),0) + 1 into v_attempt from public.system_credential_leases l where l.generation_id = p_generation;
  if v_attempt > 2 then raise exception 'provider_attempt_limit'; end if;
  insert into public.system_credential_leases(credential_id,generation_id,attempt_number,expires_at)
    values (v_credential.id,p_generation,v_attempt,now() + make_interval(secs => p_lease_seconds)) returning id into v_lease;
  update public.generation_jobs set system_credential_id = v_credential.id,provider_attempt_count = v_attempt
    where id = p_generation;
  return query select v_credential.id,v_lease,v_attempt;
end $$;

create or replace function public.settle_system_credential_lease(
  p_lease uuid,
  p_lease_state text,
  p_credential_status text default null,
  p_cooldown_seconds integer default null,
  p_safe_error_code text default null,
  p_success boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credential uuid;
  v_changed integer;
begin
  if p_lease_state not in ('completed','failed','ambiguous')
    or (p_credential_status is not null and p_credential_status not in ('active','cooldown','exhausted','invalid','disabled'))
    or (p_cooldown_seconds is not null and (p_cooldown_seconds < 1 or p_cooldown_seconds > 86400)) then
    raise exception 'invalid_lease_settlement';
  end if;
  select credential_id into v_credential from public.system_credential_leases where id = p_lease for update;
  if v_credential is null then return false; end if;
  update public.system_credential_leases set state = p_lease_state,released_at = now(),safe_error_code = p_safe_error_code
    where id = p_lease and state = 'active';
  get diagnostics v_changed = row_count;
  if v_changed = 0 then return false; end if;
  update public.system_provider_credentials set
    active_leases = greatest(0,active_leases - 1),
    status = case
      when status in ('draining','disabled','revoked') then status
      else coalesce(p_credential_status,status)
    end,
    cooldown_until = case
      when p_credential_status = 'cooldown' then now() + make_interval(secs => coalesce(p_cooldown_seconds,60))
      when p_credential_status is null then cooldown_until
      else null
    end,
    last_success_at = case when p_success then now() else last_success_at end,
    last_failure_at = case when p_success then last_failure_at else now() end,
    consecutive_failures = case when p_success then 0 else consecutive_failures + 1 end,
    validation_status = case when p_credential_status = 'invalid' then 'invalid' else validation_status end,
    validation_error_code = case when p_success then null else p_safe_error_code end
    where id = v_credential;
  return true;
end $$;

revoke all on function public.reserve_system_generation(uuid,uuid,text,text,text,text,jsonb,jsonb,integer) from public,anon,authenticated;
revoke all on function public.acquire_system_credential(uuid,text,text,text,integer) from public,anon,authenticated;
revoke all on function public.settle_system_credential_lease(uuid,text,text,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.reserve_system_generation(uuid,uuid,text,text,text,text,jsonb,jsonb,integer) to service_role;
grant execute on function public.acquire_system_credential(uuid,text,text,text,integer) to service_role;
grant execute on function public.settle_system_credential_lease(uuid,text,text,integer,text,boolean) to service_role;
