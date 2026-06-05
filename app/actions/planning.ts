'use server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/db/admin';
import { getCurrentRep, getScoringWeights, getConferences } from '@/lib/db/queries';
import { MissingServiceKeyError } from '@/lib/config/getServiceKey';
import { scoreConference } from '@/lib/ai/scoreConference';
import { discoverConferences } from '@/lib/ai/discoverConferences';
import { computeIcpScore, DEFAULT_WEIGHTS, type ScoringWeights } from '@/lib/scoring/computeIcpScore';
import { pushContact } from '@/lib/hubspot';
import type { DiscoveredCandidate } from '@/lib/types';

export type CoverageStatus = 'considering' | 'committed' | 'attended' | 'declined';

// Assign ANY teammate to a conference — the core company-wide planning action ("who covers what").
// Guarded so a rep can only assign within their own team.
export async function assignCoverage(
  repId: string,
  conferenceId: string,
  status: CoverageStatus,
): Promise<{ success: true } | { error: string }> {
  const me = await getCurrentRep();
  if (!me) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from('reps')
    .select('team_id')
    .eq('id', repId)
    .maybeSingle();
  if (!target || target.team_id !== me.teamId) {
    return { error: 'That rep is not on your team' };
  }

  const { error } = await admin
    .from('coverage')
    .upsert({ rep_id: repId, conference_id: conferenceId, status }, { onConflict: 'rep_id,conference_id' });

  if (error) return { error: error.message };
  revalidatePath('/planning');
  return { success: true };
}

// Convenience wrapper: assign the signed-in rep to a conference.
export async function upsertCoverage(
  conferenceId: string,
  status: CoverageStatus,
): Promise<{ success: true } | { error: string }> {
  const me = await getCurrentRep();
  if (!me) return { error: 'Not authenticated' };
  return assignCoverage(me.id, conferenceId, status);
}

// Persist the team's scoring weights (non-secret config → plaintext JSON in app_settings).
export async function saveScoringWeights(
  weights: ScoringWeights,
): Promise<{ success: true } | { error: string }> {
  const me = await getCurrentRep();
  if (!me) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { error } = await admin.from('app_settings').upsert(
    {
      team_id: me.teamId,
      key_name: 'scoring_weights',
      key_ciphertext: JSON.stringify(weights),
      updated_by: me.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'team_id,key_name' },
  );
  if (error) return { error: error.message };
  revalidatePath('/planning');
  return { success: true };
}

// Re-run the AI factor estimation for one conference, then persist factors + the score/tier the
// current weights produce. The expensive AI half; the formula half runs live client-side.
export async function rescoreConference(
  conferenceId: string,
): Promise<{ success: true; score: number; tier: string } | { error: string }> {
  const me = await getCurrentRep();
  if (!me) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: conf } = await admin
    .from('conferences')
    .select('*')
    .eq('id', conferenceId)
    .maybeSingle();
  if (!conf) return { error: 'Conference not found' };

  let factors;
  try {
    factors = await scoreConference({
      name: conf.name,
      location: conf.location,
      country: conf.country,
      region: conf.region,
      verticals: conf.verticals ?? [],
      estAudience: conf.est_audience,
      startDate: conf.start_date,
    });
  } catch (err) {
    if (err instanceof MissingServiceKeyError) {
      return { error: 'Add an Anthropic API key in Settings to score conferences.' };
    }
    return { error: err instanceof Error ? err.message : 'Scoring failed' };
  }

  const weights = await getScoringWeights(me.teamId);
  const { score, tier } = computeIcpScore(factors, weights);

  const { error } = await admin
    .from('conferences')
    .update({ score_breakdown: factors, icp_score: score, tier })
    .eq('id', conferenceId);
  if (error) return { error: error.message };

  revalidatePath('/planning');
  return { success: true, score, tier };
}

