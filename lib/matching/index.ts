// Cross-conference matching engine (foundation §7). Shared: Field calls it live (Haiku),
// Reconcile re-runs it richer (Sonnet). retrieval (cheap, deterministic) → LLM adjudication.
import 'server-only';
import { generateText, Output } from 'ai';
import { createAdminClient } from '@/lib/db/admin';
import { anthropicModel, MODELS } from '@/lib/ai/models';
import { matchSchema } from '@/lib/ai/schemas';
import type { IdentitySnapshot, MatchCandidate, MatchResolution } from '@/lib/types';

interface CandidateContact {
  id: string;
  canonical_name: string;
  current_company: string | null;
  current_title: string | null;
  linkedin_url: string | null;
  email: string | null;
}

/** Step 1 — narrow the full contact set to a small shortlist. Zero candidates ⇒ caller skips the LLM. */
export async function retrieveCandidates(identity: IdentitySnapshot): Promise<CandidateContact[]> {
  const supa = createAdminClient();
  const filters: string[] = [];
  // strong keys first
  if (identity.linkedin) filters.push(`linkedin_url.eq.${identity.linkedin}`);
  if (identity.email) filters.push(`email.eq.${identity.email}`);
  // fuzzy keys (pg_trgm GIN supports ilike)
  if (identity.name?.trim()) filters.push(`canonical_name.ilike.%${identity.name.trim()}%`);
  if (identity.company?.trim()) filters.push(`current_company.ilike.%${identity.company.trim()}%`);
  if (filters.length === 0) return [];

  const { data } = await supa
    .from('contacts')
    .select('id, canonical_name, current_company, current_title, linkedin_url, email')
    .or(filters.join(','))
    .limit(10);
  return (data as CandidateContact[]) ?? [];
}

const SYSTEM = `Decide, for each candidate, whether they are the SAME person as the newly captured
contact. Handle name variations (typos, ASR errors, nicknames, maiden/married) and JOB CHANGES
(same person, different company/title) — a confirmed LinkedIn/email match is near-certain. Lean
toward catching real repeats, but be honest: use "unsure" when you can't tell, and set a calibrated
confidence (0..1). Explain briefly. Set jobChange=true when it's the same person who moved roles.`;

/** Step 2 — LLM adjudicates the shortlist. model: Haiku (field) or Sonnet (reconcile, richer). */
export async function adjudicateMatch(
  identity: IdentitySnapshot,
  note: string | null,
  candidates: CandidateContact[],
  modelId: string = MODELS.HAIKU,
): Promise<MatchCandidate[]> {
  if (candidates.length === 0) return [];
  const model = await anthropicModel(modelId);
  const list = candidates
    .map(
      (c) =>
        `id=${c.id}: ${c.canonical_name}, ${c.current_title ?? '?'} @ ${c.current_company ?? '?'}` +
        `${c.linkedin_url ? `, linkedin=${c.linkedin_url}` : ''}`,
    )
    .join('\n');

  const { output } = await generateText({
    model,
    system: SYSTEM,
    prompt:
      `Newly captured: ${identity.name ?? '?'}, ${identity.title ?? '?'} @ ${identity.company ?? '?'}` +
      `${identity.linkedin ? `, linkedin=${identity.linkedin}` : ''}\nNote: "${note ?? ''}"\n\n` +
      `Candidates:\n${list}`,
    output: Output.object({ schema: matchSchema }),
  });

  // crossRep is resolved by the caller (it knows each candidate's encounter reps vs the current rep).
  return output.results.map((r) => ({ ...r, crossRep: false }));
}

/** Step 3 — map the best candidate's confidence to the three-way field resolution (foundation §7). */
export function resolveMatch(
  candidates: MatchCandidate[],
  opts: { firsthand: boolean; highThreshold?: number; lowThreshold?: number } = { firsthand: true },
): { resolution: MatchResolution; best: MatchCandidate | null } {
  const high = opts.highThreshold ?? 0.85;
  const low = opts.lowThreshold ?? 0.5;
  const best = candidates
    .filter((c) => c.decision === 'same')
    .sort((a, b) => b.confidence - a.confidence)[0] ?? null;

  if (!best) return { resolution: 'new', best: null };
  if (best.crossRep) return { resolution: 'pending', best }; // never auto-merge cross-rep (P1)
  if (best.confidence >= high && opts.firsthand) return { resolution: 'auto-match', best };
  if (best.confidence >= low) return { resolution: 'prompt', best };
  return { resolution: 'new', best };
}
