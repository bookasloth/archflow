-- Redesign R3: scheduling. start_date pairs with the existing due_date to give tickets a
-- span for the timeline view. Nullable — undated tickets simply don't appear on the timeline.
alter table tickets add column start_date date;