// Override one AI-estimated factor score (P1: the AI estimate is a guess — let the user correct it),
// then recompute + persist the conference's score/tier with the team weights.
export async function overrideConferenceFactor(
  conferenceId: string,
  factorKey: 'icpDensity' | 'topicFit' | 'scale' | 'geoRelevance' | 'historicalPerf',
  newScore: number,
): Promise<{ success: true; score: number; tier: string } | { error: string }> {
  const me = await getCurrentRep();
  if (!me) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: conf } = await admin.from('conferences').select('score_breakdown').eq('id', conferenceId).maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const breakdown = (conf?.score_breakdown ?? null) as any;
  if (!breakdown?.factors?.[factorKey]) return { error: 'No factor to override' };

  breakdown.factors[factorKey] = {
    score: Math.max(0, Math.min(100, Math.round(newScore))),
    rationale: `${breakdown.factors[factorKey].rationale ?? ''} (adjusted by ${me.name})`.trim(),
  };

  const weights = await getScoringWeights(me.teamId);
  const { score, tier } = computeIcpScore(breakdown, weights);

  const { error } = await admin
    .from('conferences')
    .update({ score_breakdown: breakdown, icp_score: score, tier })
    .eq('id', conferenceId);
  if (error) return { error: error.message };

  revalidatePath('/planning');
  return { success: true, score, tier };
}

// Bulk push the QUALIFIED leads captured at a conference (curated handoff, foundation §4b):
// qualified = hot/warm temperature OR strong/moderate ICP fit.
export async function bulkPushQualified(
  conferenceId: string,
): Promise<{ pushed: number; failed: number; mock: boolean; total: number }> {
  const me = await getCurrentRep();
  if (!me) return { pushed: 0, failed: 0, mock: false, total: 0 };

  const admin = createAdminClient();
  const { data } = await admin
    .from('encounters')
    .select('id, temperature, fit')
    .eq('conference_id', conferenceId)
    .not('contact_id', 'is', null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qualified = (data ?? []).filter((e: any) => {
    const temp = e.temperature as string | null;
    const fitTier = (e.fit as { tier?: string } | null)?.tier;
    return temp === 'hot' || temp === 'warm' || fitTier === 'strong' || fitTier === 'moderate';
  });

  const res = await bulkPushToHubSpot(qualified.map((e) => e.id as string));
  return { ...res, total: qualified.length };
}

// Build the curated note pushed to HubSpot: the relationship ARC + qualification context.
// This is what makes the push a curated handoff, not a dumb export (foundation §4b).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildArcNote(enc: any): { name: string; email: string | null; company: string | null; title: string | null; linkedinUrl: string | null; noteBody: string } {
  const c = enc.contacts;
  const snap = (enc.identity_snapshot ?? {}) as { name?: string; company?: string; title?: string };
  const arc = c?.arc_cache as { glance?: { verdict?: string; meetings?: number }; lastTime?: string; openThreads?: string[]; suggestedMove?: string } | null;
  const fit = enc.fit as { tier?: string } | null;
  const confName = enc.conferences?.name as string | undefined;

  const lines: string[] = ['— Pushed from Lanyard (conference intelligence) —'];
  if (arc?.glance?.verdict) lines.push(`Relationship: ${arc.glance.verdict}${arc.glance.meetings ? ` (${arc.glance.meetings} meetings)` : ''}`);
  if (confName) lines.push(`Met at: ${confName}`);
  if (fit?.tier) lines.push(`ICP fit: ${fit.tier}`);
  if (enc.temperature) lines.push(`Temperature: ${enc.temperature}`);
  if (arc?.lastTime) lines.push(`Last touch: ${arc.lastTime}`);
  if (arc?.openThreads?.length) lines.push(`Open threads: ${arc.openThreads.join('; ')}`);
  if (arc?.suggestedMove) lines.push(`Suggested next move: ${arc.suggestedMove}`);
  if (!arc && enc.note) lines.push(`Notes: ${enc.note}`);

  return {
    name: (c?.canonical_name ?? snap.name ?? 'Unknown') as string,
    email: (c?.email ?? null) as string | null,
    company: (c?.current_company ?? snap.company ?? null) as string | null,
    title: (c?.current_title ?? snap.title ?? null) as string | null,
    linkedinUrl: (c?.linkedin_url ?? null) as string | null,
    noteBody: lines.join('\n'),
  };
}

