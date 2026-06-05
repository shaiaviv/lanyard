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
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-1"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <CheckCircle size={22} className="text-success" />
        </div>
        <h2 className="font-semibold text-text1">All caught up</h2>
        <p className="text-sm text-text3 max-w-xs leading-relaxed">
          No pending contacts to review. Captures marked &ldquo;decide later&rdquo; will appear here.
        </p>
        <Link href="/leads" className="mt-2 text-sm text-accent font-semibold hover:text-accent-dim transition-colors">
          Back to leads
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-text3 font-medium">
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
            className="block rounded-xl p-4 transition-all hover:translate-y-[-1px]"
            style={{
              background: '#161E2E',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-text1 truncate">{displayName}</p>
                  {enc.temperature && (
                    <TemperatureChip value={enc.temperature as Temperature} />
                  )}
                </div>
                {displayCompany && (
                  <p className="text-sm text-text2 truncate mt-0.5">{displayCompany}</p>
                )}
                {enc.note && (
                  <p className="text-xs text-text3 mt-1.5 line-clamp-2 italic leading-relaxed">{enc.note}</p>
                )}
                {best && (
                  <div
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
                    style={{ background: 'rgba(244,168,37,0.08)', border: '1px solid rgba(244,168,37,0.2)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span className="text-xs text-accent font-medium">
                      {Math.round(best.confidence * 100)}% match found
                    </span>
                  </div>
                )}
              </div>
              <ChevronRight size={16} className="text-text3 flex-shrink-0 mt-1" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
