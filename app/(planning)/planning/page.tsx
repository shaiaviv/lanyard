import { Suspense } from 'react';
import {
  getCurrentRep,
  getConferences,
  getConferenceCoverage,
  getTeamFollowUps,
  getReps,
} from '@/lib/db/queries';
import { PlanningHub } from '@/components/planning/PlanningHub';

export default async function PlanningPage() {
  const rep = await getCurrentRep();
  if (!rep) return null;

  const [conferences, coverage, followUps, reps] = await Promise.all([
    getConferences(),
    getConferenceCoverage(rep.teamId),
    getTeamFollowUps(rep.teamId),
    getReps(rep.teamId),
  ]);

  return (
    <Suspense>
      <PlanningHub
        conferences={conferences}
        coverage={coverage}
        followUps={followUps}
        reps={reps}
        repId={rep.id}
        repName={rep.name}
      />
    </Suspense>
  );
}
