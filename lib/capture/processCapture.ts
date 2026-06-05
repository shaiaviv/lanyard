// The async capture pipeline (plans/tech/1-field.md §1, stages parse→enrich→match).
// Runs server-side; idempotent; the rep never waits on it (offline queue drains into here).
// Returns a reviewable draft — the COMMIT (writing the encounter row) is a separate step.
import 'server-only';
import { parseCapture } from '@/lib/ai/parseCapture';
import { retrieveCandidates, adjudicateMatch, resolveMatch } from '@/lib/matching';
import { getServiceKey } from '@/lib/config/getServiceKey';
import { getEnrichmentProvider } from '@/lib/enrichment';
import type { IdentitySnapshot, MatchCandidate, PersonCandidate, CaptureDraft } from '@/lib/types';

export type { CaptureDraft };

/**
 * Stages 5-7 of the pipeline: parse(+fit) → enrich (LinkedIn) → match.
 * Transcription now happens in the browser via Web Speech API; this receives plain text.
 * Each stage degrades gracefully (parse-fail → manual; enrich-empty → manual).
 */
export async function processCapture(input: {
  text: string;
  firsthand?: boolean;
}): Promise<CaptureDraft> {
  const transcript = input.text;
  const parsed = await parseCapture(transcript);

  const identity: IdentitySnapshot = {
    name: parsed.name ?? '',
    company: parsed.company,
    title: parsed.title,
    email: parsed.email,
    linkedin: null,
  };

  // Enrichment (LinkedIn verify candidates) — behind the interface; mock when no key (never blocks).
  const enrichKey = await getServiceKey('enrichment');
  const enrichmentConfigured = !!enrichKey;
  const linkedinCandidates = parsed.name && enrichmentConfigured
    ? await getEnrichmentProvider(enrichKey).searchPerson({
        name: parsed.name,
        company: parsed.company ?? undefined,
      })
    : [];

  // Matching: retrieve shortlist → adjudicate (Haiku on the floor). Zero candidates ⇒ skip LLM.
  const candidates = await retrieveCandidates(identity);
  const matchCandidates = await adjudicateMatch(identity, parsed.note, candidates);
  const { resolution, best } = resolveMatch(matchCandidates, { firsthand: input.firsthand ?? true });

  return {
    transcript,
    parsed,
    identity,
    matchCandidates,
    resolution,
    bestMatchId: best?.contactId ?? null,
    linkedinCandidates,
    enrichmentConfigured,
  };
}
