-- Redesign R3: tags. A tag is a workspace-level label; ticket_tags links tags to tickets.
create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text,                       -- optional token key or hex; null = neutral
  created_at timestamptz default now()
);

create table ticket_tags (
  ticket_id uuid not null references tickets(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (ticket_id, tag_id)
);

alter table tags enable row level security;
alter table ticket_tags enable row level security;

-- tag definitions: everyone reads/creates/edits; only admins delete (shared vocabulary).
create policy tags_select on tags for select to authenticated using (true);
create policy tags_insert on tags for insert to authenticated with check (true);
create policy tags_update on tags for update to authenticated using (true) with check (true);
create policy tags_delete on tags for delete to authenticated using (public.is_admin(auth.uid()));

-- links: tagging/untagging a ticket is routine staff work, so delete is allowed here.
create policy ticket_tags_select on ticket_tags for select to authenticated using (true);
create policy ticket_tags_insert on ticket_tags for insert to authenticated with check (true);
create policy ticket_tags_delete on ticket_tags for delete to authenticated using (true);
