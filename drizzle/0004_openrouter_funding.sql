-- OpenRouter funding provenance, atomic daily allowance, and independent controls.
-- Additive and rerunnable; legacy provider jobs remain readable.

alter type public.generation_status add value if not exists 'saving' after 'processing';

alter table public.generation_jobs add column if not exists funding_source text;
alter table public.generation_jobs add column if not exists quota_date date;
alter table public.generation_jobs add column if not exists quota_state text;
alter table public.generation_jobs add column if not exists resolved_model text;
alter table public.generation_jobs add column if not exists endpoint_tag text;
alter table public.generation_jobs add column if not exists actual_cost_usd numeric(12,6);
alter table public.generation_jobs add column if not exists usage jsonb;
alter table public.generation_jobs add column if not exists capability_snapshot jsonb;
alter table public.generation_jobs add column if not exists reconciliation_code text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'generation_jobs_funding_source_check') then
    alter table public.generation_jobs add constraint generation_jobs_funding_source_check
      check (funding_source is null or funding_source in ('system_free','personal_key'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'generation_jobs_quota_state_check') then
    alter table public.generation_jobs add constraint generation_jobs_quota_state_check
      check (quota_state is null or quota_state in ('reserved','consumed','released'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'generation_jobs_cost_check') then
    alter table public.generation_jobs add constraint generation_jobs_cost_check
      check (actual_cost_usd is null or actual_cost_usd >= 0);
  end if;
end $$;

alter table public.provider_feature_flags add column if not exists system_image_enabled boolean not null default false;
alter table public.provider_feature_flags add column if not exists system_video_enabled boolean not null default false;
alter table public.provider_feature_flags add column if not exists personal_image_enabled boolean not null default false;
alter table public.provider_feature_flags add column if not exists personal_video_enabled boolean not null default false;

insert into public.provider_feature_flags
  (provider,image_enabled,video_enabled,system_image_enabled,system_video_enabled,personal_image_enabled,personal_video_enabled)
values ('openrouter',false,false,false,false,false,false)
on conflict (provider) do nothing;

create table if not exists public.generation_quota_reservations (
  generation_id uuid primary key references public.generation_jobs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  quota_date date not null,
  state text not null default 'reserved' check (state in ('reserved','consumed','released')),
  reserved_at timestamptz not null default now(),
  consumed_at timestamptz,
  released_at timestamptz,
  constraint generation_quota_timestamps_check check (
    (state = 'reserved' and consumed_at is null and released_at is null)
    or (state = 'consumed' and consumed_at is not null and released_at is null)
    or (state = 'released' and released_at is not null)
  )
);

create index if not exists generation_quota_owner_day_state_idx
  on public.generation_quota_reservations(owner_id,quota_date,state);
create unique index if not exists generation_quota_identity_idx
  on public.generation_quota_reservations(generation_id,owner_id,quota_date);
create index if not exists generation_quota_day_state_idx
  on public.generation_quota_reservations(quota_date,state);
create index if not exists jobs_funding_created_idx
  on public.generation_jobs(funding_source,created_at desc);

create or replace function public.protect_generation_execution_identity()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.funding_source is distinct from new.funding_source
    or old.quota_date is distinct from new.quota_date
    or old.resolved_model is distinct from new.resolved_model
    or old.endpoint_tag is distinct from new.endpoint_tag
    or old.capability_snapshot is distinct from new.capability_snapshot then
    raise exception 'generation_execution_identity_is_immutable';
  end if;
  return new;
end $$;

drop trigger if exists protect_generation_execution_identity on public.generation_jobs;
create trigger protect_generation_execution_identity
before update on public.generation_jobs for each row
execute function public.protect_generation_execution_identity();

alter table public.generation_quota_reservations enable row level security;
drop policy if exists "quota_owner_read" on public.generation_quota_reservations;
create policy "quota_owner_read" on public.generation_quota_reservations
  for select to authenticated using (owner_id = auth.uid());
drop policy if exists "quota_superadmin_read" on public.generation_quota_reservations;
create policy "quota_superadmin_read" on public.generation_quota_reservations
  for select to authenticated using (public.is_superadmin());

create or replace function public.reserve_openrouter_generation(
  p_id uuid,
  p_owner uuid,
  p_model text,
  p_media text,
  p_prompt text,
  p_settings jsonb,
  p_funding_source text,
  p_capability_snapshot jsonb,
  p_global_daily_limit integer default 30
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
  if p_funding_source not in ('system_free','personal_key') then
    raise exception 'invalid_funding_source';
  end if;
  if p_media not in ('image','video') or p_global_daily_limit < 1 or p_global_daily_limit > 1000 then
    raise exception 'invalid_generation_configuration';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 0));

  if exists(select 1 from public.generation_jobs where id = p_id) then
    return query select * from public.generation_jobs where id = p_id and owner_id = p_owner;
    return;
  end if;

  if (select count(*) from public.generation_jobs where owner_id = p_owner and created_at > now() - interval '1 hour') >= 10
    or (select count(*) from public.generation_jobs where owner_id = p_owner and status::text in ('queued','processing','saving') and created_at > now() - interval '20 minutes') >= 3 then
    raise exception 'generation_limit';
  end if;

  if p_funding_source = 'system_free' then
    if not exists(select 1 from auth.users where id = p_owner and email_confirmed_at is not null) then
      raise exception 'verified_email_required';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('openrouter-system:' || v_quota_date::text, 0));
    select count(*) into v_user_used
      from public.generation_quota_reservations
      where owner_id = p_owner and quota_date = v_quota_date and state in ('reserved','consumed');
    if v_user_used >= 3 then raise exception 'daily_allowance_exhausted'; end if;
    select count(*) into v_global_used
      from public.generation_quota_reservations
      where quota_date = v_quota_date and state in ('reserved','consumed');
    if v_global_used >= p_global_daily_limit then raise exception 'system_daily_limit'; end if;
  end if;

  insert into public.generation_jobs(
    id,owner_id,provider,model,media_type,prompt,settings,status,
    funding_source,quota_date,quota_state,resolved_model,endpoint_tag,capability_snapshot
  ) values (
    p_id,p_owner,'openrouter',p_model,p_media,p_prompt,p_settings,'queued',
    p_funding_source,
    case when p_funding_source = 'system_free' then v_quota_date else null end,
    case when p_funding_source = 'system_free' then 'reserved' else null end,
    p_model,
    case when p_media = 'image' then 'openrouter.images.create' else 'openrouter.videos.create' end,
    p_capability_snapshot
  );

  if p_funding_source = 'system_free' then
    insert into public.generation_quota_reservations(generation_id,owner_id,quota_date,state)
      values (p_id,p_owner,v_quota_date,'reserved');
  end if;

  return query select * from public.generation_jobs where id = p_id and owner_id = p_owner;
