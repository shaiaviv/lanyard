import { Suspense } from 'react';
import {
  getCurrentRep,
  getConferences,
  getConferenceCoverage,
  getTeamFollowUps,
  getReps,
  getScoringWeights,
} from '@/lib/db/queries';
import { PlanningHub } from '@/components/planning/PlanningHub';

export default async function PlanningPage() {
  const rep = await getCurrentRep();
  if (!rep) return null;

  const [conferences, coverage, followUps, reps, weights] = await Promise.all([
    getConferences(),
    getConferenceCoverage(rep.teamId),
    getTeamFollowUps(rep.teamId),
    getReps(rep.teamId),
    getScoringWeights(rep.teamId),
  ]);

  return (
    <Suspense>
      <PlanningHub
        conferences={conferences}
        coverage={coverage}
        followUps={followUps}
        reps={reps}
        weights={weights}
        repId={rep.id}
        repName={rep.name}
      />
    </Suspense>
  );
}
