'use server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/db/admin';
import { getCurrentRep, getScoringWeights } from '@/lib/db/queries';
import { getServiceKey, MissingServiceKeyError } from '@/lib/config/getServiceKey';
import { scoreConference } from '@/lib/ai/scoreConference';
import { computeIcpScore, type ScoringWeights } from '@/lib/scoring/computeIcpScore';

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

export interface HubSpotPushInput {
  encounterId: string;
  name: string;
  company: string | null;
  email: string | null;
  linkedinUrl: string | null;
  note: string | null;
}

export async function pushToHubSpot(
  input: HubSpotPushInput,
): Promise<{ success: true; contactUrl: string } | { error: string }> {
  const apiKey = await getServiceKey('hubspot');
  if (!apiKey) {
    return { error: 'HubSpot API key not configured. Add it in Settings.' };
  }

  const [first, ...rest] = (input.name ?? 'Unknown').split(' ');
  const last = rest.join(' ');

  const properties: Record<string, string> = {
    firstname: first,
    lastname: last,
  };
  if (input.email) properties.email = input.email;
  if (input.company) properties.company = input.company;
  if (input.note) properties.hs_note_body = input.note.slice(0, 65_535);

  try {
    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string };
      return { error: body.message ?? `HubSpot error ${res.status}` };
    }

    const data = await res.json() as { id?: string };
    const contactUrl = `https://app.hubspot.com/contacts/${data.id ?? ''}`;

    // Mark encounter as pushed
    const admin = createAdminClient();
    await admin
      .from('encounters')
      .update({ provenance: { hubspot_id: data.id, pushed_at: new Date().toISOString() } })
      .eq('id', input.encounterId);

    revalidatePath('/planning');
    return { success: true, contactUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}