end $$;

create or replace function public.consume_generation_quota(p_owner uuid,p_generation uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_changed integer;
begin
  update public.generation_quota_reservations
    set state = 'consumed', consumed_at = coalesce(consumed_at,now()), released_at = null
    where generation_id = p_generation and owner_id = p_owner and state = 'reserved';
  get diagnostics v_changed = row_count;
  if v_changed > 0 then
    update public.generation_jobs set quota_state = 'consumed'
      where id = p_generation and owner_id = p_owner and funding_source = 'system_free';
  end if;
  return v_changed > 0;
end $$;

create or replace function public.release_generation_quota(p_owner uuid,p_generation uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_changed integer;
begin
  update public.generation_quota_reservations
    set state = 'released', released_at = coalesce(released_at,now())
    where generation_id = p_generation and owner_id = p_owner and state = 'reserved';
  get diagnostics v_changed = row_count;
  if v_changed > 0 then
    update public.generation_jobs set quota_state = 'released'
      where id = p_generation and owner_id = p_owner and funding_source = 'system_free';
  end if;
  return v_changed > 0;
end $$;

revoke all on table public.generation_quota_reservations from public,anon,authenticated;
grant select on table public.generation_quota_reservations to authenticated;
revoke all on function public.reserve_openrouter_generation(uuid,uuid,text,text,text,jsonb,text,jsonb,integer) from public,anon,authenticated;
revoke all on function public.consume_generation_quota(uuid,uuid) from public,anon,authenticated;
revoke all on function public.release_generation_quota(uuid,uuid) from public,anon,authenticated;
revoke all on function public.protect_generation_execution_identity() from public,anon,authenticated;
grant execute on function public.reserve_openrouter_generation(uuid,uuid,text,text,text,jsonb,text,jsonb,integer) to service_role;
grant execute on function public.consume_generation_quota(uuid,uuid) to service_role;
grant execute on function public.release_generation_quota(uuid,uuid) to service_role;
