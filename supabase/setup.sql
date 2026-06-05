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

-- ── 2b. ICP scores (C4) — reproducible baseline ───────────────────────────────
-- These are the AI-estimated factor breakdowns (lib/ai/scoreConference) + the score/tier the
-- default weights produce. Baked in so a fresh DB is fully scored WITHOUT needing an API key.
-- Re-run "Re-score with AI" in the app to refresh any event. Matched by name.
update conferences c set
  icp_score = v.icp_score,
  tier = v.tier::conf_tier,
  score_breakdown = v.breakdown::jsonb
from (values
  ('FinovateEurope 2025', 69, 'T2', '{"factors": {"scale": {"score": 52, "rationale": "~1,500 attendees — intimate but efficient for targeted relationship-building"}, "topicFit": {"score": 72, "rationale": "Payments innovation highly relevant; FX risk is niche but present"}, "icpDensity": {"score": 68, "rationale": "Strong fintech innovators; some PSPs and payments startups but fewer enterprise FX buyers"}, "geoRelevance": {"score": 85, "rationale": "London is Grain''s home market; strong local network"}, "historicalPerf": {"score": 70, "rationale": "Previous presence; good for relationship maintenance and press coverage"}}}'),
  ('ITB Berlin 2025', 51, 'T3', '{"factors": {"scale": {"score": 70, "rationale": "100,000+ trade visitors but most are leisure/hospitality, not payments decision-makers"}, "topicFit": {"score": 45, "rationale": "Travel payments and FX are relevant but niche; general travel logistics dominates"}, "icpDensity": {"score": 42, "rationale": "Travel industry buyers have FX exposure (airline ticketing, hotel wholesale) but are not Grain''s primary ICP"}, "geoRelevance": {"score": 75, "rationale": "Berlin is EU core but travel vertical is secondary for Grain"}, "historicalPerf": null}}'),
  ('Money20/20 Europe 2025', 89, 'T1', '{"factors": {"scale": {"score": 78, "rationale": "~6,500 qualified attendees"}, "topicFit": {"score": 95, "rationale": "Cross-border payments, FX risk, embedded finance are headline tracks"}, "icpDensity": {"score": 90, "rationale": "Highest PSP/fintech/FX-desk concentration of any European event — Grain''s exact ICP attends en masse"}, "geoRelevance": {"score": 92, "rationale": "Amsterdam is EU core; primary target region for Grain''s current GTM"}, "historicalPerf": {"score": 88, "rationale": "Prior attendance generated strong pipeline"}}}'),
  ('Money20/20 Europe 2026', 89, 'T1', '{"factors": {"scale": {"score": 78, "rationale": "~6,500 qualified attendees; small enough to network deeply, large enough for serious pipeline"}, "topicFit": {"score": 95, "rationale": "Cross-border payments, FX risk, embedded finance are headline tracks; nearly every session is relevant"}, "icpDensity": {"score": 90, "rationale": "Highest PSP/fintech/FX-desk concentration of any European event — Grain''s exact ICP attends en masse"}, "geoRelevance": {"score": 92, "rationale": "Amsterdam is EU core; primary target region for Grain''s current GTM"}, "historicalPerf": {"score": 88, "rationale": "Prior attendance generated strong pipeline; attendee quality consistently high"}}}'),
  ('Money20/20 USA 2025', 84, 'T1', '{"factors": {"scale": {"score": 88, "rationale": "13,000+ attendees"}, "topicFit": {"score": 87, "rationale": "Payments innovation, cross-border, embedded finance strong"}, "icpDensity": {"score": 85, "rationale": "Strong US fintech presence; solid payments/FX segment"}, "geoRelevance": {"score": 75, "rationale": "North America secondary but growing market"}, "historicalPerf": {"score": 78, "rationale": "Solid prior attendance; US pipeline building"}}}'),
  ('Money20/20 USA 2026', 85, 'T1', '{"factors": {"scale": {"score": 88, "rationale": "13,000+ attendees — best volume for pipeline generation"}, "topicFit": {"score": 88, "rationale": "Payments innovation, embedded finance, cross-border are all strong tracks"}, "icpDensity": {"score": 85, "rationale": "Strong US fintech presence; fewer EU-style PSPs but strong payments/FX segment"}, "geoRelevance": {"score": 75, "rationale": "North America is a secondary but growing market for Grain"}, "historicalPerf": {"score": 82, "rationale": "US market relationship-building; longer sales cycles but high ACV potential"}}}'),
  ('Sibos 2025', 80, 'T1', '{"factors": {"scale": {"score": 72, "rationale": "~10,000 attendees; high seniority"}, "topicFit": {"score": 80, "rationale": "Treasury management, FX hedging, cross-border settlement"}, "icpDensity": {"score": 82, "rationale": "Banks, treasury desks, and correspondent banking"}, "geoRelevance": {"score": 85, "rationale": "Frankfurt is EU financial hub"}, "historicalPerf": {"score": 75, "rationale": "Solid quality; bank-heavy audience warms slowly but converts well"}}}'),
  ('Sibos 2026', 80, 'T1', '{"factors": {"scale": {"score": 72, "rationale": "~10,000 attendees; smaller than Money20/20 but higher seniority"}, "topicFit": {"score": 80, "rationale": "Treasury management, FX hedging, cross-border settlement are recurring themes"}, "icpDensity": {"score": 82, "rationale": "Banks, treasury desks, and correspondent banking — FX-adjacent decision-makers who care about rate risk"}, "geoRelevance": {"score": 88, "rationale": "Vienna is EU core; SWIFT''s European user base maps well to Grain''s ICP"}, "historicalPerf": null}}'),
  ('Singapore FinTech Festival', 66, 'T2', '{"factors": {"scale": {"score": 90, "rationale": "60,000 attendees — enormous reach but signal-to-noise is low"}, "topicFit": {"score": 65, "rationale": "Cross-border payments track exists but regulatory/DeFi topics dominate"}, "icpDensity": {"score": 62, "rationale": "Broad fintech with some payments focus; FX buyers are a minority of 60k attendees"}, "geoRelevance": {"score": 52, "rationale": "APAC is an emerging market for Grain; longer travel reduces cost-effectiveness"}, "historicalPerf": null}}'),
  ('Web Summit 2026', 48, 'T3', '{"factors": {"scale": {"score": 95, "rationale": "70,000+ attendees — largest tech conference in Europe by headcount"}, "topicFit": {"score": 38, "rationale": "Some startup pitches and fintech sessions but no FX/payments depth"}, "icpDensity": {"score": 32, "rationale": "Broad tech conference; fintech/payments is one track among dozens — very low ICP density"}, "geoRelevance": {"score": 68, "rationale": "Lisbon/Portugal is peripheral to Grain''s core EU markets"}, "historicalPerf": null}}')
) as v(name, icp_score, tier, breakdown)
where c.name = v.name;

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
