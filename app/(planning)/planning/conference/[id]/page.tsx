import { notFound } from 'next/navigation';
import {
  getCurrentRep,
  getConferenceById,
  getConferences,
  getConferenceCoverage,
  getConferenceLeads,
  getReps,
  getScoringWeights,
} from '@/lib/db/queries';
import { ConferenceDetail } from '@/components/planning/ConferenceDetail';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConferenceDetailPage({ params }: Props) {
  const { id } = await params;
  const rep = await getCurrentRep();
  if (!rep) return null;

  const conference = await getConferenceById(id);
  if (!conference) notFound();

  const [allConfs, coverage, leads, reps, weights] = await Promise.all([
    getConferences(),
    getConferenceCoverage(rep.teamId),
    getConferenceLeads(id),
    getReps(rep.teamId),
    getScoringWeights(rep.teamId),
  ]);

  // Prior/other editions = same base name (year stripped), excluding this one.
  const base = conference.name.replace(/\s*\d{4}\s*$/, '').trim().toLowerCase();
  const otherEditions = allConfs
    .filter((c) => c.id !== id && c.name.replace(/\s*\d{4}\s*$/, '').trim().toLowerCase() === base)
    .map((c) => ({ id: c.id, name: c.name, startDate: c.startDate, icpScore: c.icpScore, tier: c.tier }));

  return (
    <ConferenceDetail
      conference={conference}
      coverage={coverage.filter((c) => c.conferenceId === id)}
      reps={reps}
      leads={leads}
      otherEditions={otherEditions}
      weights={weights}
      currentRepId={rep.id}
    />
  );
}
