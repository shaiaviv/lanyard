-- 0003: AI Coverage Suggestions
-- Adds home_city/region/lat/lng + capacity to reps (trip-clustering anchor + load cap).
-- Adds coverage_suggestions table (draft store; isolated from the coverage truth, P1 read-only guarantee).

alter table reps
  add column if not exists home_city   text,
  add column if not exists home_region text,         -- Europe | Americas | APAC | MEA
  add column if not exists home_lat    double precision,
  add column if not exists home_lng    double precision,
  add column if not exists capacity    integer not null default 5;

create table if not exists coverage_suggestions (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null,
  created_by  uuid references reps(id) on delete set null,
  prompt      text,
  source      text not null default 'ai',   -- 'ai' | 'heuristic'
  payload     jsonb not null,               -- validated SuggestionDraft snapshot
  created_at  timestamptz not null default now()
);

create index if not exists coverage_suggestions_team_created
  on coverage_suggestions (team_id, created_at desc);

alter table coverage_suggestions enable row level security;

create policy "team members read own suggestions"
  on coverage_suggestions for select
  using (team_id in (select team_id from reps where auth_user_id = auth.uid()));

create policy "team members insert own suggestions"
  on coverage_suggestions for insert
  with check (team_id in (select team_id from reps where auth_user_id = auth.uid()));

-- Seed home bases + capacity for the 5 fixed demo teammate reps (idempotent — skipped on fresh DBs
-- that apply setup.sql after this migration, since setup.sql seeds these columns directly).
update reps set home_city = 'London',    home_region = 'Europe',   home_lat = 51.5074,  home_lng = -0.1278,  capacity = 5 where id = '00000000-0000-0000-0000-0000000000a1' and home_city is null;
update reps set home_city = 'Frankfurt', home_region = 'Europe',   home_lat = 50.1109,  home_lng = 8.6821,   capacity = 5 where id = '00000000-0000-0000-0000-0000000000a2' and home_city is null;
update reps set home_city = 'Singapore', home_region = 'APAC',     home_lat = 1.3521,   home_lng = 103.8198, capacity = 5 where id = '00000000-0000-0000-0000-0000000000a3' and home_city is null;
update reps set home_city = 'New York',  home_region = 'Americas', home_lat = 40.7128,  home_lng = -74.0060, capacity = 6 where id = '00000000-0000-0000-0000-0000000000a4' and home_city is null;
update reps set home_city = 'Dubai',     home_region = 'MEA',      home_lat = 25.2048,  home_lng = 55.2708,  capacity = 5 where id = '00000000-0000-0000-0000-0000000000a5' and home_city is null;
-- Signed-in rep gets London/Europe as a default if not yet set
update reps set home_city = 'London', home_region = 'Europe', home_lat = 51.5074, home_lng = -0.1278, capacity = 5
  where auth_user_id is not null and home_city is null;
