// C4 conference ICP scoring — the AI half of the engine (the "marquee" feature).
// Estimates the fuzzy factor inputs (ICP density, topic fit, etc.) from public knowledge of the
// event, each with a rationale. Runs RARELY (once per conference, on add / on demand) — the cheap
// deterministic formula (lib/scoring/computeIcpScore) combines these live on every slider drag.
// Copies the parseCapture exemplar (AI SDK v6: generateText + Output.object). Sonnet for judgment.
import 'server-only';
import { generateText, Output } from 'ai';
import { anthropicModel, MODELS } from '@/lib/ai/models';
import { conferenceFactorsSchema, type ConferenceFactorsOutput } from '@/lib/ai/schemas';
import { GRAIN_ICP } from '@/lib/ai/icp';

const SYSTEM = `You assess how well a CONFERENCE fits Grain's ICP, so a sales team can prioritize
which events to attend. Score five factors 0..100, each with a specific one-line rationale grounded
in what you actually know about the event. Quality over headcount — a focused 600-person treasury
summit can beat a 40,000-person generic expo.

${GRAIN_ICP}

Factors:
- icpDensity (HIGHEST leverage): share of attendees who are the right COMPANIES and right ROLES
  (treasury / payments / FX / cross-border decision-makers), not warm bodies.
- topicFit: does the agenda/theme attract our ICP (payments, fintech, treasury, FX, cross-border,
  travel)? The gateway factor.
- scale: genuine reach — number of RELEVANT attendees. A huge expo with few ICP attendees must NOT
  score high here just for raw size.
- geoRelevance: is it in or near Grain's target markets (EU is the current GTM core; major global
  hubs count)?
- historicalPerf: ONLY for events with a known Grain attendance track record — otherwise null
  (do NOT invent a track record).

Be honest and specific. If the event is obscure or you're unsure, lower the scores and say so in the
rationale rather than guessing high.`;

export interface ScoreConferenceInput {
  name: string;
  location: string | null;
  country: string | null;
  region: string | null;
  verticals: string[];
  estAudience: number | null;
  startDate: string | null;
}

export async function scoreConference(
  input: ScoreConferenceInput,
): Promise<ConferenceFactorsOutput> {
  const model = await anthropicModel(MODELS.SONNET);
  const { output } = await generateText({
    model,
    system: SYSTEM,
    prompt:
      `Conference: ${input.name}\n` +
      `Location: ${[input.location, input.country, input.region].filter(Boolean).join(', ') || 'unknown'}\n` +
      `Verticals: ${input.verticals.join(', ') || 'unknown'}\n` +
      `Estimated audience: ${input.estAudience?.toLocaleString() ?? 'unknown'}\n` +
      `Date: ${input.startDate ?? 'unknown'}`,
    output: Output.object({ schema: conferenceFactorsSchema }),
  });
  return output;
}
