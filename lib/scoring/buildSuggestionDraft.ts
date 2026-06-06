// The trust layer — turns raw AI (or heuristic) output into a validated SuggestionDraft.
// Pure + isomorphic (NO 'server-only'). Hard constraints enforced here, never trusted to the AI.
// Plans/tech/3b-coverage-suggestions.md §3.2.
import type {
  SuggestionDraft, SuggestionEngineInput, SuggestedAssignment,
  SuggestionConflict, SuggestionStats,
} from '@/lib/types';
import type { CoverageSuggestionOutput } from '@/lib/ai/schemas';
import { clusterTrips } from '@/lib/scoring/clusterTrips';
import { computeGapSummary } from '@/lib/scoring/gapAnalysis';

function overlaps(
  aStart: string | null, aEnd: string | null,
  bStart: string | null, bEnd: string | null,
): boolean {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart <= bEnd && bStart <= aEnd; // inclusive interval intersection
}

export function buildSuggestionDraft(
  raw: CoverageSuggestionOutput,
  ctx: SuggestionEngineInput,
  generatedAt: string,
  source: 'ai' | 'heuristic',
): SuggestionDraft {
  const confById = new Map(ctx.conferences.map((c) => [c.id, c]));
  const repById = new Map(ctx.reps.map((r) => [r.id, r]));
  const conflicts: SuggestionConflict[] = [];

  // ── Step 1: Inject locked committed rows ────────────────────────────────────
  const effectiveAssignments = new Map<string, SuggestedAssignment>(); // key = repId+confId
  for (const { repId, conferenceId } of ctx.committed) {
    const key = `${repId}|${conferenceId}`;
    effectiveAssignments.set(key, { repId, conferenceId, locked: true, order: 0, clusterId: null });
  }

  // ── Step 2: Validate + merge AI assignments ──────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  for (const a of raw.assignments) {
    if (!repById.has(a.repId)) continue;          // hallucinated rep
    const conf = confById.get(a.conferenceId);
    if (!conf) continue;                           // hallucinated conference
    if (conf.endDate && conf.endDate < today) continue; // past event
    const key = `${a.repId}|${a.conferenceId}`;
    if (effectiveAssignments.has(key)) continue;  // already locked or duplicate
    effectiveAssignments.set(key, { repId: a.repId, conferenceId: a.conferenceId, locked: false, order: 0, clusterId: null });
  }

  // ── Step 3: Enforce no double-booking per rep ────────────────────────────────
  const repAssignmentList = new Map<string, SuggestedAssignment[]>();
  for (const a of effectiveAssignments.values()) {
    if (!repAssignmentList.has(a.repId)) repAssignmentList.set(a.repId, []);
    repAssignmentList.get(a.repId)!.push(a);
  }

  for (const [repId, list] of repAssignmentList) {
    const sorted = list.sort((x, y) => {
      const cx = confById.get(x.conferenceId);
      const cy = confById.get(y.conferenceId);
      return (cx?.startDate ?? '').localeCompare(cy?.startDate ?? '');
    });

    // Keep locked first; for non-locked, check against all already-kept.
    const kept: SuggestedAssignment[] = [];
    for (const a of sorted) {
      if (a.locked) { kept.push(a); continue; }
      const cNew = confById.get(a.conferenceId)!;
      const clash = kept.find((k) => {
        const ck = confById.get(k.conferenceId)!;
        if (!cNew.startDate || !cNew.endDate || !ck.startDate || !ck.endDate) {
          // Missing dates: treat as non-overlapping but record an undated conflict.
          if (!cNew.startDate || !cNew.endDate) {
            conflicts.push({ kind: 'undated', message: `${cNew.name} has no dates — booking order is approximate.`, repId, conferenceId: a.conferenceId });
          }
          return false;
        }
        return overlaps(cNew.startDate, cNew.endDate, ck.startDate, ck.endDate);
      });
      if (clash) {
        const clashConf = confById.get(clash.conferenceId);
        conflicts.push({ kind: 'double_booking', message: `${repId}: ${cNew.name} overlaps with ${clashConf?.name ?? clash.conferenceId} — dropped.`, repId, conferenceId: a.conferenceId });
        effectiveAssignments.delete(`${repId}|${a.conferenceId}`);
      } else {
        kept.push(a);
      }
    }
  }

  // ── Step 4: Enforce capacity (trim lowest-ICP non-locked if over cap) ────────
  for (const [repId, list] of repAssignmentList) {
    const rep = repById.get(repId)!;
    const inMap = [...effectiveAssignments.values()].filter((a) => a.repId === repId);
    if (inMap.length <= rep.capacity) continue;

    const nonLocked = inMap.filter((a) => !a.locked).sort((x, y) => {
      const cx = confById.get(x.conferenceId);
      const cy = confById.get(y.conferenceId);
      return (cx?.icpScore ?? 0) - (cy?.icpScore ?? 0); // ascending — drop lowest ICP first
    });

    let excess = inMap.length - rep.capacity;
    for (const a of nonLocked) {
      if (excess <= 0) break;
      effectiveAssignments.delete(`${a.repId}|${a.conferenceId}`);
      const conf = confById.get(a.conferenceId);
      conflicts.push({ kind: 'capacity', message: `${rep.capacity}-conf cap for rep ${repId}: dropped ${conf?.name ?? a.conferenceId} (lowest ICP).`, repId, conferenceId: a.conferenceId });
      excess -= 1;
    }
    void list; // suppress unused-var warning from the outer loop binding
  }

  // ── Step 5: Compute order + clusters per rep ─────────────────────────────────
  const finalList = [...effectiveAssignments.values()];
  const byRep = new Map<string, typeof finalList>();
  for (const a of finalList) {
    if (!byRep.has(a.repId)) byRep.set(a.repId, []);
    byRep.get(a.repId)!.push(a);
  }

  const allClusters: import('@/lib/types').TripCluster[] = [];
  for (const [repId, assignments] of byRep) {
    const stops = assignments.map((a) => {
      const c = confById.get(a.conferenceId)!;
      return { conferenceId: a.conferenceId, startDate: c.startDate, endDate: c.endDate, region: c.region, lat: c.latitude, lng: c.longitude };
    });
    const { order, clusters } = clusterTrips(repId, stops);
    allClusters.push(...clusters);
    const clusterForConf = new Map<string, string>();
    for (const cl of clusters) {
      for (const cid of cl.conferenceIds) clusterForConf.set(cid, cl.id);
    }
    for (const a of assignments) {
      a.order = order.get(a.conferenceId) ?? 0;
      a.clusterId = clusterForConf.get(a.conferenceId) ?? null;
    }
  }

  // ── Step 6: Add unmapped conflicts ───────────────────────────────────────────
  for (const a of finalList) {
    const c = confById.get(a.conferenceId);
    if (c && (c.latitude == null || c.longitude == null)) {
      conflicts.push({ kind: 'unmapped', message: `${c.name} has no coordinates — excluded from the travel-map route.`, conferenceId: a.conferenceId });
    }
  }

  // ── Step 7: Compute stats ────────────────────────────────────────────────────
  const coveredConfIds = new Set(finalList.map((a) => a.conferenceId));
  const upcoming = ctx.conferences.filter((c) => !c.endDate || c.endDate >= today);
  const gap = computeGapSummary(upcoming, coveredConfIds);
  const stats: SuggestionStats = {
    t1Covered: gap.t1Covered, t1Total: gap.t1Total,
    t2Covered: gap.t2Covered, t2Total: gap.t2Total,
    icpWeightedCoverage: gap.icpWeightedCoverage,
    byRegion: gap.byRegion, byQuarter: gap.byQuarter,
    clustersFormed: allClusters.length,
  };

  // ── Step 8: Map unsatisfiable → prompt_unsatisfiable conflicts ───────────────
  for (const u of raw.unsatisfiable ?? []) {
    conflicts.push({ kind: 'prompt_unsatisfiable', message: `${u.request}: ${u.why}` });
  }

  return {
    assignments: finalList,
    clusters: allClusters,
    rationale: raw.rationale,
    perRepNotes: raw.perRepNotes,
    conflicts,
    stats,
    generatedAt,
    conferenceCount: ctx.conferences.length,
    source,
  };
}
