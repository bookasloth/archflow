-- 0012: explicit API-role grants.
-- Newer Supabase projects don't auto-grant SELECT/INSERT/UPDATE/DELETE to the API roles on
-- tables created by migrations (only REFERENCES/TRIGGER/TRUNCATE). The live project got
-- them implicitly when it was created; a fresh project (local dev, or the Mumbai move)
-- would answer "permission denied" on every table. Idempotent; a no-op where already granted.
-- Row access is still decided by RLS on every table.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to authenticated, service_role;

-- Let trusted server-side roles set roles (bootstrapping the first admin from the SQL editor
-- or a service-key script). Signed-in users are still blocked unless they're admins.
create or replace function public.guard_profile_role()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and not public.is_admin(auth.uid())
     and coalesce(auth.role(), '') <> 'service_role'
     and session_user not in ('postgres', 'supabase_admin') then
    raise exception 'only admins can change roles';
  end if;
  return new;
end;
$$;
