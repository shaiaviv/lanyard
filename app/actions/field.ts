'use server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/db/admin';
import {
  getCurrentRep,
  searchContacts,
  getContactWithEncounters,
} from '@/lib/db/queries';
import { summarizeArc } from '@/lib/ai/summarizeArc';
import { getEnrichmentProvider } from '@/lib/enrichment';
import { getServiceKey } from '@/lib/config/getServiceKey';
import { retrieveCandidates, adjudicateMatch, resolveMatch } from '@/lib/matching';
import type {
  Temperature,
  LinkState,
  LeadFit,
  MatchCandidate,
  IdentitySnapshot,
  ArcSummary,
  Contact,
  PersonCandidate,
} from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CommitEncounterInput {
  conferenceId: string | null;
  // Identity (manually entered or AI-parsed)
  name: string;
  company: string | null;
  title: string | null;
  email: string | null;
  linkedin: string | null;
  // Encounter content
  note: string | null;
  temperature: Temperature;
  topics: string[];
  followUp: boolean;
  reminder: string | null;
  // Optional AI outputs (set after pipeline runs)
  fit?: LeadFit;
  transcript?: string;
  audioPath?: string;
  // Match resolution from F3
  resolvedContactId?: string | null;  // null = create new; string = link existing
  matchCandidates?: MatchCandidate[];
  state?: LinkState;                   // defaults to 'confirmed'
}

export type CommitResult = { encounterId: string } | { error: string };

// ── commitEncounter ───────────────────────────────────────────────────────────

export async function commitEncounter(input: CommitEncounterInput): Promise<CommitResult> {
  const rep = await getCurrentRep();
  if (!rep) return { error: 'Not authenticated — please sign in.' };

  const admin = createAdminClient();
  const state = input.state ?? 'confirmed';
  let contactId: string | null = input.resolvedContactId ?? null;

  // Create a new contact when no existing contact is being linked
  if (!contactId && state !== 'pending') {
    const { data: contact, error: contactErr } = await admin
      .from('contacts')
      .insert({
        canonical_name: input.name,
        current_company: input.company ?? null,
        current_title: input.title ?? null,
        email: input.email ?? null,
        linkedin_url: input.linkedin ?? null,
      })
      .select('id')
      .single();

    if (contactErr) return { error: contactErr.message };
    contactId = contact.id as string;
  }

  const identitySnapshot: IdentitySnapshot = {
    name: input.name,
    company: input.company,
    title: input.title,
    email: input.email,
    linkedin: input.linkedin,
  };

  const { data: encounter, error: encErr } = await admin
    .from('encounters')
    .insert({
      contact_id: contactId,
      conference_id: input.conferenceId ?? null,
      rep_id: rep.id,
      occurred_at: new Date().toISOString(),
      note: input.note ?? null,
      temperature: input.temperature,
      topics: input.topics,
      fit: input.fit ?? null,
      follow_up: input.followUp,
      reminder: input.reminder ?? null,
      transcript: input.transcript ?? null,
      audio_path: input.audioPath ?? null,
      state,
      match_candidates: input.matchCandidates ?? null,
      identity_snapshot: identitySnapshot,
      provenance: { repId: rep.id, confidence: 1, source: 'manual' },
    })
    .select('id')
    .single();

  if (encErr) return { error: encErr.message };

  revalidatePath('/leads');
  revalidatePath('/capture');
  if (contactId) revalidatePath(`/contact/${contactId}`);

  return { encounterId: encounter.id as string };
}

// ── searchPeople ──────────────────────────────────────────────────────────────

export async function searchPeople(q: string): Promise<{
  contacts: Contact[];
  enrichment: PersonCandidate[];
}> {
  if (!q.trim()) return { contacts: [], enrichment: [] };

  const [contacts, enrichKey] = await Promise.all([
    searchContacts(q),
    getServiceKey('enrichment').catch(() => null),
  ]);

  const provider = getEnrichmentProvider(enrichKey);
  const enrichment = await provider.searchPerson({ name: q }).catch(() => []);

  return { contacts, enrichment };
}

// ── getBriefing ───────────────────────────────────────────────────────────────

export async function getBriefing(contactId: string): Promise<ArcSummary | null> {
  const data = await getContactWithEncounters(contactId);
  if (!data || data.encounters.length === 0) return null;

  if (data.contact.arcCache) return data.contact.arcCache;

  try {
    // AI provides the qualitative block; glance is computed deterministically (plan §4)
    const aiOutput = await summarizeArc(data.contact, data.encounters);

    const meetings = data.encounters.length;
    const dates = data.encounters.map((e) => new Date(e.occurredAt).getTime());
    const spanMs = Math.max(...dates) - Math.min(...dates);
    const spanMonths = Math.round(spanMs / (1000 * 60 * 60 * 24 * 30));

    const arc: ArcSummary = {
      glance: { meetings, spanMonths, verdict: aiOutput.verdict },
      lastTime: aiOutput.lastTime,
      openThreads: aiOutput.openThreads,
      howToApproach: aiOutput.howToApproach,
      suggestedMove: aiOutput.suggestedMove,
    };

    const admin = createAdminClient();
    await admin.from('contacts').update({ arc_cache: arc }).eq('id', contactId);
    return arc;
  } catch {
    return null;
  }
}

// ── runMatch ──────────────────────────────────────────────────────────────────

export async function runMatch(snapshot: IdentitySnapshot): Promise<{
  candidates: MatchCandidate[];
  resolution: 'auto-match' | 'prompt' | 'new' | 'pending';
}> {
  const retrieved = await retrieveCandidates(snapshot);
  if (retrieved.length === 0) return { candidates: [], resolution: 'new' };

  const candidates = await adjudicateMatch(snapshot, null, retrieved);
  const { resolution } = resolveMatch(candidates, { firsthand: true });

  return { candidates, resolution };
}
