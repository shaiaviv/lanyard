'use server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/db/admin';
import {
  getCurrentRep, getReps, getConferences, getConferenceCoverage,
} from '@/lib/db/queries';
import { MissingServiceKeyError } from '@/lib/config/getServiceKey';
import { generateCoverageSuggestion } from '@/lib/ai/generateCoverageSuggestion';
import { buildSuggestionDraft } from '@/lib/scoring/buildSuggestionDraft';
import type { SuggestionEngineInput } from '@/lib/types';

export async function generateCoverageSuggestionAction(
  prompt: string | null,
): Promise<{ id: string; source: 'ai' | 'heuristic' } | { error: string; noKey?: boolean }> {
  const me = await getCurrentRep();
  if (!me) return { error: 'Not authenticated' };

  const today = new Date().toISOString().split('T')[0];
  const [allConfs, allCoverage, allReps] = await Promise.all([
    getConferences(),
    getConferenceCoverage(me.teamId),
    getReps(me.teamId),
  ]);

  // Upcoming + plannable conferences only (past events excluded).
  const upcomingConfs = allConfs.filter((c) => !c.endDate || c.endDate >= today);

  const committed = allCoverage
    .filter((c) => c.status === 'committed')
    .map((c) => ({ repId: c.repId, conferenceId: c.conferenceId }));

  const considering = allCoverage
    .filter((c) => c.status === 'considering')
    .map((c) => ({ repId: c.repId, conferenceId: c.conferenceId }));

  const ctx: SuggestionEngineInput = {
    conferences: upcomingConfs.map((c) => ({
      id: c.id, name: c.name, startDate: c.startDate, endDate: c.endDate,
      region: c.region, location: c.location, tier: c.tier, icpScore: c.icpScore,
      latitude: c.latitude, longitude: c.longitude,
    })),
    reps: allReps.map((r) => ({
      id: r.id, name: r.name, homeRegion: r.homeRegion, capacity: r.capacity,
    })),
    committed,
    considering,
    prompt,
  };

  let rawOutput;
  try {
    rawOutput = await generateCoverageSuggestion(ctx);
  } catch (err) {
    if (err instanceof MissingServiceKeyError) {
      return { error: 'No Anthropic API key configured. Add your key in Settings to use AI suggestions.', noKey: true };
    }
    return { error: err instanceof Error ? err.message : 'AI generation failed. Please try again.' };
  }
  const source: 'ai' | 'heuristic' = 'ai';

  const generatedAt = new Date().toISOString();
  const draft = buildSuggestionDraft(rawOutput, ctx, generatedAt, source);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('coverage_suggestions')
    .insert({
      team_id: me.teamId,
      created_by: me.id,
      prompt: prompt ?? null,
      source,
      payload: draft,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message ?? 'Failed to save suggestion' };
  }

  revalidatePath('/planning');
  return { id: data.id as string, source };
}
