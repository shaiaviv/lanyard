// Inserts the additional conferences into the live Supabase project using the service-role key.
// Idempotent: skips any conference whose name already exists in the DB.
// Run: node scripts/apply-conferences.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { buildConferenceRows } from './build-conferences.mjs';

// minimal .env loader (avoids a dotenv dependency)
function loadEnv(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}
loadEnv(new URL('../.env', import.meta.url));
loadEnv(new URL('../.env.local', import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false } });

const { rows } = buildConferenceRows();

// upsert by name: update existing rows in place (keeps verification corrections in sync),
// insert any that are missing.
const { data: existing, error: selErr } = await db.from('conferences').select('id,name');
if (selErr) { console.error('select failed:', selErr.message); process.exit(1); }
const idByName = new Map(existing.map((r) => [r.name, r.id]));

const toInsert = rows.filter((r) => !idByName.has(r.name));
const toUpdate = rows.filter((r) => idByName.has(r.name));

if (toInsert.length) {
  const { error } = await db.from('conferences').insert(toInsert);
  if (error) { console.error('insert failed:', error.message); process.exit(1); }
}
let updated = 0;
for (const r of toUpdate) {
  const { error } = await db.from('conferences').update({ ...r, updated_at: new Date().toISOString() }).eq('id', idByName.get(r.name));
  if (error) { console.error(`update failed for ${r.name}:`, error.message); process.exit(1); }
  updated++;
}

const { count } = await db.from('conferences').select('*', { count: 'exact', head: true });
console.log(`inserted ${toInsert.length}, updated ${updated}. conferences table now has ${count} rows.`);
