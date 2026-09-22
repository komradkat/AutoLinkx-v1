-- Baseline for AutoLinkX (task A-03).
--
-- Establishes the ground rules every later migration builds on: a schema the
-- Data API cannot reach, no accidental privileges for browser roles, and one
-- shared updated_at trigger. It intentionally creates no application tables;
-- profiles and administrator membership arrive with A-05.

-- A-private schema for data that must never be reachable through PostgREST:
-- administrator membership, rate-limit buckets, upload staging internals.
-- It is absent from `api.schemas` in supabase/config.toml, so exposure would
-- take a deliberate configuration change, not a forgotten policy.
create schema if not exists app_private;

revoke all on schema app_private from public;
revoke all on schema app_private from anon, authenticated;
grant usage on schema app_private to service_role;

-- Future objects in app_private default to no browser access.
alter default privileges in schema app_private
  revoke all on tables from anon, authenticated;
alter default privileges in schema app_private
  revoke all on functions from anon, authenticated;
alter default privileges in schema app_private
  revoke all on sequences from anon, authenticated;

-- Browser roles may reach `public`, but must not gain rights on new objects
-- implicitly: every table states its own grants alongside its RLS policies.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;

-- Shared updated_at trigger. `search_path` is pinned and objects are
-- qualified so the function cannot be captured by a caller-supplied path.
create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function app_private.set_updated_at() from public;
revoke all on function app_private.set_updated_at() from anon, authenticated;

comment on schema app_private is
  'Server-only data and helpers. Not exposed through the Data API; no anon or authenticated grants.';
comment on function app_private.set_updated_at() is
  'Trigger helper: stamps updated_at on write. Attach with `before update ... for each row`.';
