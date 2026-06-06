'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { SuggestionDraft, SuggestionStats } from '@/lib/types';

function StatBar({ covered, total }: { covered: number; total: number }) {
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
  const tone = pct === 0 ? 'bg-warn' : pct < 50 ? 'bg-amber-400' : 'bg-success';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-white/6 overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-text3 tabular-nums w-8 text-right">{covered}/{total}</span>
    </div>
  );
}

function StatsPanel({ stats }: { stats: SuggestionStats }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
      <div>
        <p className="text-text3 mb-1.5">T1 coverage</p>
        <StatBar covered={stats.t1Covered} total={stats.t1Total} />
      </div>
      <div>
        <p className="text-text3 mb-1.5">T2 coverage</p>
        <StatBar covered={stats.t2Covered} total={stats.t2Total} />
      </div>
      <div className="col-span-2">
        <p className="text-text3 mb-1">ICP-weighted coverage <span className="text-text2 font-semibold">{stats.icpWeightedCoverage}%</span></p>
      </div>
      {stats.clustersFormed > 0 && (
        <div className="col-span-2">
          <p className="text-text3">Trip clusters formed <span className="text-accent font-semibold">{stats.clustersFormed}</span></p>
        </div>
      )}
    </div>
  );
}

export function SuggestionSummary({ draft, reps }: { draft: SuggestionDraft; reps: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(true);
  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? id;

  return (
    <div
      className="rounded-xl border mb-4 overflow-hidden"
      style={{ background: 'rgba(244,168,37,0.03)', border: '1px solid rgba(244,168,37,0.14)' }}
    >
      {/* Header row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/2 transition-colors"
      >
        <span className="text-sm font-semibold text-text1">Suggestion rationale</span>
        {open ? <ChevronUp size={14} className="text-text3" /> : <ChevronDown size={14} className="text-text3" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* Stats */}
          <StatsPanel stats={draft.stats} />

          {/* Rationale text */}
          <div>
            <p className="text-[11px] text-text3 font-semibold mb-1.5">AI reasoning</p>
            <p className="text-sm text-text2 leading-relaxed">{draft.rationale}</p>
          </div>

          {/* Per-rep notes */}
          {draft.perRepNotes.length > 0 && (
            <div>
              <p className="text-[11px] text-text3 font-semibold mb-1.5">Per-rep notes</p>
              <div className="space-y-1.5">
                {draft.perRepNotes.map((n) => (
                  <div key={n.repId} className="text-xs text-text2">
                    <span className="font-semibold text-text1">{repName(n.repId)}: </span>
                    {n.note}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Snapshot info */}
          <p className="text-[10px] text-text3">
            Snapshot generated against {draft.conferenceCount} conferences ·{' '}
            {draft.source === 'heuristic' ? 'Non-AI (heuristic) allocation' : 'AI-generated allocation'}
          </p>
        </div>
      )}
    </div>
  );
}
