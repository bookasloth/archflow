-- Slice 13: permissions foundation (admin + staff).
-- Closes two holes in the permissive baseline:
--   1) any authenticated user could DELETE any row (the `<t>_all` FOR ALL policies)
--   2) a user could self-promote to admin via profiles_update_own
-- After this: staff keep full select/insert/update on data; only admins delete or change roles.

-- Admin check as a SECURITY DEFINER function so RLS policies can call it without recursing
-- on the profiles table (the function runs as owner and bypasses profiles' own RLS).
create or replace function public.is_admin(uid uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select exists (select 1 from profiles where id = uid and role = 'admin');
$$;

-- ---- profiles: allow self-edits, but only admins may change a role -------------------
drop policy if exists profiles_update_own on profiles;

-- a user may update their own row...
create policy profiles_update_self on profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ...and admins may update any row (needed to assign roles)
create policy profiles_update_admin on profiles
  for update to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- RLS can't express "you may update every column except role", so guard the role column
-- with a trigger: a non-admin changing role is rejected.
create or replace function public.guard_profile_role()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin(auth.uid()) then
    raise exception 'only admins can change roles';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_guard on profiles;
create trigger profiles_role_guard
  before update on profiles
  for each row execute function public.guard_profile_role();

-- ---- data tables: split `<t>_all` into per-action policies; DELETE is admin-only ------
do $$
declare t text;
begin
  foreach t in array array[
    'projects','buildings','floors','rooms','tickets','attachments',
    'issue_markers','comments','drawings','drawing_revisions',
    'materials','material_attachments'
  ]
  loop
    execute format('drop policy if exists %I on %I', t || '_all', t);
    execute format('create policy %I on %I for select to authenticated using (true)', t || '_select', t);
    execute format('create policy %I on %I for insert to authenticated with check (true)', t || '_insert', t);
    execute format('create policy %I on %I for update to authenticated using (true) with check (true)', t || '_update', t);
    execute format('create policy %I on %I for delete to authenticated using (public.is_admin(auth.uid()))', t || '_delete', t);
  end loop;
end $$;

-- Bootstrap note: no admin exists yet (the signup trigger always creates 'staff', and only
-- admins can promote). Seed the first admin once, by hand:
--   update profiles set role = 'admin' where id = '<your-auth-user-id>';
