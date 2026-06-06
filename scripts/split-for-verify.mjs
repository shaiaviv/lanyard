// Splits the built conference rows into N chunk files for parallel web-verification.
// Each chunk holds the slim facts an agent needs to check. Writes scripts/verify/chunk-K.json.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { buildConferenceRows } from './build-conferences.mjs';

const CHUNKS = 10;
const { rows } = buildConferenceRows();

const slim = rows.map((r) => ({
  name: r.name,
  claimed_start: r.start_date,
  claimed_end: r.end_date,
  claimed_location: r.location,
  claimed_country: r.country,
  claimed_audience: r.est_audience,
}));

const dir = new URL('./verify/', import.meta.url);
try { rmSync(dir, { recursive: true, force: true }); } catch {}
mkdirSync(dir, { recursive: true });

const per = Math.ceil(slim.length / CHUNKS);
let written = 0;
for (let k = 0; k < CHUNKS; k++) {
  const part = slim.slice(k * per, (k + 1) * per);
  if (!part.length) break;
  writeFileSync(new URL(`./verify/chunk-${k}.json`, import.meta.url), JSON.stringify(part, null, 2));
  written++;
  console.log(`chunk-${k}.json: ${part.length} conferences`);
}
console.log(`total ${slim.length} conferences across ${written} chunks`);