const PUSH_SELECT =
  'id, temperature, note, fit, identity_snapshot, contact_id, provenance, ' +
  'contacts(canonical_name, current_company, current_title, email, linkedin_url, arc_cache), conferences(name)';

export type PushOutcome = { success: true; contactUrl: string; action: 'created' | 'updated' | 'mock'; mock: boolean } | { error: string };

// Push ONE encounter's contact to HubSpot: dedupe by email, arc summary as a note, qualification
// context. Enriches server-side from the encounter + contact + conference.
export async function pushToHubSpot(encounterId: string): Promise<PushOutcome> {
  const me = await getCurrentRep();
  if (!me) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: enc } = await admin.from('encounters').select(PUSH_SELECT).eq('id', encounterId).maybeSingle();
  if (!enc) return { error: 'Encounter not found' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const encAny = enc as any;
  const input = buildArcNote(encAny);
  const res = await pushContact(input);
  if (!res.ok) return { error: res.error };

  await admin
    .from('encounters')
    .update({ provenance: { ...(encAny.provenance ?? {}), hubspot: { action: res.result.action, pushed_at: new Date().toISOString() } } })
    .eq('id', encounterId);

  revalidatePath('/planning');
  return { success: true, contactUrl: res.result.contactUrl, action: res.result.action, mock: res.result.mock };
}

// ── C5 AI conference discovery ────────────────────────────────────────────────

// Mock candidates for when no Anthropic key is set — real events not in the seed, with pre-baked
// factor breakdowns so discovery is fully demoable offline (labeled as a demo in the UI).
const MOCK_CANDIDATES: Omit<DiscoveredCandidate, 'icpScore' | 'tier'>[] = [
  {
    name: 'MPE (Merchant Payments Ecosystem) 2026', startDate: '2026-02-24', endDate: '2026-02-26',
    location: 'Berlin', country: 'Germany', region: 'Europe', verticals: ['payments', 'fintech'], estAudience: 1800,
    whyRelevant: 'Europe’s top merchant-payments event — dense with PSPs and acquirers, Grain’s core ICP.',
    scoreBreakdown: { factors: {
      icpDensity: { score: 80, rationale: 'Heavily PSP/acquirer/merchant-payments — high ICP density' },
      topicFit: { score: 85, rationale: 'Merchant payments, cross-border, FX are central themes' },
      scale: { score: 45, rationale: '~1,800 attendees — focused, not mass-market' },
      geoRelevance: { score: 88, rationale: 'Berlin, EU core market' },
      historicalPerf: null } },
  },
  {
    name: 'EBAday 2026', startDate: '2026-06-16', endDate: '2026-06-17',
    location: 'Paris', country: 'France', region: 'Europe', verticals: ['payments', 'treasury', 'banking'], estAudience: 1600,
    whyRelevant: 'Euro Banking Association’s payments/treasury event — senior treasury and FX buyers.',
    scoreBreakdown: { factors: {
      icpDensity: { score: 82, rationale: 'Banks and treasury desks — FX-adjacent decision-makers' },
      topicFit: { score: 84, rationale: 'Payments + treasury + cross-border settlement' },
      scale: { score: 44, rationale: '~1,600 attendees — high seniority' },
      geoRelevance: { score: 88, rationale: 'Paris, EU core' },
      historicalPerf: null } },
  },
  {
    name: 'Seamless Middle East 2026', startDate: '2026-05-12', endDate: '2026-05-14',
    location: 'Dubai', country: 'UAE', region: 'MEA', verticals: ['payments', 'fintech', 'retail'], estAudience: 20000,
    whyRelevant: 'Large MEA payments/fintech expo — emerging market with growing cross-border flows.',
    scoreBreakdown: { factors: {
      icpDensity: { score: 58, rationale: 'Broad payments/retail; ICP buyers a minority of a large crowd' },
      topicFit: { score: 70, rationale: 'Payments and fintech tracks relevant; retail dilutes' },
      scale: { score: 80, rationale: '~20,000 attendees — large reach' },
      geoRelevance: { score: 55, rationale: 'MEA is an emerging, secondary market for Grain' },
      historicalPerf: null } },
  },
  {
    name: 'Fintech Meetup 2026', startDate: '2026-03-09', endDate: '2026-03-12',
    location: 'Las Vegas', country: 'USA', region: 'Americas', verticals: ['fintech', 'payments', 'banking'], estAudience: 6000,
    whyRelevant: 'US fintech networking event built around double-opt-in meetings — efficient for targeted ICP outreach.',
    scoreBreakdown: { factors: {
      icpDensity: { score: 66, rationale: 'Solid US fintech/payments mix' },
      topicFit: { score: 72, rationale: 'Payments and banking well represented' },
      scale: { score: 70, rationale: '~6,000 attendees with structured meetings' },
      geoRelevance: { score: 72, rationale: 'US is a secondary but growing market' },
      historicalPerf: null } },
  },
];

