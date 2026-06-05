// C4 ICP scoring — the DETERMINISTIC formula half of the engine. Pure + isomorphic (NO
// 'server-only'): the AI estimates the factor scores once (lib/ai/scoreConference), and THIS runs
// live on every weight-slider drag, client-side, with no AI re-call. That split is the whole point —
// AI fills the hard-to-get inputs, a transparent tunable formula turns them into a score.
// See plans/tech/3-planning.md §1.
import type { ConferenceScoreBreakdown } from '@/lib/types';

export interface ScoringWeights {
  icpDensity: number;
  topicFit: number;
  scale: number;
  geoRelevance: number;
  historicalPerf: number;
}

// Quality over headcount: ICP density dominates, scale is capped low. These defaults reproduce the
// originally seeded scores (e.g. Money20/20 Europe → 89). Weights are RELATIVE — the formula
// normalizes by the weights actually in play, so they need not sum to 100.
export const DEFAULT_WEIGHTS: ScoringWeights = {
  icpDensity: 40,
  topicFit: 25,
  scale: 15,
  geoRelevance: 10,
  historicalPerf: 10,
};

export const WEIGHT_FACTORS: { key: keyof ScoringWeights; label: string; hint: string }[] = [
  { key: 'icpDensity',     label: 'ICP Density',     hint: 'Share of attendees who are the right companies AND roles' },
  { key: 'topicFit',       label: 'Topic Fit',       hint: 'Does the agenda attract payments / fintech / treasury / FX?' },
  { key: 'scale',          label: 'Scale',           hint: 'Reach — relevant audience size (capped, not raw headcount)' },
  { key: 'geoRelevance',   label: 'Geo Relevance',   hint: 'In or near Grain target markets (EU core today)' },
  { key: 'historicalPerf', label: 'Historical Perf', hint: 'Pipeline from past attendance (repeat events only)' },
];

export type Tier = 'T1' | 'T2' | 'T3';

// T1 Must-attend / T2 Consider / T3 Skip. Thresholds per tech plan §1.
export function tierForScore(score: number): Tier {
  if (score >= 75) return 'T1';
  if (score >= 50) return 'T2';
  return 'T3';
}

// Weighted average over the factors PRESENT. A null factor (e.g. historicalPerf for a first-time
// event) is dropped and its weight redistributed proportionally across the rest — so a brand-new
// event isn't penalized for lacking a track record.
export function computeIcpScore(
  breakdown: ConferenceScoreBreakdown,
  weights: ScoringWeights,
): { score: number; tier: Tier } {
  const f = breakdown.factors;
  const parts: Array<[number | null | undefined, number]> = [
    [f.icpDensity?.score, weights.icpDensity],
    [f.topicFit?.score, weights.topicFit],
    [f.scale?.score, weights.scale],
    [f.geoRelevance?.score, weights.geoRelevance],
    [f.historicalPerf?.score ?? null, weights.historicalPerf],
  ];

  let weightedSum = 0;
  let weightTotal = 0;
  for (const [score, weight] of parts) {
    if (score == null || weight <= 0) continue;
    weightedSum += score * weight;
    weightTotal += weight;
  }

  const score = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;
  return { score, tier: tierForScore(score) };
}
