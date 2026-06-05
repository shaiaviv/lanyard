// #3 relationship-arc briefing (Sonnet). Catch the rep up on a returning contact: who, last
// conversation, open threads, how to approach + an embedded verdict. Folds in ALL reps' encounters
// (shared team memory). The glance line (count/span) is computed deterministically elsewhere.
import 'server-only';
import { generateText, Output } from 'ai';
import { anthropicModel, MODELS } from '@/lib/ai/models';
import { briefingSchema, type BriefingOutput } from '@/lib/ai/schemas';
import type { Encounter } from '@/lib/types';

const SYSTEM = `You brief a salesperson, in the moment, on a contact they've met before — so they
can pick the conversation back up fast. Be concrete and specific to the history.

The embedded verdict classifies the relationship by PROGRESSION TOWARD COMMITMENT, not raw warmth
("measure movement, not mood"): a contact who is perpetually warm but never advances (no next step,
no deepening specifics) is a TIRE-KICKER, not warming.
- warming: rising engagement + concrete progression (asked pricing, brought a colleague, specifics)
- nurturing: genuine but steady/early
- tirekicker: many meetings over time, warm-but-flat, never a next step
- cooling: engagement declining
- tooearly: only 1-2 touches — not enough to judge (don't apply harsh labels early)`;

export async function summarizeArc(
  contact: { canonicalName: string; currentCompany: string | null },
  encounters: Encounter[],
): Promise<BriefingOutput> {
  const model = await anthropicModel(MODELS.SONNET);
  const history = encounters
    .map(
      (e) =>
        `- ${e.occurredAt} (rep ${e.provenance?.repId ?? '?'}): temp=${e.temperature ?? '?'}, ` +
        `topics=[${e.topics.join(', ')}], note="${e.note ?? ''}"`,
    )
    .join('\n');

  const { output } = await generateText({
    model,
    system: SYSTEM,
    prompt: `Contact: ${contact.canonicalName} (${contact.currentCompany ?? 'unknown company'}).\n` +
      `Encounters (chronological, across the whole team):\n${history}`,
    output: Output.object({ schema: briefingSchema }),
  });
  return output;
}
