-- Opt-in public showcase metadata and stable keyset pagination.
-- Additive and rerunnable. Existing public links remain unlisted.

alter table public.publications
  add column if not exists is_showcase_listed boolean not null default false;
alter table public.publications
  add column if not exists public_title text;
alter table public.publications
  add column if not exists public_category text;
alter table public.publications
  add column if not exists public_alt_text text;
alter table public.publications
  add column if not exists showcase_status text not null default 'visible';
alter table public.publications
  add column if not exists showcase_listed_at timestamptz;
alter table public.publications
  add column if not exists showcase_updated_at timestamptz;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'publications_showcase_status_check'
      and conrelid = 'public.publications'::regclass
  ) then
    alter table public.publications
      add constraint publications_showcase_status_check
      check (showcase_status in ('visible','hidden'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'publications_public_title_check'
      and conrelid = 'public.publications'::regclass
  ) then
    alter table public.publications
      add constraint publications_public_title_check
      check (
        public_title is null
        or char_length(btrim(public_title)) between 1 and 100
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'publications_public_category_check'
      and conrelid = 'public.publications'::regclass
  ) then
    alter table public.publications
      add constraint publications_public_category_check
      check (
        public_category is null
        or public_category in (
          'fashion',
          'cinematic',
          'architecture',
          'product',
          'graphic',
          'surreal',
          'lifestyle'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'publications_public_alt_text_check'
      and conrelid = 'public.publications'::regclass
  ) then
    alter table public.publications
      add constraint publications_public_alt_text_check
      check (
        public_alt_text is null
        or char_length(btrim(public_alt_text)) between 3 and 240
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'publications_showcase_listing_check'
      and conrelid = 'public.publications'::regclass
  ) then
    alter table public.publications
      add constraint publications_showcase_listing_check
      check (
        not is_showcase_listed
        or (
          public_title is not null
          and public_category is not null
          and public_alt_text is not null
          and showcase_listed_at is not null
        )
      );
  end if;
end $$;

create or replace function public.touch_publication_showcase()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_showcase_listed and new.showcase_listed_at is null then
      new.showcase_listed_at = now();
    end if;
    if new.is_showcase_listed
      or new.public_title is not null
      or new.public_category is not null
      or new.public_alt_text is not null
      or new.showcase_status <> 'visible' then
      new.showcase_updated_at = coalesce(new.showcase_updated_at,now());
    end if;
    return new;
  end if;

  if new.is_showcase_listed is distinct from old.is_showcase_listed
    or new.public_title is distinct from old.public_title
    or new.public_category is distinct from old.public_category
    or new.public_alt_text is distinct from old.public_alt_text
    or new.showcase_status is distinct from old.showcase_status then
    new.showcase_updated_at = now();
  end if;

  if new.is_showcase_listed
    and (
      old.is_showcase_listed is false
      or new.showcase_listed_at is null
    ) then
    new.showcase_listed_at = now();
  end if;

  return new;
end $$;

drop trigger if exists publications_touch_showcase on public.publications;
create trigger publications_touch_showcase
before insert or update on public.publications
for each row execute function public.touch_publication_showcase();

create index if not exists publications_showcase_cursor_idx
  on public.publications(showcase_listed_at desc,id desc)
  where is_showcase_listed = true
    and revoked_at is null
    and showcase_status = 'visible';

-- Publication writes stay server-owned. Authenticated owners retain the
-- existing read policy; anonymous discovery is served through a safe DTO.
revoke all on table public.publications from anon;
revoke insert,update,delete on table public.publications from authenticated;
grant select on table public.publications to authenticated;

comment on column public.publications.is_showcase_listed is
  'Owner opt-in for discoverability in Explore; public-link sharing alone does not list an asset.';
comment on column public.publications.public_title is
  'Owner-approved public title. Private generation prompts are never used as an implicit fallback.';
comment on column public.publications.public_category is
  'Owner-approved category from the public showcase taxonomy.';
comment on column public.publications.public_alt_text is
  'Owner-approved public accessibility description, independent of the private prompt.';
comment on column public.publications.showcase_status is
  'Administrative visibility state for an otherwise owner-listed publication.';
comment on column public.publications.showcase_listed_at is
  'Most recent time the owner opted the publication into Explore; used for stable feed ordering.';
