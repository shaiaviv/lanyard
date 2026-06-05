'use server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/db/admin';
import { getCurrentRep } from '@/lib/db/queries';
import { retrieveCandidates, adjudicateMatch } from '@/lib/matching';
import { MODELS } from '@/lib/ai/models';
import type { MatchCandidate } from '@/lib/types';

export interface ResolveInput {
  encounterId: string;
  action: 'link' | 'new';
  contactId?: string; // required when action = 'link'
  // Identity to create when action = 'new'
  name?: string;
  company?: string | null;
  title?: string | null;
  email?: string | null;
}

export async function resolveEncounter(
  input: ResolveInput,
): Promise<{ success: true } | { error: string }> {
  const rep = await getCurrentRep();
  if (!rep) return { error: 'Not authenticated' };

  const admin = createAdminClient();

  // Load the encounter
  const { data: enc, error: encErr } = await admin
    .from('encounters')
    .select('*')
    .eq('id', input.encounterId)
    .eq('rep_id', rep.id)
    .single();
  if (encErr || !enc) return { error: 'Encounter not found' };

  let contactId: string = input.contactId ?? '';

  if (input.action === 'new') {
    const snap = enc.identity_snapshot as { name?: string; company?: string; title?: string; email?: string } | null;
    const { data: contact, error: cErr } = await admin
      .from('contacts')
      .insert({
        canonical_name: input.name ?? snap?.name ?? 'Unknown',
        current_company: input.company ?? snap?.company ?? null,
        current_title: input.title ?? snap?.title ?? null,
        email: input.email ?? snap?.email ?? null,
      })
      .select('id')
      .single();
    if (cErr || !contact) return { error: 'Failed to create contact' };
    contactId = contact.id as string;
  }

  const { error: updateErr } = await admin
    .from('encounters')
    .update({ contact_id: contactId, state: 'confirmed' })
    .eq('id', input.encounterId);

  if (updateErr) return { error: updateErr.message };

  revalidatePath('/reconcile');
  revalidatePath('/leads');
  if (contactId) revalidatePath(`/contact/${contactId}`);

  return { success: true };
}

export async function reanalyzeEncounter(
  encounterId: string,
): Promise<{ candidates: MatchCandidate[] } | { error: string }> {
  const rep = await getCurrentRep();
  if (!rep) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: enc } = await admin.from('encounters').select('*').eq('id', encounterId).single();
  if (!enc) return { error: 'Not found' };

  const snap = enc.identity_snapshot as {
    name?: string; company?: string; title?: string; email?: string; linkedin?: string;
  } | null;
  if (!snap?.name) return { error: 'No identity snapshot to match against' };

  try {
    const identity = {
      name: snap.name,
      company: snap.company ?? null,
      title: snap.title ?? null,
      email: snap.email ?? null,
      linkedin: snap.linkedin ?? null,
    };

    const retrieved = await retrieveCandidates(identity);
    const candidates = await adjudicateMatch(identity, enc.note as string | null, retrieved, MODELS.SONNET);

    await admin
      .from('encounters')
      .update({ match_candidates: candidates })
      .eq('id', encounterId);

    return { candidates };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Reanalysis failed' };
  }
}

export async function skipEncounter(
  encounterId: string,
): Promise<{ success: true } | { error: string }> {
  const rep = await getCurrentRep();
  if (!rep) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('encounters')
    .update({ state: 'confirmed' })
    .eq('id', encounterId)
    .eq('rep_id', rep.id);

  if (error) return { error: error.message };
  revalidatePath('/reconcile');
  revalidatePath('/leads');
  return { success: true };
}
