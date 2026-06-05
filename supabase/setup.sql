-- Lanyard — post-migration setup script.
-- Run this in the Supabase SQL Editor AFTER applying 0001_init.sql.
-- 1. Creates the private recordings bucket
-- 2. Seeds conference data (real fintech events)
-- 3. Seeds your rep row (fill in YOUR_AUTH_USER_ID below)

-- ── 1. Storage bucket ────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

-- ── 2. Conference seed data (T2) ─────────────────────────────────────────────
-- Real fintech/payments events. icp_score/tier are null until the C4 scoring engine runs.
insert into conferences (name, start_date, end_date, location, country, region, verticals, est_audience, source) values
  -- Active right now (2026-06-05) — great for testing the "active conference" flow
  ('Money20/20 Europe 2026',      '2026-06-02', '2026-06-04', 'Amsterdam',      'Netherlands', 'Europe', array['fintech','payments','banking','FX'],      6000,  'seed'),

  -- Upcoming 2026
  ('Sibos 2026',                  '2026-10-05', '2026-10-08', 'Vienna',          'Austria',     'Europe', array['payments','treasury','banking','FX'],       10000, 'seed'),
  ('Money20/20 USA 2026',         '2026-10-26', '2026-10-29', 'Las Vegas',       'USA',         'Americas', array['fintech','payments','banking','FX'],     13000, 'seed'),
  ('Singapore FinTech Festival',  '2026-11-02', '2026-11-06', 'Singapore',       'Singapore',   'APAC', array['fintech','payments','banking','cross-border'], 60000, 'seed'),
  ('Web Summit 2026',             '2026-11-10', '2026-11-13', 'Lisbon',          'Portugal',    'Europe', array['technology','SaaS','fintech'],              70000, 'seed'),

  -- Past 2025 events (useful for testing cross-conference tracking)
  ('Money20/20 Europe 2025',      '2025-06-03', '2025-06-05', 'Amsterdam',      'Netherlands', 'Europe', array['fintech','payments','banking','FX'],         6000, 'seed'),
  ('Sibos 2025',                  '2025-10-13', '2025-10-16', 'Frankfurt',       'Germany',     'Europe', array['payments','treasury','banking','FX'],       10000, 'seed'),
  ('Money20/20 USA 2025',         '2025-10-27', '2025-10-30', 'Las Vegas',       'USA',         'Americas', array['fintech','payments','banking'],           13000, 'seed'),
  ('FinovateEurope 2025',         '2025-03-10', '2025-03-12', 'London',          'UK',          'Europe', array['fintech','banking','payments'],              2000, 'seed'),
  ('ITB Berlin 2025',             '2025-03-04', '2025-03-06', 'Berlin',          'Germany',     'Europe', array['travel','hospitality'],                    100000, 'seed')
on conflict do nothing;

-- ── 3. Your rep row ───────────────────────────────────────────────────────────
-- Replace YOUR_AUTH_USER_ID with the User UID from Authentication → Users in your Supabase dashboard.
-- Replace name/email with your details.
insert into reps (auth_user_id, name, email, team_id)
values (
  'YOUR_AUTH_USER_ID',
  'Your Name',
  'your@email.com',
  '00000000-0000-0000-0000-000000000001'
)
on conflict (auth_user_id) do nothing;

-- ── 4. Teammate reps (company-wide coverage demo) ──────────────────────────────
-- Planning is a team hub: a sales lead assigns coverage across the whole team. These
-- teammates have no auth account (auth_user_id = null) — they exist for coverage planning.
-- Fixed UUIDs so the coverage rows below can reference them. Same team_id as your rep.
insert into reps (id, auth_user_id, name, email, team_id) values
  ('00000000-0000-0000-0000-0000000000a1', null, 'Maya Rodriguez', 'maya@grain.example',  '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-0000000000a2', null, 'Tom Becker',     'tom@grain.example',   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-0000000000a3', null, 'Priya Nair',     'priya@grain.example', '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- ── 5. Coverage assignments ────────────────────────────────────────────────────
-- Deliberate gaps: Singapore FinTech Festival (APAC) is only "considering", and Money20/20
-- Europe 2026 has no committed rep — so the under-invested + clustering views have something
-- to surface on first run. Referenced by conference NAME (ids are generated).
insert into coverage (rep_id, conference_id, status)
select v.rep_id::uuid, c.id, v.status::coverage_status
from (values
  ('00000000-0000-0000-0000-0000000000a1', 'Sibos 2026',                 'committed'),
  ('00000000-0000-0000-0000-0000000000a1', 'Web Summit 2026',            'considering'),
  ('00000000-0000-0000-0000-0000000000a2', 'Money20/20 USA 2026',        'committed'),
  ('00000000-0000-0000-0000-0000000000a2', 'Money20/20 Europe 2025',     'attended'),
  ('00000000-0000-0000-0000-0000000000a3', 'Singapore FinTech Festival', 'considering')
) as v(rep_id, conf_name, status)
join conferences c on c.name = v.conf_name
on conflict (rep_id, conference_id) do nothing;
