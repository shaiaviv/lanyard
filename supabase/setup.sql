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
  ('ITB Berlin 2025', 51, 'T2', '{"factors": {"scale": {"score": 70, "rationale": "100,000+ trade visitors but most are leisure/hospitality, not payments decision-makers"}, "topicFit": {"score": 45, "rationale": "Travel payments and FX are relevant but niche; general travel logistics dominates"}, "icpDensity": {"score": 42, "rationale": "Travel industry buyers have FX exposure (airline ticketing, hotel wholesale) but are not Grain''s primary ICP"}, "geoRelevance": {"score": 75, "rationale": "Berlin is EU core but travel vertical is secondary for Grain"}, "historicalPerf": null}}'),
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

-- ── 2c. City coordinates (C6 coverage map) ────────────────────────────────────
alter table conferences add column if not exists latitude double precision;
alter table conferences add column if not exists longitude double precision;
update conferences c set latitude = v.lat, longitude = v.lng
from (values
  ('Money20/20 Europe 2026', 52.3676, 4.9041),
  ('Money20/20 Europe 2025', 52.3676, 4.9041),
  ('Sibos 2026', 48.2082, 16.3738),
  ('Sibos 2025', 50.1109, 8.6821),
  ('Money20/20 USA 2026', 36.1699, -115.1398),
  ('Money20/20 USA 2025', 36.1699, -115.1398),
  ('Singapore FinTech Festival', 1.3521, 103.8198),
  ('Web Summit 2026', 38.7223, -9.1393),
  ('FinovateEurope 2025', 51.5074, -0.1278),
  ('ITB Berlin 2025', 52.5200, 13.4050)
) as v(name, lat, lng)
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

-- ── 6. Cross-conference demo contacts ──────────────────────────────────────────
-- The signature feature's demo data: each contact illustrates a distinct relationship arc
-- (warming / tire-kicker / cooling / nurturing), spans multiple reps (shared team memory), and
-- shows job changes across events (a promotion and a company switch). arc_cache is pre-seeded so
-- the Relationships view + contact pages are populated WITHOUT an API key; "Re-summarize with AI"
-- refreshes them. Encounters guarded by NOT EXISTS so re-running is safe.
insert into contacts (id, linkedin_url, canonical_name, current_company, current_title, email, arc_cache) values
  ('00000000-0000-0000-0000-0000000000e1', 'https://www.linkedin.com/in/elena-fischer-treasury', 'Elena Fischer', 'Adyen', 'VP Treasury', 'elena.fischer@adyen.com',
   '{"glance":{"meetings":3,"spanMonths":12,"verdict":"warming"},"lastTime":"Money20/20 Europe 2026 — asked for pricing and brought her Head of Payments","openThreads":["Send a pilot scope + pricing","Loop in her Head of Payments (Daan)"],"howToApproach":"Actively evaluating and progressing each time — move to a concrete pilot proposal.","suggestedMove":"Send a pilot scope and pricing this week while intent is high."}'::jsonb),
  ('00000000-0000-0000-0000-0000000000e2', 'https://www.linkedin.com/in/raj-patel-payments', 'Raj Patel', 'Mollie', 'Payments Lead', 'raj.patel@mollie.com',
   '{"glance":{"meetings":4,"spanMonths":15,"verdict":"tirekicker"},"lastTime":"Money20/20 Europe 2026 — same ''still exploring'' conversation as prior years","openThreads":[],"howToApproach":"Three years of friendly chats with no progression — qualify hard or deprioritize.","suggestedMove":"Ask one direct qualifying question: is there budget and a timeline this year?"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000e3', 'https://www.linkedin.com/in/sophie-laurent-cfo', 'Sophie Laurent', 'Voyagia Travel', 'CFO', 'sophie.laurent@voyagia.com',
   '{"glance":{"meetings":3,"spanMonths":12,"verdict":"cooling"},"lastTime":"Money20/20 Europe 2026 — priorities shifted, lukewarm","openThreads":["Was a pilot candidate in 2025 before budget froze"],"howToApproach":"Was hot, cooled after a budget freeze — re-warm only on a fresh trigger.","suggestedMove":"Light-touch check-in next quarter; do not over-invest now."}'::jsonb),
  ('00000000-0000-0000-0000-0000000000e4', 'https://www.linkedin.com/in/marcus-weber-pay', 'Marcus Weber', 'Lunar', 'Head of Payments', 'marcus.weber@lunar.app',
   '{"glance":{"meetings":2,"spanMonths":8,"verdict":"nurturing"},"lastTime":"Money20/20 Europe 2026 — steady engagement, integration questions","openThreads":["Answer his integration / security questions"],"howToApproach":"Genuine but early — keep nurturing with useful specifics.","suggestedMove":"Share an integration one-pager and a relevant neobank customer story."}'::jsonb)
