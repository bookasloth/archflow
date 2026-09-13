-- Slice 12: material decision library uplift — spec-drawing + ticket relations.
-- Mirrors the single-FK link pattern used for tickets.drawing_id (0002). No junction tables.

alter table materials add column drawing_id uuid references drawings(id) on delete set null;
alter table tickets   add column material_id uuid references materials(id) on delete set null;
