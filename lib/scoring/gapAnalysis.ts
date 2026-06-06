// Pure gap-analysis computation — shared by getGapAnalysis (server) and buildSuggestionDraft (pure).
// No 'server-only', no DB imports.

export interface ConfLite {
  id: string;
  tier: string | null;
  icpScore: number | null;
  startDate: string | null;
  region: string | null;
}

export interface GapSummary {
  byRegion: { region: string; total: number; covered: number }[];
  byQuarter: { quarter: string; total: number; covered: number }[];
  t1Covered: number; t1Total: number;
  t2Covered: number; t2Total: number;
  icpWeightedCoverage: number; // 0..100
}

export function computeGapSummary(upcomingConfs: ConfLite[], coveredIds: Set<string>): GapSummary {
  const regionMap = new Map<string, { total: number; covered: number }>();
  const quarterMap = new Map<string, { total: number; covered: number }>();
  let t1Covered = 0, t1Total = 0, t2Covered = 0, t2Total = 0;
  let icpWeightedNum = 0, icpWeightedDen = 0;

  for (const c of upcomingConfs) {
    const region = c.region ?? 'Unknown';
    const r = regionMap.get(region) ?? { total: 0, covered: 0 };
    r.total += 1;
    const isCovered = coveredIds.has(c.id);
    if (isCovered) r.covered += 1;
    regionMap.set(region, r);

    if (c.startDate) {
      const d = new Date(c.startDate);
      const q = `${d.getUTCFullYear()} Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
      const qa = quarterMap.get(q) ?? { total: 0, covered: 0 };
      qa.total += 1;
      if (isCovered) qa.covered += 1;
      quarterMap.set(q, qa);
    }

    if (c.tier === 'T1') {
      t1Total += 1;
      if (isCovered) t1Covered += 1;
    } else if (c.tier === 'T2') {
      t2Total += 1;
      if (isCovered) t2Covered += 1;
    }

    const score = c.icpScore ?? 0;
    icpWeightedDen += score;
    if (isCovered) icpWeightedNum += score;
  }

  return {
    byRegion: [...regionMap.entries()]
      .map(([region, v]) => ({ region, ...v }))
      .sort((a, b) => a.covered / Math.max(a.total, 1) - b.covered / Math.max(b.total, 1)),
    byQuarter: [...quarterMap.entries()]
      .map(([quarter, v]) => ({ quarter, ...v }))
      .sort((a, b) => a.quarter.localeCompare(b.quarter)),
    t1Covered, t1Total, t2Covered, t2Total,
    icpWeightedCoverage:
      icpWeightedDen > 0 ? Math.round((icpWeightedNum / icpWeightedDen) * 100) : 0,
  };
}
