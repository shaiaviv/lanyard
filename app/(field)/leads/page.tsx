import Link from 'next/link';
import { ChevronRight, Inbox } from 'lucide-react';
import { LeadCard } from '@/components/field/LeadCard';
import {
  getCurrentRep,
  getActiveConference,
  getConferences,
  getEncountersForConference,
  getPendingCount,
} from '@/lib/db/queries';

interface Props {
  searchParams: Promise<{ conf?: string }>;
}

export default async function LeadsPage({ searchParams }: Props) {
  const params = await searchParams;
  const [rep, activeConference, conferences] = await Promise.all([
    getCurrentRep(),
    getActiveConference(),
    getConferences(),
  ]);
  if (!rep) return null;

  // Prefer explicit ?conf= param → date-active conference → rep's last selected conference
  const selectedId = params.conf ?? activeConference?.id ?? rep.currentConferenceId ?? null;
  const selectedConference = conferences.find((c) => c.id === selectedId) ?? activeConference;

  const [encounters, pendingCount] = await Promise.all([
    selectedId ? getEncountersForConference(selectedId, rep.id) : Promise.resolve([]),
    getPendingCount(rep.id),
  ]);

  return (
    <div className="flex flex-col animate-fade-in">
      <header className="px-5 pt-12 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h1 className="text-xl font-bold text-text1">My Leads</h1>
        {selectedConference ? (
          <p className="text-sm text-text2 mt-0.5 flex items-center gap-1.5">
            <span>{selectedConference.name}</span>
          </p>
        ) : (
          <p className="text-sm text-text3 mt-0.5">No conference selected</p>
        )}
      </header>

      {pendingCount > 0 && (
        <Link
          href="/reconcile"
          className="mx-4 mt-4 flex items-center justify-between rounded-xl px-4 py-3 transition-colors"
          style={{
            background: 'rgba(245,158,11,0.07)',
            border: '1px solid rgba(245,158,11,0.15)',
          }}
        >
          <div>
            <p className="text-sm font-semibold text-warn">
              {pendingCount} contact{pendingCount !== 1 ? 's' : ''} need review
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(245,158,11,0.55)' }}>
              Confirm or discard before data gets stale
            </p>
          </div>
          <ChevronRight size={16} className="text-warn/50 flex-shrink-0" />
        </Link>
      )}

      <div className="px-4 py-4 space-y-3">
        {encounters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-14 h-14 rounded-2xl bg-elevated flex items-center justify-center mb-4"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Inbox size={22} className="text-text3" />
            </div>
            <p className="font-semibold text-text2">No leads yet</p>
            <p className="text-sm text-text3 mt-1.5 leading-relaxed max-w-[200px]">
              {selectedConference
                ? 'Tap Capture to log your first contact'
                : 'Select a conference above'}
            </p>
            <Link
              href="/capture"
              className="mt-5 px-6 py-2.5 rounded-full bg-accent text-[#07090F] text-sm font-bold transition-opacity hover:opacity-90"
              style={{ boxShadow: '0 4px 16px rgba(244,168,37,0.22)' }}
            >
              Capture now
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-text3 font-medium mb-3">
              {encounters.length} contact{encounters.length !== 1 ? 's' : ''} captured
            </p>
            <div className="flex flex-col gap-3">
              {encounters.map((enc) => (
                <LeadCard key={enc.id} encounter={enc} contact={enc.contact} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
