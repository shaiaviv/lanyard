'use client';
import { RefreshCw } from 'lucide-react';
import type { MatchCandidate } from '@/lib/types';

interface MetBeforeHintProps {
  candidates: MatchCandidate[];
  onConfirm: (contactId: string) => void;
  onAddNew: () => void;
  onSaveLater: () => void;
}

export function MetBeforeHint({ candidates, onConfirm, onAddNew, onSaveLater }: MetBeforeHintProps) {
  const top = candidates.find((c) => c.decision === 'same');
  if (!top) return null;

  const pct = Math.round(top.confidence * 100);

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: 'rgba(244,168,37,0.05)',
        border: '2px solid rgba(244,168,37,0.18)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(244,168,37,0.1)' }}
        >
          <RefreshCw size={14} className="text-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text1">
            Looks like you&apos;ve met this person before
          </p>
          <p className="text-xs text-text2 mt-0.5 leading-relaxed">
            {pct}% confidence · {top.reasoning}
            {top.jobChange && (
              <span className="ml-1 text-warn font-semibold">· may have changed jobs</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm(top.contactId)}
          className="flex-1 h-9 rounded-xl bg-accent text-[#07090F] text-sm font-bold transition-opacity hover:opacity-90"
        >
          ✓ Same person
        </button>
        <button
          type="button"
          onClick={onAddNew}
          className="flex-1 h-9 rounded-xl bg-elevated text-text1 text-sm font-medium transition-colors hover:bg-card"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          New contact
        </button>
        <button
          type="button"
          onClick={onSaveLater}
          className="flex-1 h-9 rounded-xl text-text3 text-sm transition-colors hover:text-text2"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
        >
          Decide later
        </button>
      </div>
    </div>
  );
}
