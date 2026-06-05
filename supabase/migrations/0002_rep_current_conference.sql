alter table reps
  add column current_conference_id uuid references conferences(id) on delete set null;
