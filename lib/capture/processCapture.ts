// The async capture pipeline orchestration (plans/tech/1-field.md §1, stages STT→draft).
// Runs server-side; idempotent; the rep never waits on it (offline queue drains into here).
// Returns a reviewable draft — the COMMIT (writing the encounter row) is a separate step.
import 'server-only';
import { transcribeAudio } from '@/lib/ai/transcribe';
import { parseCapture } from '@/lib/ai/parseCapture';
import { retrieveCandidates, adjudicateMatch, resolveMatch, type MatchResolution } from '@/lib/matching';
import { getServiceKey } from '@/lib/config/getServiceKey';
import { getEnrichmentProvider } from '@/lib/enrichment';
import type { ParseCaptureOutput } from '@/lib/ai/schemas';
import type { IdentitySnapshot, MatchCandidate, PersonCandidate } from '@/lib/types';

export interface CaptureDraft {
  transcript: string;
  parsed: ParseCaptureOutput;
  identity: IdentitySnapshot;
  matchCandidates: MatchCandidate[];
  resolution: MatchResolution;
  bestMatchId: string | null;
  linkedinCandidates: PersonCandidate[]; // for the F2 LinkedIn-verify step (empty ⇒ manual)
}

/**
 * Stages 4-7 of the pipeline: transcribe → parse(+fit) → enrich (LinkedIn) → match.
 * Stages are independent; each degrades gracefully (parse-fail → manual; enrich-empty → manual).
 */
export async function processCapture(input: {
  audio: Uint8Array;
  firsthand?: boolean; // is the current rep the one who'd have the prior encounter?
}): Promise<CaptureDraft> {
  const transcript = await transcribeAudio(input.audio);
  const parsed = await parseCapture(transcript);

  const identity: IdentitySnapshot = {
    name: parsed.name ?? '',
    company: parsed.company,
    title: parsed.title,
    email: parsed.email,
    linkedin: null, // set once the rep confirms a LinkedIn candidate in review
  };

  // Enrichment (LinkedIn verify candidates) — behind the interface; mock when no key (never blocks).
  const enrichKey = await getServiceKey('enrichment');
  const linkedinCandidates = parsed.name
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
  };
}
