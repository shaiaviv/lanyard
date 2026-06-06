'use client';
import Link from 'next/link';
import { Eye, X } from 'lucide-react';
import type { CoverageSuggestion } from '@/lib/types';

export function SuggestionBanner({ suggestion }: { suggestion: CoverageSuggestion }) {
  const isHeuristic = suggestion.source === 'heuristic';

  const promptEcho = suggestion.prompt?.trim()
    ? (suggestion.prompt.length > 100 ? suggestion.prompt.slice(0, 100) + '…' : suggestion.prompt)
    : null;

  const timestamp = new Date(suggestion.createdAt).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div
      className="rounded-xl px-4 py-3.5"
      style={{
        background: 'rgba(244,168,37,0.06)',
        border: '1px solid rgba(244,168,37,0.2)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {/* Mode icon */}
          <div
            className="mt-0.5 flex-shrink-0 w-6 h-6 rounded flex items-center justify-center"
            style={{ background: 'rgba(244,168,37,0.1)', border: '1px solid rgba(244,168,37,0.22)' }}
          >
            <Eye size={12} className="text-accent" strokeWidth={2} />
          </div>

          <div className="min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <span className="text-sm font-semibold text-accent leading-none">
                {isHeuristic ? 'Heuristic' : 'AI-generated'} coverage preview
              </span>
              <span className="text-[11px] text-text3 leading-none">{timestamp}</span>
            </div>

            {/* Context line — the critical new addition */}
            <p className="text-xs text-text2 leading-relaxed" style={{ maxWidth: '68ch' }}>
              You are viewing a draft plan. All assignments and coverage data on this page reflect
              this suggestion only — your team's real commitments are unchanged.
            </p>

            {/* Prompt echo */}
            {promptEcho && (
              <p className="text-xs text-text3 mt-1.5 italic truncate" style={{ maxWidth: '68ch' }}>
                &ldquo;{promptEcho}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Exit CTA — right-aligned, anchored to title row height */}
        <Link
          href="/planning"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text2 border border-white/10 hover:border-white/18 hover:text-text1 transition-colors"
        >
          <X size={11} />
          Exit preview
        </Link>
      </div>
    </div>
  );
}
