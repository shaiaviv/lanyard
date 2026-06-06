'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CalendarRange, Map as MapIcon, Users } from 'lucide-react';
import { CoverageTimeline } from '@/components/planning/CoverageTimeline';
import { SuggestionBanner } from '@/components/planning/SuggestionBanner';
import { SuggestionSummary } from '@/components/planning/SuggestionSummary';
import { GenerateSuggestionButton } from '@/components/planning/GenerateSuggestionButton';
import { SuggestionsList } from '@/components/planning/SuggestionsList';
import type { Conference, Rep, CoverageSuggestion } from '@/lib/types';
import type { CoverageRow, GapAnalysis } from '@/lib/db/queries';
import { computeGapSummary } from '@/lib/scoring/gapAnalysis';

const CoverageMap = dynamic(() => import('@/components/planning/CoverageMap'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-white/10 flex items-center justify-center text-sm text-text3" style={{ height: 460 }}>
      Loading map…
    </div>
  ),
});

function CoverageBar({ covered, total }: { covered: number; total: number }) {
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
  const tone = pct === 0 ? 'bg-warn' : pct < 50 ? 'bg-amber-400' : 'bg-success';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/6 overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-text3 tabular-nums w-10 text-right">{covered}/{total}</span>
    </div>
  );
}

export function CoverageView({
  conferences,
  coverage,
  gap,
  reps,
  activeSuggestion,
  suggestions,
}: {
  conferences: Conference[];
  coverage: CoverageRow[];
  gap: GapAnalysis;
  reps: Rep[];
  activeSuggestion?: CoverageSuggestion | null;
  suggestions?: CoverageSuggestion[];
}) {
  const [view, setView] = useState<'timeline' | 'map'>('timeline');
  const [repFilter, setRepFilter] = useState<string>('all');

  const isSuggestionMode = !!activeSuggestion;

  // Build effective coverage: in suggestion mode, overlay the draft assignments onto the real
  // committed rows. One render path, two data sources.
  const effectiveCoverage: CoverageRow[] = (() => {
    if (!activeSuggestion) return coverage;
    const { assignments } = activeSuggestion.draft;
    const repNameMap = new Map(reps.map((r) => [r.id, r.name]));
    return assignments.map((a, i) => ({
      id: `suggestion-${i}`,
      repId: a.repId,
      repName: repNameMap.get(a.repId) ?? a.repId,
      conferenceId: a.conferenceId,
      status: a.locked ? 'committed' : 'suggested',
    }));
  })();

  // Compute gap bars from the effective set (suggestion or real).
  const today = new Date().toISOString().split('T')[0];
  const upcoming = conferences.filter((c) => !c.endDate || c.endDate >= today);
  const committedOrSuggestedIds = new Set(
    effectiveCoverage
      .filter((c) => c.status === 'committed' || c.status === 'suggested')
      .map((c) => c.conferenceId),
  );
  const effectiveGap = isSuggestionMode
    ? computeGapSummary(upcoming, committedOrSuggestedIds)
    : null;

  const byRegion = effectiveGap?.byRegion ?? gap.byRegion;
  const byQuarter = effectiveGap?.byQuarter ?? gap.byQuarter;

  const committedByConf: Record<string, string[]> = {};
  for (const c of effectiveCoverage) {
    if (c.status !== 'committed' && c.status !== 'suggested') continue;
    (committedByConf[c.conferenceId] ??= []).push(c.repName);
  }

  return (
    <div className="space-y-5">
      {/* Generate + past suggestions — top of view in real mode */}
      {!isSuggestionMode && (
        <div className="space-y-3">
          <GenerateSuggestionButton />
          {suggestions && suggestions.length > 0 && (
            <SuggestionsList suggestions={suggestions} />
          )}
        </div>
      )}

      {/* Suggestion mode banner + summary */}
      {isSuggestionMode && (
        <>
          <SuggestionBanner suggestion={activeSuggestion} />
          <SuggestionSummary draft={activeSuggestion.draft} reps={reps} />
        </>
      )}

      {/* Gap analysis bars — recomputed over effective coverage in suggestion mode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/8 bg-card p-4">
          <p className="text-xs font-semibold text-text2 mb-3">Coverage by region (upcoming)</p>
          <div className="space-y-2">
            {byRegion.map((r) => (
              <div key={r.region}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text2">{r.region}</span>
                </div>
                <CoverageBar covered={r.covered} total={r.total} />
              </div>
            ))}
            {byRegion.length === 0 && <p className="text-xs text-text3">No upcoming events.</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-card p-4">
          <p className="text-xs font-semibold text-text2 mb-3">Coverage by quarter (upcoming)</p>
          <div className="space-y-2">
            {byQuarter.map((q) => (
              <div key={q.quarter}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text2">{q.quarter}</span>
                </div>
                <CoverageBar covered={q.covered} total={q.total} />
              </div>
            ))}
            {byQuarter.length === 0 && <p className="text-xs text-text3">No upcoming events.</p>}
          </div>
        </div>
      </div>

      {/* Rep filter + view toggle row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Rep filter */}
        <div className="flex items-center gap-1.5">
          <Users size={13} className="text-text3 flex-shrink-0" />
          <select
            value={repFilter}
            onChange={(e) => setRepFilter(e.target.value)}
            className="text-xs text-text2 bg-elevated border border-white/10 rounded-lg px-2 py-1.5 focus:outline-none focus:border-white/20"
          >
            <option value="all">All reps</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Timeline / Map toggle */}
        <div className="flex items-center gap-1">
          {([
            { key: 'timeline', label: 'Timeline', icon: CalendarRange },
            { key: 'map', label: 'Map', icon: MapIcon },
          ] as const).map((o) => {
            const Icon = o.icon;
            return (
              <button
                key={o.key}
                onClick={() => setView(o.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors border ${
                  view === o.key
                    ? 'bg-elevated text-text1 border-white/12'
                    : 'text-text3 hover:text-text2 border-white/6'
                }`}
              >
                <Icon size={13} /> {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {view === 'timeline' ? (
        <CoverageTimeline
          conferences={conferences}
          coverage={effectiveCoverage}
          repFilter={repFilter}
          isSuggestionMode={isSuggestionMode}
        />
      ) : (
        <>
          <CoverageMap
            conferences={conferences}
            committedByConf={committedByConf}
            repFilter={repFilter}
            repId={repFilter !== 'all' ? repFilter : undefined}
            suggestion={activeSuggestion?.draft}
            reps={reps}
          />
          {!isSuggestionMode && (
            <div className="flex items-center gap-4 text-xs text-text3 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#f59e0b' }} /> T1</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#60a5fa' }} /> T2</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#94a3b8' }} /> T3</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: '#10b981' }} /> committed coverage</span>
              <span>· marker size = ICP score</span>
            </div>
          )}
        </>
      )}

    </div>
  );
}
