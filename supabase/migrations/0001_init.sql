-- Enums
create type role as enum ('staff','admin');
create type project_status as enum ('active','on_hold','completed','archived');
create type ticket_type as enum ('task','site_issue');
create type discipline as enum ('architectural','structural','electrical','plumbing',
  'fire_safety','interior','landscape','construction','documentation','client_coordination');
create type ticket_status as enum ('open','in_progress','resolved','verified','closed');
create type priority as enum ('low','medium','high','critical');
create type attachment_kind as enum ('before','after','reference');

-- Profiles (mirror auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role role not null default 'staff',
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  status project_status not null default 'active',
  client_name text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table buildings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null
);

create table floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  name text not null,
  level_order int not null default 0
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references floors(id) on delete cascade,
  name text not null
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  project_id uuid not null references projects(id) on delete cascade,
  building_id uuid references buildings(id) on delete set null,
  floor_id uuid references floors(id) on delete set null,
  room_id uuid references rooms(id) on delete set null,
  type ticket_type not null,
  discipline discipline not null,
  title text not null,
  description text,
  status ticket_status not null default 'open',
  priority priority not null default 'medium',
  assignee_id uuid references profiles(id) on delete set null,
  reporter_id uuid not null references profiles(id),
  due_date date,
  created_at timestamptz not null default now()
);
create index tickets_project_idx on tickets(project_id);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  storage_path text not null,
  kind attachment_kind not null default 'reference',
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table issue_markers (
  id uuid primary key default gen_random_uuid(),
  attachment_id uuid not null references attachments(id) on delete cascade,
  x real not null,
  y real not null,
  label text
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS: any authenticated staff has full access
alter table profiles enable row level security;
alter table projects enable row level security;
alter table buildings enable row level security;
alter table floors enable row level security;
alter table rooms enable row level security;
alter table tickets enable row level security;
alter table attachments enable row level security;
alter table issue_markers enable row level security;
alter table comments enable row level security;

-- profiles: read all, update own
create policy profiles_read on profiles for select to authenticated using (true);
create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- everything else: authenticated full CRUD
do $$
declare t text;
begin
  foreach t in array array['projects','buildings','floors','rooms','tickets',
    'attachments','issue_markers','comments']
  loop
    execute format('create policy %I_all on %I for all to authenticated using (true) with check (true);', t, t);
  end loop;
end $$;

-- Storage bucket + policies
insert into storage.buckets (id, name, public) values ('ticket-media','ticket-media', false)
  on conflict (id) do nothing;
create policy ticket_media_read on storage.objects for select to authenticated
  using (bucket_id = 'ticket-media');
create policy ticket_media_write on storage.objects for insert to authenticated
  with check (bucket_id = 'ticket-media');
