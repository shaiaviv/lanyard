import { notFound } from 'next/navigation';
import { getCurrentRep, getEncounterById, getContactWithEncounters } from '@/lib/db/queries';
import { ReconcileCard } from '@/components/reconcile/ReconcileCard';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReconcileDetailPage({ params }: Props) {
  const { id } = await params;
  const [rep, encounter] = await Promise.all([getCurrentRep(), getEncounterById(id)]);

  if (!rep || !encounter || encounter.repId !== rep.id) notFound();

  // Load existing contact if already linked
  const existingContact = encounter.contactId
    ? await getContactWithEncounters(encounter.contactId)
    : null;

  // Resolve candidate details from stored match_candidates
  const candidates = encounter.matchCandidates ?? [];
  const bestCandidateId = candidates.find((c) => c.decision === 'same')?.contactId ?? null;

  // Fetch the best candidate's contact data so the rep can compare
  const bestContact = bestCandidateId
    ? await getContactWithEncounters(bestCandidateId)
    : null;

  return (
    <ReconcileCard
      encounter={encounter}
      candidates={candidates}
      bestContact={bestContact}
      existingContact={existingContact}
    />
  );
}
