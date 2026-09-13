-- Redesign R3: documents (lightweight block docs).
-- project_id null  => a workspace-level page; set => a project note/doc.
-- content is an ordered array of blocks stored as JSON (no per-block table — keeps the
-- editor lightweight and avoids migration churn per block type).
create table documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null default 'Untitled',
  content jsonb not null default '[]'::jsonb,
  icon text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index documents_project_idx on documents(project_id);

alter table documents enable row level security;
create policy documents_select on documents for select to authenticated using (true);
create policy documents_insert on documents for insert to authenticated with check (true);
create policy documents_update on documents for update to authenticated using (true) with check (true);
create policy documents_delete on documents for delete to authenticated using (public.is_admin(auth.uid()));
