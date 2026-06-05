// EXEMPLAR AI module — the pattern every other lib/ai/* module copies.
// Voice transcript → structured draft Encounter fields + folded lead-fit (#4), one Haiku call.
// AI SDK v6: generateText + Output.object (generateObject is deprecated in v6).
import 'server-only';
import { generateText, Output } from 'ai';
import { anthropicModel, MODELS } from '@/lib/ai/models';
import { parseCaptureSchema, type ParseCaptureOutput } from '@/lib/ai/schemas';
import { GRAIN_ICP } from '@/lib/ai/icp';

const SYSTEM = `You parse a salesperson's spoken note (captured right after meeting someone at a
conference) into structured fields. Be faithful to what was said; do NOT invent details.

For each field, also return a confidence 0..1 in confidencePerField (low for anything you guessed
or couldn't hear clearly — especially proper nouns like names/companies). Set fields you didn't
hear to null.

suggestedTemperature = their interest level you infer from tone/words (hot|warm|lukewarm|cool|cold).
topics = the substantive themes discussed (e.g. "FX hedging", "travel merchants").
note = a clean one-paragraph summary of what was discussed.

Also score lead FIT (our ICP fit — DISTINCT from their interest/temperature) using this definition:
${GRAIN_ICP}
Return companyFit + personFit + a combined tier + a 0..100 score + a one-line rationale. Use
"unclear" (not a guess) when the note is too sparse to judge.`;

export async function parseCapture(transcript: string): Promise<ParseCaptureOutput> {
  const model = await anthropicModel(MODELS.SONNET);
  const { output } = await generateText({
    model,
    system: SYSTEM,
    prompt: `Spoken note:\n"""${transcript}"""`,
    output: Output.object({ schema: parseCaptureSchema }),
  });
  return output;
}
