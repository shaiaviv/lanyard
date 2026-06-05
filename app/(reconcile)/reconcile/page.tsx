import Link from 'next/link';
import { ChevronRight, CheckCircle } from 'lucide-react';
import { getCurrentRep, getPendingEncounters } from '@/lib/db/queries';
import { TemperatureChip } from '@/components/field/TemperaturePicker';
import type { Temperature } from '@/lib/types';

export default async function ReconcilePage() {
  const rep = await getCurrentRep();
  if (!rep) return null;

  const pending = await getPendingEncounters(rep.id);

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <CheckCircle size={40} className="text-green-400" />
        <h2 className="font-semibold text-zinc-900">All caught up!</h2>
        <p className="text-sm text-zinc-500 max-w-xs">
          No pending contacts to review. Captures marked &ldquo;decide later&rdquo; will appear here.
        </p>
        <Link href="/leads" className="mt-2 text-sm text-orange-600 font-medium">
          Back to leads →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-400 font-medium">
        {pending.length} contact{pending.length !== 1 ? 's' : ''} waiting · newest first
      </p>

      {pending.map((enc) => {
        const snap = enc.identitySnapshot;
        const displayName = snap?.name ?? enc.contact?.canonicalName ?? 'Unknown';
        const displayCompany = snap?.company ?? enc.contact?.currentCompany ?? null;
        const candidates = enc.matchCandidates ?? [];
        const best = candidates.find((c) => c.decision === 'same');

        return (
          <Link
            key={enc.id}
            href={`/reconcile/${enc.id}`}
            className="block border border-zinc-200 rounded-xl p-4 hover:border-zinc-300 transition-colors active:bg-zinc-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-zinc-900 truncate">{displayName}</p>
                  {enc.temperature && (
                    <TemperatureChip value={enc.temperature as Temperature} />
                  )}
                </div>
                {displayCompany && (
                  <p className="text-sm text-zinc-500 truncate mt-0.5">{displayCompany}</p>
                )}
                {enc.note && (
                  <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2">{enc.note}</p>
                )}
                {best && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span className="text-xs text-orange-700 font-medium">
                      {Math.round(best.confidence * 100)}% match found
                    </span>
                  </div>
                )}
              </div>
              <ChevronRight size={16} className="text-zinc-400 flex-shrink-0 mt-1" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
