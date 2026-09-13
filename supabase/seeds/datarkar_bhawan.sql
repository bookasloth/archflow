-- Seed: "Datarkar Bhawan" — a completed project, fully backfilled 2026-01-01 → 2026-06-30.
-- Idempotent-ish: re-running creates a second copy. To reset, delete the project first:
--   delete from projects where name = 'Datarkar Bhawan';   (cascades to tickets/drawings/materials/docs)
-- Requires migrations 0001–0010 applied. Reporter/assignee/creator = the admin below.

do $$
declare
  v_admin uuid;
  v_proj  uuid;
  v_bldg  uuid;
  v_gf uuid; v_ff uuid; v_sf uuid;
  v_lobby uuid; v_recep uuid; v_hall uuid; v_pantry uuid; v_toilet uuid;
  v_office uuid; v_conf uuid; v_library uuid;
  v_da uuid; v_ds uuid; v_de uuid; v_dp uuid; v_di uuid;
  v_tag_snag uuid; v_tag_phase1 uuid; v_tag_client uuid; v_tag_urgent uuid;
  t_seep uuid; t_col uuid; t_slab uuid; t_marble uuid; t_handover uuid;
begin
  select id into v_admin from auth.users where email = 'pranav@arcflow.xyz';
  if v_admin is null then raise exception 'admin user not found — change the email in this script'; end if;

  -- ---- Project (completed) ------------------------------------------------
  insert into projects (name, code, status, client_name, created_by, created_at)
  values ('Datarkar Bhawan', 'DB-26', 'completed', 'Datarkar Charitable Trust', v_admin, '2026-01-02')
  returning id into v_proj;

  -- ---- Spatial hierarchy --------------------------------------------------
  insert into buildings (project_id, name) values (v_proj, 'Main Block') returning id into v_bldg;
  insert into floors (building_id, name, level_order) values (v_bldg,'Ground Floor',0) returning id into v_gf;
  insert into floors (building_id, name, level_order) values (v_bldg,'First Floor',1) returning id into v_ff;
  insert into floors (building_id, name, level_order) values (v_bldg,'Second Floor',2) returning id into v_sf;

  insert into rooms (floor_id, name) values (v_gf,'Entrance Lobby') returning id into v_lobby;
  insert into rooms (floor_id, name) values (v_gf,'Reception')      returning id into v_recep;
  insert into rooms (floor_id, name) values (v_gf,'Multipurpose Hall') returning id into v_hall;
  insert into rooms (floor_id, name) values (v_gf,'Pantry')         returning id into v_pantry;
  insert into rooms (floor_id, name) values (v_gf,'Toilets')        returning id into v_toilet;
  insert into rooms (floor_id, name) values (v_ff,'Admin Office')   returning id into v_office;
  insert into rooms (floor_id, name) values (v_ff,'Conference Room') returning id into v_conf;
  insert into rooms (floor_id, name) values (v_ff,'Library')        returning id into v_library;

  -- ---- Drawings + revisions ----------------------------------------------
  insert into drawings (project_id, building_id, discipline, title, drawing_number, created_by, created_at)
  values (v_proj, v_bldg, 'architectural', 'Ground Floor Plan', 'A-101', v_admin, '2026-01-05') returning id into v_da;
  insert into drawings (project_id, building_id, discipline, title, drawing_number, created_by, created_at)
  values (v_proj, v_bldg, 'structural', 'Foundation & Column Layout', 'S-201', v_admin, '2026-01-08') returning id into v_ds;
  insert into drawings (project_id, building_id, discipline, title, drawing_number, created_by, created_at)
  values (v_proj, v_bldg, 'electrical', 'Electrical Layout', 'E-301', v_admin, '2026-02-10') returning id into v_de;
  insert into drawings (project_id, building_id, discipline, title, drawing_number, created_by, created_at)
  values (v_proj, v_bldg, 'plumbing', 'Plumbing & Drainage', 'P-401', v_admin, '2026-02-12') returning id into v_dp;
  insert into drawings (project_id, building_id, discipline, title, drawing_number, created_by, created_at)
  values (v_proj, v_bldg, 'interior', 'Interior Finishes', 'I-501', v_admin, '2026-04-01') returning id into v_di;

  insert into drawing_revisions (drawing_id, revision_no, storage_path, status, uploaded_by, decided_at, created_at) values
    (v_da,1,'datarkar/A-101/r1.pdf','superseded', v_admin,'2026-01-20','2026-01-06'),
    (v_da,2,'datarkar/A-101/r2.pdf','approved',   v_admin,'2026-02-02','2026-01-25'),
    (v_ds,1,'datarkar/S-201/r1.pdf','approved',   v_admin,'2026-01-22','2026-01-09'),
    (v_de,1,'datarkar/E-301/r1.pdf','approved_with_comments', v_admin,'2026-03-01','2026-02-11'),
    (v_dp,1,'datarkar/P-401/r1.pdf','approved',   v_admin,'2026-03-05','2026-02-13'),
    (v_di,1,'datarkar/I-501/r1.pdf','changes_requested', v_admin,'2026-04-15','2026-04-02'),
    (v_di,2,'datarkar/I-501/r2.pdf','approved',   v_admin,'2026-05-02','2026-04-20');

  -- ---- Tickets (12 tasks + 6 site issues) --------------------------------
  insert into tickets (project_id, building_id, floor_id, room_id, type, discipline, title, description, status, priority, reporter_id, assignee_id, start_date, due_date, created_at) values
    (v_proj,v_bldg,v_gf,v_lobby,'task','architectural','Finalize ground floor layout','Lock plan before construction.','closed','high',v_admin,v_admin,'2026-01-05','2026-01-20','2026-01-05'),
    (v_proj,v_bldg,null,null,'task','structural','Structural design sign-off','Foundation + framing approval.','closed','high',v_admin,v_admin,'2026-01-08','2026-01-22','2026-01-08'),
    (v_proj,v_bldg,v_gf,null,'task','construction','Excavation & foundation','Site prep and footing pour.','closed','high',v_admin,v_admin,'2026-01-25','2026-02-15','2026-01-24'),
    (v_proj,v_bldg,null,null,'task','structural','RCC framework — columns & beams','Cast columns/beams to 2nd floor.','closed','high',v_admin,v_admin,'2026-02-16','2026-03-20','2026-02-16'),
    (v_proj,v_bldg,v_gf,null,'task','construction','Brickwork & blockwork','External + internal walls.','closed','medium',v_admin,v_admin,'2026-03-10','2026-04-05','2026-03-10'),
    (v_proj,v_bldg,null,null,'task','electrical','Electrical conduiting','Concealed conduit + boxes.','closed','medium',v_admin,v_admin,'2026-04-01','2026-04-25','2026-04-01'),
    (v_proj,v_bldg,v_toilet,null,'task','plumbing','Plumbing rough-in','Supply + drainage lines.','closed','medium',v_admin,v_admin,'2026-04-03','2026-04-28','2026-04-03'),
    (v_proj,v_bldg,null,null,'task','construction','Internal plastering','All floors.','closed','medium',v_admin,v_admin,'2026-04-20','2026-05-10','2026-04-20'),
    (v_proj,v_bldg,v_lobby,v_lobby,'task','interior','Flooring — marble laying','Lobby + hall Italian marble.','closed','high',v_admin,v_admin,'2026-05-05','2026-05-25','2026-05-05'),
    (v_proj,v_bldg,null,null,'task','interior','Painting — final coat','Emulsion, two coats.','closed','medium',v_admin,v_admin,'2026-06-01','2026-06-15','2026-06-01'),
    (v_proj,v_bldg,v_office,v_office,'task','interior','Furniture installation','Admin office + conference.','closed','low',v_admin,v_admin,'2026-06-10','2026-06-22','2026-06-10'),
    (v_proj,v_bldg,null,null,'task','documentation','Handover & documentation','As-builts, O&M manuals, keys.','closed','high',v_admin,v_admin,'2026-06-20','2026-06-30','2026-06-20'),
    (v_proj,v_bldg,v_gf,v_toilet,'site_issue','plumbing','Water seepage in basement wall','Seepage at NW corner after rain.','verified','high',v_admin,v_admin,'2026-02-18','2026-02-25','2026-02-18'),
    (v_proj,v_bldg,null,null,'site_issue','structural','Column misalignment at grid C3','Column off-axis ~40mm.','verified','critical',v_admin,v_admin,'2026-03-12','2026-03-18','2026-03-12'),
    (v_proj,v_bldg,v_ff,null,'site_issue','structural','Hairline cracks in first-floor slab','Cracks noticed during curing.','verified','high',v_admin,v_admin,'2026-04-08','2026-04-16','2026-04-08'),
    (v_proj,v_bldg,v_office,v_office,'site_issue','electrical','Socket short-circuit in admin office','Tripped on first power-on.','verified','high',v_admin,v_admin,'2026-05-12','2026-05-16','2026-05-12'),
    (v_proj,v_bldg,v_lobby,v_lobby,'site_issue','interior','Uneven marble joints in lobby','Lippage at entrance band.','verified','medium',v_admin,v_admin,'2026-06-05','2026-06-12','2026-06-05'),
    (v_proj,v_bldg,null,null,'site_issue','interior','Paint peeling near window','Damp patch by SE window.','closed','low',v_admin,v_admin,'2026-06-18','2026-06-24','2026-06-18');

  -- ---- Materials ----------------------------------------------------------
  insert into materials (project_id, room_id, category, name, manufacturer, product_code, finish, color, size, cost, supplier, status, decided_at, decided_by, created_by, created_at, drawing_id) values
    (v_proj,v_lobby,'flooring','Italian Marble — Statuario','Classic Marble','STAT-20','Polished','White/Grey','600×600 mm',185.00,'Classic Marble Co.','approved','2026-04-10',v_admin,v_admin,'2026-03-28',v_di),
    (v_proj,null,'paint','Premium Emulsion','Asian Paints','APEX-Ultima','Matt','Ivory','20 L',4200.00,'Asian Paints','approved','2026-05-20',v_admin,v_admin,'2026-05-05',null),
    (v_proj,v_toilet,'sanitary','Wall-hung WC + basin set','Jaquar','JQ-CONT','Chrome','White',null,12500.00,'Jaquar','approved','2026-04-05',v_admin,v_admin,'2026-03-20',v_dp),
    (v_proj,v_hall,'lighting','LED Panel 40W','Philips','PH-SL40','—','4000K','600×600 mm',950.00,'Philips','approved','2026-04-22',v_admin,v_admin,'2026-04-01',v_de),
    (v_proj,v_office,'joinery','Teak Flush Doors','—','TEAK-35','Veneer','Teak','2100×900 mm',8800.00,'Local Joinery','approved','2026-05-15',v_admin,v_admin,'2026-05-01',null),
    (v_proj,v_lobby,'flooring','Granite — Black Galaxy','—','BG-18','Polished','Black',null,120.00,'Stone Yard','rejected','2026-03-30',v_admin,v_admin,'2026-03-22',null);

  -- ---- Tags ---------------------------------------------------------------
  insert into tags (name, color) values ('snag', null) on conflict (name) do nothing;
  insert into tags (name, color) values ('phase-1', null) on conflict (name) do nothing;
  insert into tags (name, color) values ('client-review', null) on conflict (name) do nothing;
  insert into tags (name, color) values ('urgent', null) on conflict (name) do nothing;
  select id into v_tag_snag   from tags where name='snag';
  select id into v_tag_phase1 from tags where name='phase-1';
  select id into v_tag_client from tags where name='client-review';
  select id into v_tag_urgent from tags where name='urgent';

  select id into t_seep     from tickets where project_id=v_proj and title='Water seepage in basement wall';
  select id into t_col      from tickets where project_id=v_proj and title='Column misalignment at grid C3';
  select id into t_slab     from tickets where project_id=v_proj and title='Hairline cracks in first-floor slab';
  select id into t_marble   from tickets where project_id=v_proj and title='Uneven marble joints in lobby';
  select id into t_handover from tickets where project_id=v_proj and title='Handover & documentation';

  insert into ticket_tags (ticket_id, tag_id) values
    (t_seep,v_tag_snag),(t_col,v_tag_urgent),(t_slab,v_tag_snag),(t_marble,v_tag_snag),(t_marble,v_tag_client);

  -- ---- Comments -----------------------------------------------------------
  insert into comments (ticket_id, author_id, body, created_at) values
    (t_seep, v_admin, 'Applied crystalline waterproofing + external plaster patch. Monitored one week.', '2026-02-24'),
    (t_col,  v_admin, 'Structural consultant approved jacketing. Grid re-surveyed, within tolerance now.', '2026-03-17'),
    (t_slab, v_admin, 'Non-structural shrinkage cracks. Sealed with epoxy grout; verified after 10 days.', '2026-04-15'),
    (t_marble, v_admin, 'Relaid the entrance band, lippage under 1mm. Client signed off.', '2026-06-11'),
    (t_handover, v_admin, 'Snag list cleared, as-builts and O&M handed over. Project closed.', '2026-06-30');

  -- ---- Docs ---------------------------------------------------------------
  insert into documents (project_id, title, content, created_by, created_at, updated_at) values
    (v_proj, 'Project Brief — Datarkar Bhawan',
     '[{"type":"heading","text":"Datarkar Bhawan","level":2},
       {"type":"paragraph","text":"Community hall + admin block for the Datarkar Charitable Trust. Ground-plus-two, RCC frame."},
       {"type":"heading","text":"Scope","level":3},
       {"type":"bullet","text":"Ground: lobby, reception, multipurpose hall, pantry, toilets"},
       {"type":"bullet","text":"First: admin office, conference, library"},
       {"type":"bullet","text":"Second: guest rooms + terrace"},
       {"type":"callout","text":"Target handover: 30 June 2026."}]'::jsonb,
     v_admin, '2026-01-03', '2026-01-03'),
    (v_proj, 'Handover & Snag List',
     '[{"type":"heading","text":"Handover","level":2},
       {"type":"todo","text":"As-built drawings issued","checked":true},
       {"type":"todo","text":"O&M manuals + warranties","checked":true},
       {"type":"todo","text":"Keys + access cards handed over","checked":true},
       {"type":"heading","text":"Snags cleared","level":3},
       {"type":"bullet","text":"Basement seepage — waterproofed"},
       {"type":"bullet","text":"Lobby marble lippage — relaid"},
       {"type":"bullet","text":"Admin office socket — rewired"}]'::jsonb,
     v_admin, '2026-06-28', '2026-06-30');

  raise notice 'Seeded Datarkar Bhawan (%): 18 tickets, 5 drawings/7 revisions, 6 materials, 2 docs.', v_proj;
end $$;
