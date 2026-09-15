-- Generation and publication mutations are server-owned. Clients receive read DTOs.
drop policy if exists "jobs_owner_insert" on public.generation_jobs;
drop policy if exists "assets_owner_all" on public.assets;
drop policy if exists "assets_public_read" on public.assets;
drop policy if exists "publications_owner_all" on public.publications;
create policy "assets_owner_read" on public.assets for select to authenticated using (owner_id = auth.uid());
create policy "publications_owner_read" on public.publications for select to authenticated using (owner_id = auth.uid());
drop policy if exists "private_generation_owner" on storage.objects;
create policy "private_generation_owner_read" on storage.objects for select to authenticated
  using (bucket_id = 'generation-private' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text);
create index if not exists jobs_owner_created_idx on public.generation_jobs(owner_id, created_at desc);

create or replace function public.reserve_generation(p_id uuid, p_owner uuid, p_provider text, p_model text, p_media text, p_prompt text, p_settings jsonb)
returns setof public.generation_jobs language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 0));
  if exists(select 1 from generation_jobs where id = p_id) then
    return query select * from generation_jobs where id = p_id and owner_id = p_owner;
    return;
  end if;
  if (select count(*) from generation_jobs where owner_id = p_owner and created_at > now() - interval '1 hour') >= 10
    or (select count(*) from generation_jobs where owner_id = p_owner and status in ('queued','processing') and created_at > now() - interval '20 minutes') >= 3 then
    raise exception 'generation_limit';
  end if;
  return query insert into generation_jobs(id,owner_id,provider,model,media_type,prompt,settings,status)
    values(p_id,p_owner,p_provider,p_model,p_media,p_prompt,p_settings,'queued') returning *;
end $$;
revoke all on function public.reserve_generation(uuid,uuid,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.reserve_generation(uuid,uuid,text,text,text,text,jsonb) to service_role;