on conflict (id) do nothing;

insert into encounters (contact_id, conference_id, rep_id, occurred_at, temperature, topics, note, follow_up, state, identity_snapshot, provenance)
select v.contact_id::uuid, c.id,
  coalesce((select id from reps where id = v.rep_id::uuid), (select id from reps where auth_user_id is not null order by created_at limit 1)),
  v.occurred_at::timestamptz, v.temperature::temperature, v.topics, v.note, v.follow_up, 'confirmed', v.snapshot::jsonb, v.provenance::jsonb
from (values
  ('00000000-0000-0000-0000-0000000000e1','Money20/20 Europe 2025','00000000-0000-0000-0000-0000000000a1','2025-06-03 11:00+00','warm', array['FX hedging','embedded finance'], 'Curious about embedded FX risk; took a deck. Director on the treasury team.', false, '{"name":"Elena Fischer","company":"Adyen","title":"Director, Treasury","email":"elena.fischer@adyen.com","linkedin":"https://www.linkedin.com/in/elena-fischer-treasury"}','{"source":"seed"}'),
  ('00000000-0000-0000-0000-0000000000e1','Sibos 2025','00000000-0000-0000-0000-0000000000a1','2025-10-14 14:30+00','warm', array['cross-border settlement','treasury workflows'], 'Followed up at Sibos; asked how we fit treasury workflows. Engaged.', false, '{"name":"Elena Fischer","company":"Adyen","title":"Director, Treasury","email":"elena.fischer@adyen.com","linkedin":"https://www.linkedin.com/in/elena-fischer-treasury"}','{"source":"seed"}'),
  ('00000000-0000-0000-0000-0000000000e1','Money20/20 Europe 2026','00000000-0000-0000-0000-0000000000a1','2026-06-03 10:15+00','hot', array['pricing','integration','pilot'], 'Now VP Treasury. Asked for pricing and brought her Head of Payments. Wants a pilot.', true, '{"name":"Elena Fischer","company":"Adyen","title":"VP Treasury","email":"elena.fischer@adyen.com","linkedin":"https://www.linkedin.com/in/elena-fischer-treasury"}','{"source":"seed"}'),
  ('00000000-0000-0000-0000-0000000000e2','FinovateEurope 2025','00000000-0000-0000-0000-0000000000a2','2025-03-11 13:00+00','lukewarm', array['general'], 'Friendly, vague interest. Payments Manager at Trustly.', false, '{"name":"Raj Patel","company":"Trustly","title":"Payments Manager","email":null,"linkedin":"https://www.linkedin.com/in/raj-patel-payments"}','{"source":"seed"}'),
  ('00000000-0000-0000-0000-0000000000e2','Money20/20 Europe 2025','00000000-0000-0000-0000-0000000000a2','2025-06-04 15:00+00','warm', array['FX'], 'Nice chat again, no specifics. Still at Trustly.', false, '{"name":"Raj Patel","company":"Trustly","title":"Payments Manager","email":null,"linkedin":"https://www.linkedin.com/in/raj-patel-payments"}','{"source":"seed"}'),
  ('00000000-0000-0000-0000-0000000000e2','Sibos 2025','00000000-0000-0000-0000-0000000000a2','2025-10-15 09:30+00','lukewarm', array['catching up'], 'Now at Mollie (Senior Payments Manager). Same conversation as last time, no next step.', false, '{"name":"Raj Patel","company":"Mollie","title":"Senior Payments Manager","email":"raj.patel@mollie.com","linkedin":"https://www.linkedin.com/in/raj-patel-payments"}','{"source":"seed"}'),
  ('00000000-0000-0000-0000-0000000000e2','Money20/20 Europe 2026','00000000-0000-0000-0000-0000000000a2','2026-06-02 16:00+00','lukewarm', array['hello'], 'Year three. Still exploring, never advances. Now Payments Lead at Mollie.', false, '{"name":"Raj Patel","company":"Mollie","title":"Payments Lead","email":"raj.patel@mollie.com","linkedin":"https://www.linkedin.com/in/raj-patel-payments"}','{"source":"seed"}'),
  ('00000000-0000-0000-0000-0000000000e3','Money20/20 Europe 2025','00000000-0000-0000-0000-0000000000a1','2025-06-03 13:30+00','hot', array['FX risk','pilot'], 'Very keen — wanted a pilot for travel settlement FX.', true, '{"name":"Sophie Laurent","company":"Voyagia Travel","title":"CFO","email":"sophie.laurent@voyagia.com","linkedin":"https://www.linkedin.com/in/sophie-laurent-cfo"}','{"source":"seed"}'),
  ('00000000-0000-0000-0000-0000000000e3','Sibos 2025','00000000-0000-0000-0000-0000000000a1','2025-10-14 11:00+00','warm', array['follow-up'], 'Still interested but budget froze for the year.', false, '{"name":"Sophie Laurent","company":"Voyagia Travel","title":"CFO","email":"sophie.laurent@voyagia.com","linkedin":"https://www.linkedin.com/in/sophie-laurent-cfo"}','{"source":"seed"}'),
  ('00000000-0000-0000-0000-0000000000e3','Money20/20 Europe 2026','00000000-0000-0000-0000-0000000000a1','2026-06-04 10:00+00','cool', array['check-in'], 'Priorities shifted; lukewarm now. Pilot is off the table for now.', false, '{"name":"Sophie Laurent","company":"Voyagia Travel","title":"CFO","email":"sophie.laurent@voyagia.com","linkedin":"https://www.linkedin.com/in/sophie-laurent-cfo"}','{"source":"seed"}'),
  ('00000000-0000-0000-0000-0000000000e4','Sibos 2025','00000000-0000-0000-0000-0000000000a2','2025-10-16 10:30+00','warm', array['treasury'], 'Genuine interest, early stage. Head of Payments at a neobank.', false, '{"name":"Marcus Weber","company":"Lunar","title":"Head of Payments","email":"marcus.weber@lunar.app","linkedin":"https://www.linkedin.com/in/marcus-weber-pay"}','{"source":"seed"}'),
  ('00000000-0000-0000-0000-0000000000e4','Money20/20 Europe 2026','00000000-0000-0000-0000-0000000000a2','2026-06-03 14:00+00','warm', array['integration','security'], 'Still engaged, steady. Asked integration and security questions.', false, '{"name":"Marcus Weber","company":"Lunar","title":"Head of Payments","email":"marcus.weber@lunar.app","linkedin":"https://www.linkedin.com/in/marcus-weber-pay"}','{"source":"seed"}')
) as v(contact_id, conf_name, rep_id, occurred_at, temperature, topics, note, follow_up, snapshot, provenance)
join conferences c on c.name = v.conf_name
where not exists (
  select 1 from encounters e where e.contact_id = v.contact_id::uuid and e.conference_id = c.id
);
