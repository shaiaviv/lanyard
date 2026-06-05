import { Suspense } from 'react';
import { getCurrentRep, getConferences, getConferenceCoverage, getFollowUps } from '@/lib/db/queries';
import { PlanningHub } from '@/components/planning/PlanningHub';

export default async function PlanningPage() {
  const rep = await getCurrentRep();
  if (!rep) return null;

  const [conferences, coverage, followUps] = await Promise.all([
    getConferences(),
    getConferenceCoverage(rep.teamId),
    getFollowUps(rep.id),
  ]);

  return (
    <Suspense>
      <PlanningHub
        conferences={conferences}
        coverage={coverage}
        followUps={followUps}
        repId={rep.id}
        repName={rep.name}
      />
    </Suspense>
  );
}
