create type material_status as enum ('proposed','approved','rejected');
create type material_category as enum
  ('flooring','wall_finish','ceiling','joinery','sanitary','lighting','hardware','paint','glazing','landscape','other');
create type material_attachment_kind as enum ('photo','datasheet');

create table materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  room_id uuid references rooms(id) on delete set null,
  category material_category not null,
  name text not null,
  manufacturer text,
  product_code text,
  finish text,
  color text,
  size text,
  cost numeric(12,2),
  supplier text,
  notes text,
  status material_status not null default 'proposed',
  decided_at timestamptz,
  decided_by uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index materials_project_idx on materials(project_id);

create table material_attachments (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materials(id) on delete cascade,
  storage_path text not null,
  kind material_attachment_kind not null default 'photo',
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table materials enable row level security;
alter table material_attachments enable row level security;
create policy materials_all on materials for all to authenticated using (true) with check (true);
create policy material_attachments_all on material_attachments for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public) values ('material-files','material-files', false)
  on conflict (id) do nothing;
create policy material_files_read on storage.objects for select to authenticated
  using (bucket_id = 'material-files');
create policy material_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'material-files');
