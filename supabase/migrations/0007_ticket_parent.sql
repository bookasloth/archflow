-- Redesign R3: subtasks. A subtask is a ticket with a parent ticket.
-- Self-FK, nullable, set null on parent delete (subtask survives, becomes top-level).
alter table tickets add column parent_id uuid references tickets(id) on delete set null;
create index tickets_parent_idx on tickets(parent_id);
