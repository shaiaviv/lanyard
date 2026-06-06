'use client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SuggestionDraft } from '@/lib/types';

function StatBar({ label, covered, total }: { label: string; covered: number; total: number }) {
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
  const toneClass = pct === 0 ? 'bg-warn' : pct < 50 ? 'bg-amber-400' : 'bg-success';
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-text3">{label}</span>
        <span className="text-xs tabular-nums">
          <span className="text-text2 font-semibold">{covered}</span>
          <span className="text-text3">/{total}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className={`h-full rounded-full ${toneClass}`}
          style={{ width: `${pct}%`, transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </div>
    </div>
  );
}

export function SuggestionSummary({ draft, reps }: { draft: SuggestionDraft; reps: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(true);
  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? id;

  const t1Pct = draft.stats.t1Total > 0
    ? Math.round((draft.stats.t1Covered / draft.stats.t1Total) * 100)
    : 0;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(244,168,37,0.03)', border: '1px solid rgba(244,168,37,0.15)' }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/2 transition-colors"
      >
        <span className="text-sm font-semibold text-text1 flex-1">Suggestion rationale</span>

        {/* Preview stats visible only when collapsed */}
        {!open && (
          <div className="flex items-center gap-3 mr-1">
            <span className="text-[11px] text-text3 tabular-nums">
              T1 <span className="text-accent font-semibold">{t1Pct}%</span>
            </span>
            {draft.stats.clustersFormed > 0 && (
              <span className="text-[11px] text-text3 tabular-nums">
                {draft.stats.clustersFormed} cluster{draft.stats.clustersFormed !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        <ChevronDown
          size={14}
          className="text-text3 flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Animated body */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="border-t border-white/6 px-4 pt-4 pb-4 space-y-4">

            {/* Coverage stats */}
            <div className="space-y-3">
              <StatBar label="T1 coverage" covered={draft.stats.t1Covered} total={draft.stats.t1Total} />
              <StatBar label="T2 coverage" covered={draft.stats.t2Covered} total={draft.stats.t2Total} />
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-xs text-text3">ICP-weighted coverage</span>
                <span className="text-sm font-semibold text-text2 tabular-nums">{draft.stats.icpWeightedCoverage}%</span>
              </div>
              {draft.stats.clustersFormed > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text3">Trip clusters formed</span>
                  <span className="text-sm font-semibold text-accent tabular-nums">{draft.stats.clustersFormed}</span>
                </div>
              )}
            </div>

            {/* Rationale */}
            {draft.rationale && (
              <div className="border-t border-white/6 pt-4">
                <p className="text-sm text-text2 leading-relaxed">{draft.rationale}</p>
              </div>
            )}

            {/* Per-rep notes */}
            {draft.perRepNotes.length > 0 && (
              <div className="border-t border-white/6 pt-4 space-y-3">
                {draft.perRepNotes.map((n) => (
                  <div key={n.repId}>
                    <p className="text-xs font-semibold text-text1 mb-0.5">{repName(n.repId)}</p>
                    <p className="text-xs text-text2 leading-relaxed">{n.note}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Metadata footer */}
            <div className="border-t border-white/6 pt-3 flex items-center justify-between">
              <span className="text-[10px] text-text3">{draft.conferenceCount} conferences</span>
              <span className="text-[10px] text-text3">
                {draft.source === 'heuristic' ? 'Heuristic allocation' : 'AI-generated'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
