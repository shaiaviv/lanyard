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
    <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <RefreshCw size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-orange-900">Looks like you&apos;ve met this person before</p>
          <p className="text-xs text-orange-700 mt-0.5">
            {pct}% confidence · {top.reasoning}
            {top.jobChange && <span className="ml-1 text-amber-600 font-medium">· may have changed jobs</span>}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm(top.contactId)}
          className="flex-1 h-9 rounded-lg bg-orange-500 text-white text-sm font-semibold"
        >
          ✓ Same person
        </button>
        <button
          type="button"
          onClick={onAddNew}
          className="flex-1 h-9 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium"
        >
          New contact
        </button>
        <button
          type="button"
          onClick={onSaveLater}
          className="flex-1 h-9 rounded-lg border border-zinc-300 text-zinc-500 text-sm"
        >
          Decide later
        </button>
      </div>
    </div>
  );
}
