import { Suspense } from 'react';
import {
  getCurrentRep,
  getConferences,
  getConferenceCoverage,
  getTeamFollowUps,
  getReps,
  getScoringWeights,
  getRelationshipList,
  getGapAnalysis,
  getCoverageSuggestionById,
  getCoverageSuggestions,
} from '@/lib/db/queries';
import { PlanningHub } from '@/components/planning/PlanningHub';

// Next 15+: searchParams is a Promise — must be awaited before accessing keys.
export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const suggestionId = typeof params.suggestionId === 'string' ? params.suggestionId : undefined;

  const rep = await getCurrentRep();
  if (!rep) return null;

  const [conferences, coverage, followUps, relationships, gap, reps, weights, suggestions] =
    await Promise.all([
      getConferences(),
      getConferenceCoverage(rep.teamId),
      getTeamFollowUps(rep.teamId),
      getRelationshipList(rep.teamId),
      getGapAnalysis(rep.teamId),
      getReps(rep.teamId),
      getScoringWeights(rep.teamId),
      getCoverageSuggestions(rep.teamId),
    ]);

  // Fetch the specific suggestion server-side so a hard reload of ?suggestionId= re-renders the
  // exact draft (snapshot semantics; URL is shareable). Falls back to null if id is missing/invalid.
  const activeSuggestion = suggestionId
    ? await getCoverageSuggestionById(suggestionId)
    : null;

  return (
    <Suspense>
      <PlanningHub
        conferences={conferences}
        coverage={coverage}
        followUps={followUps}
        relationships={relationships}
        gap={gap}
        reps={reps}
        weights={weights}
        repId={rep.id}
        repName={rep.name}
        suggestions={suggestions}
        activeSuggestion={activeSuggestion}
      />
    </Suspense>
  );
}
