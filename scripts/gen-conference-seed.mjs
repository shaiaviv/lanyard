// One-off: regenerate the conference seed block in supabase/setup.sql from the live DB,
// so the committed seed always matches the researched/scored dataset. Run: node scripts/gen-conference-seed.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supa
  .from('conferences')
  .select('*')
  .order('start_date', { ascending: true })
  .order('name', { ascending: true });
if (error) throw error;

const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => `'{${(a ?? []).map((x) => `"${x}"`).join(',')}}'`;
const json = (o) => (o == null ? 'null' : `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`);

const rows = data
  .map(
    (c) =>
      `  (${q(c.name)},${q(c.start_date)},${q(c.end_date)},${q(c.location)},${q(c.country)},` +
      `${q(c.region)},${arr(c.verticals)},${c.est_audience ?? 'null'},${c.latitude ?? 'null'},` +
      `${c.longitude ?? 'null'},${c.icp_score ?? 'null'},${c.tier ? q(c.tier) : 'null'},${json(c.score_breakdown)})`,
  )
  .join(',\n');

const block = `-- ── 2. Conference seed data (T2) ─────────────────────────────────────────────
-- ${data.length} REAL events (researched from public info: dates, location, audience) spanning
-- fintech, payments, treasury/FX, cross-border, travel, and SaaS. icp_score/tier/score_breakdown
-- are the C4 engine output (AI-estimated factors → weighted formula); baked in so a fresh DB is
-- fully scored without an API key. "Re-score with AI" / Discover refresh them live.
-- Regenerate this block from the DB with: node scripts/gen-conference-seed.mjs
insert into conferences (name, start_date, end_date, location, country, region, verticals, est_audience, latitude, longitude, icp_score, tier, score_breakdown) values
${rows}
on conflict do nothing;`;

const path = new URL('../supabase/setup.sql', import.meta.url);
const sql = readFileSync(path, 'utf8');

// Replace everything from the "-- ── 2." section up to the "-- ── 3." section.
const startMarker = '-- ── 2. Conference seed data';
const endMarker = '-- ── 3. Your rep row';
const start = sql.indexOf(startMarker);
const end = sql.indexOf(endMarker);
if (start === -1 || end === -1) throw new Error('section markers not found in setup.sql');

const next = sql.slice(0, start) + block + '\n\n' + sql.slice(end);
writeFileSync(path, next);
console.log(`Wrote ${data.length} conferences into supabase/setup.sql`);
