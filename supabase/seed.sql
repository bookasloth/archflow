-- Run AFTER at least one auth user exists (the profile trigger creates profiles).
-- Uses the first profile as reporter/creator.
with p as (select id from profiles limit 1),
proj as (
  insert into projects (name, code, client_name, created_by)
  select 'Residential Villa', 'VILLA-01', 'A. Client', p.id from p
  returning id
),
b as (insert into buildings (project_id, name) select id, 'Main House' from proj returning id),
f as (insert into floors (building_id, name, level_order) select id, 'Ground Floor', 0 from b returning id),
r as (insert into rooms (floor_id, name) select id, 'Kitchen' from f returning id)
insert into tickets (project_id, building_id, floor_id, room_id, type, discipline, title, status, priority, reporter_id)
select proj.id, b.id, f.id, r.id, 'site_issue', 'electrical',
  'Socket location conflict', 'open', 'high', p.id
from proj, b, f, r, p;
