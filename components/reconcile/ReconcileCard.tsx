'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, User, Building, Calendar, Loader2 } from 'lucide-react';
import { resolveEncounter, reanalyzeEncounter, skipEncounter } from '@/app/actions/reconcile';
import { TemperatureChip } from '@/components/field/TemperaturePicker';
import type { Encounter, MatchCandidate } from '@/lib/types';
import type { Temperature } from '@/lib/types';

interface ContactSummary {
  contact: { id: string; canonicalName: string; currentCompany: string | null; currentTitle: string | null; email: string | null };
  encounters: { id: string; occurredAt: string; note: string | null; temperature: string | null; conferenceId: string | null }[];
}

interface Props {
  encounter: Encounter;
  candidates: MatchCandidate[];
  bestContact: ContactSummary | null;
  existingContact: ContactSummary | null;
}

export function ReconcileCard({ encounter, candidates, bestContact, existingContact }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [liveCandidates, setLiveCandidates] = useState<MatchCandidate[]>(candidates);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const snap = encounter.identitySnapshot;
  const displayName = snap?.name ?? existingContact?.contact.canonicalName ?? 'Unknown';
  const best = liveCandidates.find((c) => c.decision === 'same');

  function handleAction(action: 'link' | 'new' | 'skip') {
    setError(null);
    startTransition(async () => {
      let result: { success?: true; error?: string };

      if (action === 'skip') {
        result = await skipEncounter(encounter.id);
      } else {
        result = await resolveEncounter({
          encounterId: encounter.id,
          action,
          contactId: action === 'link' ? (bestContact?.contact.id ?? best?.contactId) : undefined,
          name: snap?.name ?? undefined,
          company: snap?.company ?? null,
          title: snap?.title ?? null,
          email: snap?.email ?? null,
        });
      }

      if ('error' in result && result.error) {
        setError(result.error);
      } else {
        setDone(true);
        setTimeout(() => router.push('/reconcile'), 500);
      }
    });
  }

  async function handleReanalyze() {
    setIsReanalyzing(true);
    setError(null);
    const result = await reanalyzeEncounter(encounter.id);
    setIsReanalyzing(false);
    if ('error' in result) {
      setError(result.error);
    } else {
      setLiveCandidates(result.candidates);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-xl">✓</div>
        <p className="font-semibold text-zinc-900">Resolved!</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* This capture */}
      <div className="bg-zinc-50 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">New capture</p>
        <div className="flex items-center gap-2">
          <p className="text-base font-bold text-zinc-900">{displayName}</p>
          {encounter.temperature && (
            <TemperatureChip value={encounter.temperature as Temperature} />
          )}
        </div>
        {snap?.company && (
          <div className="flex items-center gap-1.5 text-sm text-zinc-600">
            <Building size={13} className="text-zinc-400" />
            {snap.company}{snap.title ? ` · ${snap.title}` : ''}
          </div>
        )}
        {encounter.note && (
          <p className="text-sm text-zinc-500 italic leading-relaxed">&ldquo;{encounter.note}&rdquo;</p>
        )}
        <p className="text-xs text-zinc-400">
          <Calendar size={11} className="inline mr-1" />
          {new Date(encounter.occurredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {/* Best match */}
      {best && bestContact ? (
        <div className="border-2 border-orange-200 rounded-xl overflow-hidden">
          <div className="bg-orange-50 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={14} className="text-orange-500" />
              <p className="text-sm font-semibold text-orange-900">
                Possible repeat · {Math.round(best.confidence * 100)}% confident
              </p>
            </div>
            {best.jobChange && (
              <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                Job change?
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-zinc-500 italic">{best.reasoning}</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <User size={13} className="text-zinc-400" />
                <p className="text-sm font-semibold text-zinc-900">{bestContact.contact.canonicalName}</p>
              </div>
              {bestContact.contact.currentCompany && (
                <div className="flex items-center gap-1.5">
                  <Building size={13} className="text-zinc-400" />
                  <p className="text-sm text-zinc-600">
                    {bestContact.contact.currentTitle ? `${bestContact.contact.currentTitle} · ` : ''}{bestContact.contact.currentCompany}
                  </p>
                </div>
              )}
            </div>

            {/* Prior encounters */}
            {bestContact.encounters.length > 0 && (
              <div className="border-t border-zinc-100 pt-3 space-y-2">
                <p className="text-xs font-medium text-zinc-500">
                  {bestContact.encounters.length} prior meeting{bestContact.encounters.length !== 1 ? 's' : ''}
                </p>
                {bestContact.encounters.slice(0, 3).map((e) => (
                  <div key={e.id} className="text-xs text-zinc-400 flex items-start gap-2">
                    <span className="text-zinc-300 mt-0.5">·</span>
                    <div>
                      <span className="text-zinc-500">
                        {new Date(e.occurredAt).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                      </span>
                      {e.note && <span className="ml-1 italic truncate"> — {e.note.slice(0, 60)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-xl p-4 text-center space-y-2">
          <p className="text-sm font-medium text-zinc-600">No confident match found</p>
          <p className="text-xs text-zinc-400">
            {liveCandidates.length > 0
              ? 'Candidates exist but confidence is low'
              : 'No existing contacts match this person'}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2.5">
        {best && bestContact && (
          <button
            onClick={() => handleAction('link')}
            disabled={isPending}
            className="w-full h-12 rounded-xl bg-orange-500 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : '✓ Same person — link records'}
          </button>
        )}
        <button
          onClick={() => handleAction('new')}
          disabled={isPending}
          className="w-full h-11 rounded-xl border border-zinc-300 text-zinc-700 font-medium text-sm disabled:opacity-40 hover:bg-zinc-50"
        >
          Create new contact
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleReanalyze}
            disabled={isReanalyzing || isPending}
            className="flex-1 h-9 rounded-xl border border-zinc-200 text-zinc-500 text-xs flex items-center justify-center gap-1.5 hover:bg-zinc-50 disabled:opacity-40"
          >
            {isReanalyzing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Re-analyze (Sonnet)
          </button>
          <button
            onClick={() => handleAction('skip')}
            disabled={isPending}
            className="flex-1 h-9 rounded-xl border border-zinc-200 text-zinc-400 text-xs hover:bg-zinc-50 disabled:opacity-40"
          >
            Skip for now
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  );
}
