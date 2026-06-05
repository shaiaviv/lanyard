// C5 AI conference discovery — surfaces real fintech/payments/treasury/travel events that aren't
// already in the DB, with a relevance rationale. AI is the right tool: open-ended recall + judgment
// over the space of industry events. Copies the parseCapture exemplar (generateText + Output.object).
// "Web search behind an interface" (foundation §11/T1): today it uses the model's own event
// knowledge; a live web-search tool can slot in here later. Mock fallback lives in the action.
import 'server-only';
import { generateText, Output } from 'ai';
import { anthropicModel, MODELS } from '@/lib/ai/models';
import { discoverConferencesSchema, type DiscoverConferencesOutput } from '@/lib/ai/schemas';
import { GRAIN_ICP } from '@/lib/ai/icp';

const SYSTEM = `You help a fintech sales team discover industry CONFERENCES worth attending that they
don't already track. Propose REAL, well-known events (do not invent fictional ones). For each, give
your best estimate of dates, city, country, region (Europe | Americas | APAC | MEA), verticals, and
approximate audience size, plus a one-line reason it fits Grain's ICP.

${GRAIN_ICP}

Favor events with high ICP density (payments, treasury, FX, cross-border, fintech, travel) over
giant generic tech expos. Return 4-6 candidates. Exclude any event already in the user's database
(they will be listed). If you are unsure of exact dates, give your best estimate for the next
occurrence.`;

export async function discoverConferences(
  query: string,
  existingNames: string[],
): Promise<DiscoverConferencesOutput> {
  const model = await anthropicModel(MODELS.SONNET);
  const { output } = await generateText({
    model,
    system: SYSTEM,
    prompt:
      `Find conferences matching: "${query}"\n\n` +
      `Already in the database (exclude these):\n${existingNames.map((n) => `- ${n}`).join('\n')}`,
    output: Output.object({ schema: discoverConferencesSchema }),
  });
  return output;
}
