'use server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/db/admin';
import { getCurrentRep } from '@/lib/db/queries';
import { getServiceKey } from '@/lib/config/getServiceKey';

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
