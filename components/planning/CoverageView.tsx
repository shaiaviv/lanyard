'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CalendarRange, Map as MapIcon } from 'lucide-react';
import { CoverageTimeline } from '@/components/planning/CoverageTimeline';
import type { Conference } from '@/lib/types';
import type { CoverageRow, GapAnalysis } from '@/lib/db/queries';

// Leaflet touches `window`, so the map must be client-only (no SSR).
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
}: {
  conferences: Conference[];
  coverage: CoverageRow[];
  gap: GapAnalysis;
}) {
  const [view, setView] = useState<'timeline' | 'map'>('timeline');

  const committedByConf: Record<string, string[]> = {};
  for (const c of coverage) {
    if (c.status !== 'committed') continue;
    (committedByConf[c.conferenceId] ??= []).push(c.repName);
  }

  return (
    <div className="space-y-5">
      {/* Gap analysis — coverage rates the timeline/map can't show at a glance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/8 bg-card p-4">
          <p className="text-xs font-semibold text-text2 mb-3">Coverage by region (upcoming)</p>
          <div className="space-y-2">
            {gap.byRegion.map((r) => (
              <div key={r.region}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text2">{r.region}</span>
                </div>
                <CoverageBar covered={r.covered} total={r.total} />
              </div>
            ))}
            {gap.byRegion.length === 0 && <p className="text-xs text-text3">No upcoming events.</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-card p-4">
          <p className="text-xs font-semibold text-text2 mb-3">Coverage by quarter (upcoming)</p>
          <div className="space-y-2">
            {gap.byQuarter.map((q) => (
              <div key={q.quarter}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text2">{q.quarter}</span>
                </div>
                <CoverageBar covered={q.covered} total={q.total} />
              </div>
            ))}
            {gap.byQuarter.length === 0 && <p className="text-xs text-text3">No upcoming events.</p>}
          </div>
        </div>
      </div>

      {/* View toggle */}
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

      {view === 'timeline' ? (
        <CoverageTimeline conferences={conferences} coverage={coverage} />
      ) : (
        <>
          <CoverageMap conferences={conferences} committedByConf={committedByConf} />
          <div className="flex items-center gap-4 text-xs text-text3 flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#f59e0b' }} /> T1</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#60a5fa' }} /> T2</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#94a3b8' }} /> T3</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: '#10b981' }} /> committed coverage</span>
            <span>· marker size = ICP score</span>
          </div>
        </>
      )}
    </div>
  );
}
