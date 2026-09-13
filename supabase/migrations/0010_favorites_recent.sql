-- Redesign R3: favorites + recently-viewed. Per-user; entity_type is an app-level string
-- ('project'|'ticket'|'drawing'|'material'|'document') with no cross-table FK (same
-- app-layer-integrity convention used for spatial refs). Each user sees only their own rows.
create table favorites (
  user_id uuid not null references profiles(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz default now(),
  primary key (user_id, entity_type, entity_id)
);

create table recently_viewed (
  user_id uuid not null references profiles(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  viewed_at timestamptz not null default now(),
  primary key (user_id, entity_type, entity_id)
);

alter table favorites enable row level security;
alter table recently_viewed enable row level security;

create policy favorites_own on favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy recently_viewed_own on recently_viewed for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
