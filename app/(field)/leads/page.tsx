import Link from 'next/link';
import { ChevronRight, Inbox } from 'lucide-react';
import { LeadCard } from '@/components/field/LeadCard';
import { getCurrentRep, getActiveConference, getConferences, getEncountersForConference, getPendingCount } from '@/lib/db/queries';

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

  const selectedId = params.conf ?? activeConference?.id ?? null;
  const selectedConference = conferences.find((c) => c.id === selectedId) ?? activeConference;

  const [encounters, pendingCount] = await Promise.all([
    selectedId ? getEncountersForConference(selectedId, rep.id) : Promise.resolve([]),
    getPendingCount(rep.id),
  ]);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="px-4 pt-12 pb-4 border-b border-zinc-100">
        <h1 className="text-xl font-bold text-zinc-900">My Leads</h1>
        {selectedConference ? (
          <p className="text-sm text-zinc-500 mt-0.5">{selectedConference.name}</p>
        ) : (
          <p className="text-sm text-zinc-400 mt-0.5">No conference selected</p>
        )}
      </header>

      {/* Pending review banner */}
      {pendingCount > 0 && (
        <Link
          href="/reconcile"
          className="mx-4 mt-4 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
        >
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {pendingCount} contact{pendingCount !== 1 ? 's' : ''} need review
            </p>
            <p className="text-xs text-amber-700">Confirm or discard before data gets stale</p>
          </div>
          <ChevronRight size={16} className="text-amber-500 flex-shrink-0" />
        </Link>
      )}

      {/* Leads list */}
      <div className="px-4 py-4 space-y-3">
        {encounters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox size={36} className="text-zinc-300 mb-3" />
            <p className="font-medium text-zinc-500">No leads yet</p>
            <p className="text-sm text-zinc-400 mt-1">
              {selectedConference
                ? 'Tap Capture to log your first contact'
                : 'Select a conference above to see its leads'}
            </p>
            <Link
              href="/capture"
              className="mt-4 px-5 py-2.5 rounded-full bg-orange-500 text-white text-sm font-semibold"
            >
              Capture now
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-zinc-400 font-medium">
              {encounters.length} contact{encounters.length !== 1 ? 's' : ''} captured
            </p>
            {encounters.map((enc) => (
              <LeadCard key={enc.id} encounter={enc} contact={enc.contact} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
