-- Profiles, private contacts, and administrator membership (task A-05).
--
-- Three separate places, because row-level security filters rows and not
-- columns:
--
--   public.profiles          public projection; anyone may read it
--   app_private.user_contacts private values plus the consent flags
--   app_private.administrators membership; no browser role can see or write it
--
-- Browser roles get no direct write on any of them. Changes go through
-- public.update_profile(), which derives the actor from auth.uid().

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  location text check (location is null or char_length(location) <= 120),
  -- Mirrors of app_private.user_contacts, written only when consent is given.
  published_email text check (published_email is null or char_length(published_email) <= 254),
  published_phone text check (published_phone is null or char_length(published_phone) <= 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Public seller projection. Contains only values the owner explicitly published.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function app_private.set_updated_at();

alter table public.profiles enable row level security;

-- Readable by everyone: this is the public seller panel on a car page.
create policy profiles_public_read on public.profiles
  for select using (true);

-- No insert, update, or delete policy exists, so direct writes are denied even
-- for the owner. update_profile() is the only way in.

grant select on public.profiles to anon, authenticated;

-- ----------------------------------------------------------- user contacts

create table app_private.user_contacts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  contact_email text check (contact_email is null or char_length(contact_email) <= 254),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 32),
  -- Consent defaults to off: nothing is ever published by accident.
  publish_email boolean not null default false,
  publish_phone boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table app_private.user_contacts is
  'Private contact values and publication consent. Never exposed through the Data API.';

create trigger user_contacts_set_updated_at
  before update on app_private.user_contacts
  for each row execute function app_private.set_updated_at();

alter table app_private.user_contacts enable row level security;

-- ------------------------------------------------------------- membership

create table app_private.administrators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now()
);

comment on table app_private.administrators is
  'Administrator membership. Operator-granted only; never writable from a session.';

alter table app_private.administrators enable row level security;

-- No policies and no grants: only the service role reaches these two tables.

-- --------------------------------------------------------- identity helper

/*
 * Answers "is the caller an administrator?" and nothing else. It deliberately
 * takes no user argument: a lookup by id would let any signed-in user
 * enumerate administrators. Security definer so policies can call it without
 * granting anyone access to the membership table itself.
 */
create or replace function public.is_current_user_administrator()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select exists (
    select 1
    from app_private.administrators a
    where a.user_id = (select auth.uid())
  );
$$;

-- Supabase grants EXECUTE on new public functions to anon and authenticated by
-- default, so revoking from PUBLIC is not enough: name the roles explicitly.
revoke all on function public.is_current_user_administrator() from public, anon, authenticated;
grant execute on function public.is_current_user_administrator() to authenticated;

-- ---------------------------------------------------- profile initialisation

/*
 * Creates the profile and contact rows for a new account. Tolerates retries
 * and partial onboarding: a repeated call changes nothing. The display name
 * comes from sign-up metadata, which the user controls — it names them, it
 * never grants them anything.
 */
create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    left(
      coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'Member'),
      60
    )
  )
  on conflict (user_id) do nothing;

  insert into app_private.user_contacts (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

-- --------------------------------------------------------- profile updates

/*
 * The only way to change a profile. The actor is auth.uid(), so a caller
 * cannot name a different user, cannot reach administrator membership, and
 * cannot publish a contact value they have not stored.
 */
create or replace function public.update_profile(
  p_display_name text,
  p_location text,
  p_contact_email text,
  p_contact_phone text,
  p_publish_email boolean,
  p_publish_phone boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor uuid := (select auth.uid());
  v_display_name text := btrim(coalesce(p_display_name, ''));
  v_location text := nullif(btrim(coalesce(p_location, '')), '');
  v_contact_email text := nullif(btrim(coalesce(p_contact_email, '')), '');
  v_contact_phone text := nullif(btrim(coalesce(p_contact_phone, '')), '');
begin
  if v_actor is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  if char_length(v_display_name) < 1 or char_length(v_display_name) > 60 then
    raise exception 'display_name_invalid' using errcode = '22023';
  end if;

  if v_location is not null and char_length(v_location) > 120 then
    raise exception 'location_invalid' using errcode = '22023';
  end if;

  insert into app_private.user_contacts (
    user_id, contact_email, contact_phone, publish_email, publish_phone
  )
  values (
    v_actor, v_contact_email, v_contact_phone,
    coalesce(p_publish_email, false), coalesce(p_publish_phone, false)
  )
  on conflict (user_id) do update
    set contact_email = excluded.contact_email,
        contact_phone = excluded.contact_phone,
        publish_email = excluded.publish_email,
        publish_phone = excluded.publish_phone;

  -- A value is published only when it exists *and* consent is given, so
  -- revoking consent or clearing the value both remove it from the profile.
  insert into public.profiles (user_id, display_name, location, published_email, published_phone)
  values (
    v_actor,
    v_display_name,
    v_location,
    case when coalesce(p_publish_email, false) then v_contact_email end,
    case when coalesce(p_publish_phone, false) then v_contact_phone end
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        location = excluded.location,
        published_email = excluded.published_email,
        published_phone = excluded.published_phone;
end;
$$;

revoke all on function public.update_profile(text, text, text, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.update_profile(text, text, text, text, boolean, boolean) to authenticated;

/*
 * The owner's own private values, for the profile form. Returns one row at
 * most, always the caller's.
 */
create or replace function public.get_my_contacts()
returns table (
  contact_email text,
  contact_phone text,
  publish_email boolean,
  publish_phone boolean
)
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select c.contact_email, c.contact_phone, c.publish_email, c.publish_phone
  from app_private.user_contacts c
  where c.user_id = (select auth.uid());
$$;

revoke all on function public.get_my_contacts() from public, anon, authenticated;
grant execute on function public.get_my_contacts() to authenticated;

-- ------------------------------------------------- operator-only bootstrap

/*
 * Grants administrator membership. `app_private` is not exposed through the
 * Data API, so even the service role cannot write the table directly — this
 * function is the only door, and only the service role may open it.
 *
 * A-06 wraps it in an operator command that takes credentials explicitly; no
 * usable password or membership is ever shipped in the repository.
 */
create or replace function public.grant_administrator(p_user_id uuid, p_granted_by uuid default null)
returns void
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  if p_user_id is null then
    raise exception 'user_required' using errcode = '22023';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'user_not_found' using errcode = '23503';
  end if;

  insert into app_private.administrators (user_id, granted_by)
  values (p_user_id, p_granted_by)
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.grant_administrator(uuid, uuid) from public, anon, authenticated;
grant execute on function public.grant_administrator(uuid, uuid) to service_role;

create or replace function public.revoke_administrator(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  delete from app_private.administrators where user_id = p_user_id;
end;
$$;

revoke all on function public.revoke_administrator(uuid) from public, anon, authenticated;
grant execute on function public.revoke_administrator(uuid) to service_role;
