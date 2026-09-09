create type revision_status as enum
  ('draft','under_review','approved','approved_with_comments','changes_requested','rejected','superseded');

create table drawings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  building_id uuid references buildings(id) on delete set null,
  floor_id uuid references floors(id) on delete set null,
  discipline discipline,
  title text not null,
  drawing_number text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index drawings_project_idx on drawings(project_id);

create table drawing_revisions (
  id uuid primary key default gen_random_uuid(),
  drawing_id uuid not null references drawings(id) on delete cascade,
  revision_no int not null,
  storage_path text not null,
  status revision_status not null default 'draft',
  reviewer_id uuid references profiles(id) on delete set null,
  notes text,
  uploaded_by uuid references profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (drawing_id, revision_no)
);
create index drawing_revisions_drawing_idx on drawing_revisions(drawing_id);

alter table tickets
  add column drawing_id uuid references drawings(id) on delete set null,
  add column drawing_revision_id uuid references drawing_revisions(id) on delete set null;

alter table drawings enable row level security;
alter table drawing_revisions enable row level security;
create policy drawings_all on drawings for all to authenticated using (true) with check (true);
create policy drawing_revisions_all on drawing_revisions for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public) values ('drawing-files','drawing-files', false)
  on conflict (id) do nothing;
create policy drawing_files_read on storage.objects for select to authenticated
  using (bucket_id = 'drawing-files');
create policy drawing_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'drawing-files');
