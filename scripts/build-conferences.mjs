// Shared transform: candidates JSON -> normalized, deduped, scored conference rows.
// Used by gen-conferences.mjs (SQL emit) and apply-conferences.mjs (live insert) so the
// two paths can never drift. Scoring mirrors lib/scoring/computeIcpScore.ts exactly.
import { readFileSync } from 'node:fs';

export const WINDOW_START = '2026-07-01';
export const WINDOW_END = '2027-12-31';

// DEFAULT_WEIGHTS from lib/scoring/computeIcpScore.ts
const W = { icpDensity: 40, topicFit: 25, scale: 15, geoRelevance: 10, historicalPerf: 10 };
const tierForScore = (s) => (s >= 75 ? 'T1' : s >= 50 ? 'T2' : 'T3');

function computeIcpScore(factors) {
  const parts = [
    [factors.icpDensity?.score, W.icpDensity],
    [factors.topicFit?.score, W.topicFit],
    [factors.scale?.score, W.scale],
    [factors.geoRelevance?.score, W.geoRelevance],
    [factors.historicalPerf?.score ?? null, W.historicalPerf],
  ];
  let ws = 0, wt = 0;
  for (const [score, weight] of parts) {
    if (score == null || weight <= 0) continue;
    ws += score * weight; wt += weight;
  }
  const score = wt > 0 ? Math.round(ws / wt) : 0;
  return { score, tier: tierForScore(score) };
}

// The 44 already-seeded names — never re-emit these.
export const EXISTING = new Set([
  'ITB Berlin 2025','FinovateEurope 2025','Money20/20 Europe 2025','Sibos 2025',
  'EuroFinance International Treasury Management 2025','Money20/20 USA 2025','Singapore FinTech Festival 2025',
  'FinovateEurope 2026','ITB Berlin 2026','MPE (Merchant Payments Ecosystem) 2026','Insurtech Insights Europe 2026',
  'PAY360 2026','Fintech Meetup 2026','Seamless North Africa 2026','Money20/20 Asia 2026',
  'Nacha Smarter Faster Payments 2026','Arival 360 Valencia 2026','FinovateSpring 2026','Payments Canada SUMMIT 2026',
  'ACT Annual Conference 2026','FTT Payments 2026','SaaStr Annual 2026','Seamless Middle East 2026',
  'Money20/20 Europe 2026','MAG Payments Summit London 2026','Phocuswright Europe 2026','EBAday 2026',
  'Africa Fintech Summit Johannesburg 2026','LEAP 2026','Seamless Africa 2026','FinovateFall 2026',
  'Arabian Travel Market 2026','EuroFinance International Treasury Management 2026','Sibos 2026','TechCrunch Disrupt 2026',
  'Money20/20 USA 2026','Hong Kong FinTech Week 2026','WTM London 2026','AFP Annual Conference 2026',
  'Web Summit 2026','Phocuswright Conference 2026','Seamless Saudi Arabia 2026','Singapore FinTech Festival 2026','Slush 2026',
]);

const REGION_BY_COUNTRY = {
  Netherlands:'Europe', Germany:'Europe', 'United Kingdom':'Europe', UK:'Europe', France:'Europe',
  Switzerland:'Europe', Denmark:'Europe', Sweden:'Europe', Croatia:'Europe', Spain:'Europe',
  Italy:'Europe', Belgium:'Europe', Portugal:'Europe', Austria:'Europe', Ireland:'Europe',
  Finland:'Europe', Cyprus:'Europe',
  USA:'Americas', 'United States':'Americas', Canada:'Americas', Brazil:'Americas', Ecuador:'Americas',
  Peru:'Americas', Chile:'Americas', Mexico:'Americas', Argentina:'Americas', Colombia:'Americas',
  Singapore:'APAC', Australia:'APAC', India:'APAC', Thailand:'APAC', Indonesia:'APAC',
  Philippines:'APAC', Vietnam:'APAC', 'Hong Kong':'APAC', 'South Korea':'APAC', Japan:'APAC',
  Malaysia:'APAC', China:'APAC',
  'Saudi Arabia':'MEA', 'United Arab Emirates':'MEA', Egypt:'MEA', Kenya:'MEA', Nigeria:'MEA',
  'South Africa':'MEA', Qatar:'MEA',
};
const VERT_CANON = { commerce:'retail', saas:'SaaS', tech:'technology' };
const normVert = (v) => VERT_CANON[v] ?? v;

// Returns { rows, skipped }. rows are plain objects matching the conferences columns.
export function buildConferenceRows() {
  const candidates = JSON.parse(readFileSync(new URL('./conference-candidates.json', import.meta.url)));
  const seen = new Set();
  const rows = [];
  const skipped = { existing: [], dupe: [], outOfWindow: [] };

  for (const c of candidates) {
    if (EXISTING.has(c.name)) { skipped.existing.push(c.name); continue; }
    if (seen.has(c.name)) { skipped.dupe.push(c.name); continue; }
    if (c.start_date < WINDOW_START || c.start_date > WINDOW_END) { skipped.outOfWindow.push(`${c.name} (${c.start_date})`); continue; }
    seen.add(c.name);

    const { score, tier } = computeIcpScore(c.factors);
    rows.push({
      name: c.name,
      start_date: c.start_date,
      end_date: c.end_date,
      location: String(c.location).split(',')[0].trim(),
      country: c.country,
      region: REGION_BY_COUNTRY[c.country] ?? c.region,
      verticals: c.verticals.map(normVert),
      est_audience: c.est_audience,
      latitude: c.latitude,
      longitude: c.longitude,
      icp_score: score,
      tier,
      score_breakdown: { factors: c.factors },
    });
  }
  return { rows, skipped };
}
