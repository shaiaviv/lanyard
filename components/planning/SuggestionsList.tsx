'use client';
import Link from 'next/link';
import { Bot, Cpu, Clock } from 'lucide-react';
import type { CoverageSuggestion } from '@/lib/types';

function HeadlineStat({ draft }: { draft: CoverageSuggestion['draft'] }) {
  const { t1Covered, t1Total, clustersFormed } = draft.stats;
  return (
    <span className="text-[11px] text-text3">
      T1 {t1Covered}/{t1Total}
      {clustersFormed > 0 && ` · ${clustersFormed} cluster${clustersFormed > 1 ? 's' : ''}`}
    </span>
  );
}

export function SuggestionsList({
  suggestions,
  activeSuggestionId,
}: {
  suggestions: CoverageSuggestion[];
  activeSuggestionId?: string;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <p className="text-[11px] font-semibold text-text3 px-4 py-2.5 border-b border-white/6">
        Past suggestions
      </p>
      <div className="divide-y divide-white/6 max-h-64 overflow-y-auto">
        {suggestions.map((s) => {
          const isActive = s.id === activeSuggestionId;
          const Icon = s.source === 'heuristic' ? Cpu : Bot;
          const label = s.prompt?.trim()
            ? s.prompt.length > 50 ? s.prompt.slice(0, 50) + '…' : s.prompt
            : 'Balanced default';
          const when = new Date(s.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          });
          return (
            <Link
              key={s.id}
              href={`/planning?suggestionId=${s.id}`}
              className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition-colors ${isActive ? 'bg-accent/5' : ''}`}
            >
              <Icon size={13} className={s.source === 'heuristic' ? 'text-blue-400 flex-shrink-0' : 'text-accent flex-shrink-0'} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text2 truncate">{label}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Clock size={9} className="text-text3" />
                  <span className="text-[10px] text-text3">{when}</span>
                  <HeadlineStat draft={s.draft} />
                </div>
              </div>
              {isActive && (
                <span className="text-[10px] font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded">active</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
