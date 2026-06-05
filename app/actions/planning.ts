'use server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/db/admin';
import { getCurrentRep, getScoringWeights } from '@/lib/db/queries';
import { MissingServiceKeyError } from '@/lib/config/getServiceKey';
import { scoreConference } from '@/lib/ai/scoreConference';
import { computeIcpScore, type ScoringWeights } from '@/lib/scoring/computeIcpScore';
import { pushContact } from '@/lib/hubspot';

export type CoverageStatus = 'considering' | 'committed' | 'attended' | 'declined';

// Assign ANY teammate to a conference — the core company-wide planning action ("who covers what").
// Guarded so a rep can only assign within their own team.
export async function assignCoverage(
  repId: string,
  conferenceId: string,
  status: CoverageStatus,
): Promise<{ success: true } | { error: string }> {
  const me = await getCurrentRep();
  if (!me) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from('reps')
    .select('team_id')
    .eq('id', repId)
    .maybeSingle();
  if (!target || target.team_id !== me.teamId) {
    return { error: 'That rep is not on your team' };
  }

  const { error } = await admin
    .from('coverage')
    .upsert({ rep_id: repId, conference_id: conferenceId, status }, { onConflict: 'rep_id,conference_id' });

  if (error) return { error: error.message };
  revalidatePath('/planning');
  return { success: true };
}

// Convenience wrapper: assign the signed-in rep to a conference.
export async function upsertCoverage(
  conferenceId: string,
  status: CoverageStatus,
): Promise<{ success: true } | { error: string }> {
  const me = await getCurrentRep();
  if (!me) return { error: 'Not authenticated' };
  return assignCoverage(me.id, conferenceId, status);
}

// Persist the team's scoring weights (non-secret config → plaintext JSON in app_settings).
export async function saveScoringWeights(
  weights: ScoringWeights,
): Promise<{ success: true } | { error: string }> {
  const me = await getCurrentRep();
  if (!me) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { error } = await admin.from('app_settings').upsert(
    {
      team_id: me.teamId,
      key_name: 'scoring_weights',
      key_ciphertext: JSON.stringify(weights),
      updated_by: me.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'team_id,key_name' },
  );
  if (error) return { error: error.message };
  revalidatePath('/planning');
  return { success: true };
}

// Re-run the AI factor estimation for one conference, then persist factors + the score/tier the
// current weights produce. The expensive AI half; the formula half runs live client-side.
export async function rescoreConference(
  conferenceId: string,
): Promise<{ success: true; score: number; tier: string } | { error: string }> {
  const me = await getCurrentRep();
  if (!me) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: conf } = await admin
    .from('conferences')
    .select('*')
    .eq('id', conferenceId)
    .maybeSingle();
  if (!conf) return { error: 'Conference not found' };

  let factors;
  try {
    factors = await scoreConference({
      name: conf.name,
      location: conf.location,
      country: conf.country,
      region: conf.region,
      verticals: conf.verticals ?? [],
      estAudience: conf.est_audience,
      startDate: conf.start_date,
    });
  } catch (err) {
    if (err instanceof MissingServiceKeyError) {
      return { error: 'Add an Anthropic API key in Settings to score conferences.' };
    }
    return { error: err instanceof Error ? err.message : 'Scoring failed' };
  }

  const weights = await getScoringWeights(me.teamId);
  const { score, tier } = computeIcpScore(factors, weights);

  const { error } = await admin
    .from('conferences')
    .update({ score_breakdown: factors, icp_score: score, tier })
    .eq('id', conferenceId);
  if (error) return { error: error.message };

  revalidatePath('/planning');
  return { success: true, score, tier };
}

// Build the curated note pushed to HubSpot: the relationship ARC + qualification context.
// This is what makes the push a curated handoff, not a dumb export (foundation §4b).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildArcNote(enc: any): { name: string; email: string | null; company: string | null; title: string | null; linkedinUrl: string | null; noteBody: string } {
  const c = enc.contacts;
  const snap = (enc.identity_snapshot ?? {}) as { name?: string; company?: string; title?: string };
  const arc = c?.arc_cache as { glance?: { verdict?: string; meetings?: number }; lastTime?: string; openThreads?: string[]; suggestedMove?: string } | null;
  const fit = enc.fit as { tier?: string } | null;
  const confName = enc.conferences?.name as string | undefined;

  const lines: string[] = ['— Pushed from Lanyard (conference intelligence) —'];
  if (arc?.glance?.verdict) lines.push(`Relationship: ${arc.glance.verdict}${arc.glance.meetings ? ` (${arc.glance.meetings} meetings)` : ''}`);
  if (confName) lines.push(`Met at: ${confName}`);
  if (fit?.tier) lines.push(`ICP fit: ${fit.tier}`);
  if (enc.temperature) lines.push(`Temperature: ${enc.temperature}`);
  if (arc?.lastTime) lines.push(`Last touch: ${arc.lastTime}`);
  if (arc?.openThreads?.length) lines.push(`Open threads: ${arc.openThreads.join('; ')}`);
  if (arc?.suggestedMove) lines.push(`Suggested next move: ${arc.suggestedMove}`);
  if (!arc && enc.note) lines.push(`Notes: ${enc.note}`);

  return {
    name: (c?.canonical_name ?? snap.name ?? 'Unknown') as string,
    email: (c?.email ?? null) as string | null,
    company: (c?.current_company ?? snap.company ?? null) as string | null,
    title: (c?.current_title ?? snap.title ?? null) as string | null,
    linkedinUrl: (c?.linkedin_url ?? null) as string | null,
    noteBody: lines.join('\n'),
  };
}

const PUSH_SELECT =
  'id, temperature, note, fit, identity_snapshot, contact_id, provenance, ' +
  'contacts(canonical_name, current_company, current_title, email, linkedin_url, arc_cache), conferences(name)';

export type PushOutcome = { success: true; contactUrl: string; action: 'created' | 'updated' | 'mock'; mock: boolean } | { error: string };

// Push ONE encounter's contact to HubSpot: dedupe by email, arc summary as a note, qualification
// context. Enriches server-side from the encounter + contact + conference.
export async function pushToHubSpot(encounterId: string): Promise<PushOutcome> {
  const me = await getCurrentRep();
  if (!me) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: enc } = await admin.from('encounters').select(PUSH_SELECT).eq('id', encounterId).maybeSingle();
  if (!enc) return { error: 'Encounter not found' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const encAny = enc as any;
  const input = buildArcNote(encAny);
  const res = await pushContact(input);
  if (!res.ok) return { error: res.error };

  await admin
    .from('encounters')
    .update({ provenance: { ...(encAny.provenance ?? {}), hubspot: { action: res.result.action, pushed_at: new Date().toISOString() } } })
    .eq('id', encounterId);

  revalidatePath('/planning');
  return { success: true, contactUrl: res.result.contactUrl, action: res.result.action, mock: res.result.mock };
}

// Bulk: push several flagged contacts at once (the curated team handoff).
export async function bulkPushToHubSpot(
  encounterIds: string[],
): Promise<{ pushed: number; failed: number; mock: boolean }> {
  let pushed = 0;
  let failed = 0;
  let mock = false;
  for (const id of encounterIds) {
    const r = await pushToHubSpot(id);
    if ('error' in r) failed += 1;
    else {
      pushed += 1;
      mock = mock || r.mock;
    }
  }
  return { pushed, failed, mock };
}
