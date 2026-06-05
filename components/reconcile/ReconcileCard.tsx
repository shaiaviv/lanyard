'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, User, Building, Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import { resolveEncounter, reanalyzeEncounter, skipEncounter } from '@/app/actions/reconcile';
import { TemperatureChip } from '@/components/field/TemperaturePicker';
import type { Encounter, MatchCandidate, Temperature } from '@/lib/types';

interface ContactSummary {
  contact: {
    id: string;
    canonicalName: string;
    currentCompany: string | null;
    currentTitle: string | null;
    email: string | null;
  };
  encounters: {
    id: string;
    occurredAt: string;
    note: string | null;
    temperature: string | null;
    conferenceId: string | null;
  }[];
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
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <CheckCircle2 size={22} className="text-success" />
        </div>
        <p className="font-semibold text-text1">Resolved!</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* This capture */}
      <div className="bg-elevated rounded-xl p-4 space-y-2 border border-white/7">
        <p className="text-xs font-semibold text-text3">New capture</p>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-base font-bold text-text1">{displayName}</p>
          {encounter.temperature && (
            <TemperatureChip value={encounter.temperature as Temperature} />
          )}
        </div>
        {snap?.company && (
          <div className="flex items-center gap-1.5 text-sm text-text2">
            <Building size={13} className="text-text3" />
            {snap.company}{snap.title ? ` · ${snap.title}` : ''}
          </div>
        )}
        {encounter.note && (
          <p className="text-sm text-text2 italic leading-relaxed">&ldquo;{encounter.note}&rdquo;</p>
        )}
        <p className="text-xs text-text3 flex items-center gap-1">
          <Calendar size={11} />
          {new Date(encounter.occurredAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Best match card */}
      {best && bestContact ? (
        <div className="rounded-xl overflow-hidden border-2 border-accent/20">
          <div className="px-4 py-2.5 flex items-center justify-between bg-accent/[0.06]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-accent/10">
                <RefreshCw size={12} className="text-accent" />
              </div>
              <p className="text-sm font-semibold text-text1">
                Possible repeat · {Math.round(best.confidence * 100)}% confident
              </p>
            </div>
            {best.jobChange && (
              <span className="text-xs text-warn font-semibold px-2 py-0.5 rounded-full bg-warn/10 border border-warn/20">
                Job change?
              </span>
            )}
          </div>
          <div className="p-4 space-y-3 bg-card">
            <p className="text-xs text-text3 italic leading-relaxed">{best.reasoning}</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <User size={13} className="text-text3" />
                <p className="text-sm font-semibold text-text1">{bestContact.contact.canonicalName}</p>
              </div>
              {bestContact.contact.currentCompany && (
                <div className="flex items-center gap-1.5">
                  <Building size={13} className="text-text3" />
                  <p className="text-sm text-text2">
                    {bestContact.contact.currentTitle
                      ? `${bestContact.contact.currentTitle} · `
                      : ''}
                    {bestContact.contact.currentCompany}
                  </p>
                </div>
              )}
            </div>

            {bestContact.encounters.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-white/7">
                <p className="text-xs font-semibold text-text3">
                  {bestContact.encounters.length} prior meeting{bestContact.encounters.length !== 1 ? 's' : ''}
                </p>
                {bestContact.encounters.slice(0, 3).map((e) => (
                  <div key={e.id} className="flex items-start gap-2 text-xs">
                    <span className="text-text3 mt-0.5">·</span>
                    <div>
                      <span className="text-text2 font-medium">
                        {new Date(e.occurredAt).toLocaleDateString('en-GB', {
                          month: 'short',
                          year: '2-digit',
                        })}
                      </span>
                      {e.note && (
                        <span className="ml-1 text-text3 italic truncate">
                          — {e.note.slice(0, 60)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-4 text-center space-y-1.5 bg-white/3 border border-white/7">
          <p className="text-sm font-medium text-text2">No confident match found</p>
          <p className="text-xs text-text3">
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
            className="w-full h-12 rounded-xl bg-accent text-[#07090F] font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ boxShadow: '0 4px 20px rgba(244,168,37,0.22)' }}
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              '✓ Same person — link records'
            )}
          </button>
        )}
        <button
          onClick={() => handleAction('new')}
          disabled={isPending}
          className="w-full h-11 rounded-xl text-text1 font-medium text-sm disabled:opacity-40 hover:bg-elevated transition-colors border border-white/10"
        >
          Create new contact
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleReanalyze}
            disabled={isReanalyzing || isPending}
            className="flex-1 h-9 rounded-xl text-text3 text-xs flex items-center justify-center gap-1.5 hover:text-text2 transition-colors disabled:opacity-40 border border-white/8"
          >
            {isReanalyzing ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            Re-analyze
          </button>
          <button
            onClick={() => handleAction('skip')}
            disabled={isPending}
            className="flex-1 h-9 rounded-xl text-text3 text-xs hover:text-text2 transition-colors disabled:opacity-40 border border-white/7"
          >
            Skip for now
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-3 py-2.5 bg-error/7 border border-error/15">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