export async function discoverConferencesAction(
  query: string,
): Promise<{ candidates: DiscoveredCandidate[]; mock: boolean } | { error: string }> {
  const me = await getCurrentRep();
  if (!me) return { error: 'Not authenticated' };

  const existing = await getConferences();
  const existingNames = existing.map((c) => c.name);
  const existingLower = new Set(existingNames.map((n) => n.toLowerCase()));

  // AI discovery; fall back to mock candidates if no key.
  let raw: Omit<DiscoveredCandidate, 'scoreBreakdown' | 'icpScore' | 'tier'>[] | null = null;
  try {
    const out = await discoverConferences(query || 'fintech, payments, treasury and travel events', existingNames);
    raw = out.candidates;
  } catch (err) {
    if (!(err instanceof MissingServiceKeyError)) {
      return { error: err instanceof Error ? err.message : 'Discovery failed' };
    }
  }

  if (raw === null) {
    const candidates = MOCK_CANDIDATES
      .filter((c) => !existingLower.has(c.name.toLowerCase()))
      .map((c) => {
        const { score, tier } = computeIcpScore(c.scoreBreakdown!, DEFAULT_WEIGHTS);
        return { ...c, icpScore: score, tier };
      });
    return { candidates, mock: true };
  }

  // Score each AI candidate (cap to keep it fast/cheap).
  const sliced = raw.filter((c) => !existingLower.has(c.name.toLowerCase())).slice(0, 6);
  const candidates: DiscoveredCandidate[] = [];
  for (const c of sliced) {
    let scoreBreakdown = null;
    let icpScore: number | null = null;
    let tier: 'T1' | 'T2' | 'T3' | null = null;
    try {
      scoreBreakdown = await scoreConference({
        name: c.name, location: c.location, country: c.country, region: c.region,
        verticals: c.verticals, estAudience: c.estAudience, startDate: c.startDate,
      });
      const r = computeIcpScore(scoreBreakdown, DEFAULT_WEIGHTS);
      icpScore = r.score;
      tier = r.tier;
    } catch {
      /* leave unscored */
    }
    candidates.push({ ...c, scoreBreakdown, icpScore, tier });
  }
  return { candidates, mock: false };
}

export async function addDiscoveredConference(
  c: DiscoveredCandidate,
): Promise<{ success: true } | { error: string }> {
  const me = await getCurrentRep();
  if (!me) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: dupe } = await admin.from('conferences').select('id').ilike('name', c.name).limit(1).maybeSingle();
  if (dupe) return { error: 'Already in the database' };

  const { error } = await admin.from('conferences').insert({
    name: c.name, start_date: c.startDate, end_date: c.endDate, location: c.location,
    country: c.country, region: c.region, verticals: c.verticals, est_audience: c.estAudience,
    icp_score: c.icpScore, tier: c.tier, score_breakdown: c.scoreBreakdown, source: 'discovery',
  });
  if (error) return { error: error.message };
  revalidatePath('/planning');
  return { success: true };
}

// Bulk: push several flagged contacts at once (the curated team handoff).
export async function bulkPushToHubSpot(
  encounterIds: string[],
): Promise<{ pushed: number; failed: number; mock: boolean }> {
  let pushed = 0;
  let failed = 0;
  let mock = false;
  for (const id of encounterIds) {
    const r = await pushToHubSpot(id);
    if ('error' in r) failed += 1;
    else {
      pushed += 1;
      mock = mock || r.mock;
    }
  }
  return { pushed, failed, mock };
}
