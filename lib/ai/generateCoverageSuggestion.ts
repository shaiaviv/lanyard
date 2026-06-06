// AI Coverage Suggestions — the AI half of the engine. Copies the scoreConference exemplar.
// Sonnet (reasoning-heavy, runs on demand). Returns ONLY assignments + reasoning; all computed
// values (order, clusters, stats) are derived by buildSuggestionDraft — never trusted to the AI.
// Plans/tech/3b-coverage-suggestions.md §3.1.
import 'server-only';
import { generateText, Output } from 'ai';
import { anthropicModel, MODELS } from '@/lib/ai/models';
import { coverageSuggestionSchema, type CoverageSuggestionOutput } from '@/lib/ai/schemas';
import { GRAIN_ICP } from '@/lib/ai/icp';
import type { SuggestionEngineInput } from '@/lib/types';

const SYSTEM = `You are a sales operations planner for Grain, a cross-currency management company.
Your job: allocate a sales team across fintech/payments/treasury conferences for the year.

${GRAIN_ICP}

HARD CONSTRAINTS (these are enforced in code after you respond — stay within them):
1. Do NOT assign a rep to a conference that is in the "committed" list (those are locked).
2. Do NOT create double-bookings — a rep cannot attend two conferences whose date ranges overlap.
3. Respect each rep's capacity (max conferences). Only exceed it if the user prompt explicitly requests it for that rep, and flag it in perRepNotes.
4. If a prompt instruction cannot be satisfied without breaking a hard constraint (1-3), add it to unsatisfiable with a clear reason. Never silently violate.

SOFT OBJECTIVES (optimize in this order):
1. Cover every T1 conference, then maximize T2 coverage. Weight by icp_score (higher = more valuable).
2. Balance coverage geographically (Europe/Americas/APAC/MEA) and temporally (by quarter).
3. Cluster trips — group conferences near each other in time and space, anchored to each rep's home region. This saves travel cost and is a key planning win.
4. Balance load across reps — no one rep overwhelmed while others idle.
5. Honor the user's natural-language prompt — strategic overrides take precedence over generic objectives.

RESPONSE FORMAT:
- assignments: list of {repId, conferenceId, reason} for EVERY conference you assign. Use the exact IDs provided.
- perRepNotes: one note per rep explaining their proposed schedule and any rationale.
- rationale: 3-5 sentences covering overall coverage achieved, gaps closed, clusters formed, and how the prompt was honored.
- unsatisfiable: any prompt requests you could not honor without violating a hard constraint.`;

function renderPrompt(input: SuggestionEngineInput): string {
  const today = new Date().toISOString().split('T')[0];
  const upcoming = input.conferences.filter((c) => !c.endDate || c.endDate >= today);

  const confList = upcoming
    .map((c) => `  [${c.id}] ${c.name} | ${c.startDate ?? '?'}–${c.endDate ?? '?'} | ${c.region ?? '?'} | ${c.tier ?? '?'} | ICP:${c.icpScore ?? '?'}`)
    .join('\n');

  const repList = input.reps
    .map((r) => `  [${r.id}] ${r.name} | home:${r.homeRegion ?? '?'} | cap:${r.capacity}`)
    .join('\n');

  const committedList =
    input.committed.length > 0
      ? input.committed.map((c) => `  rep:${c.repId} → conf:${c.conferenceId} (LOCKED)`).join('\n')
      : '  (none)';

  const consideringList =
    input.considering.length > 0
      ? input.considering.map((c) => `  rep:${c.repId} → conf:${c.conferenceId} (soft)`).join('\n')
      : '  (none)';

  return (
    `UPCOMING CONFERENCES (${upcoming.length} total):\n${confList}\n\n` +
    `REPS:\n${repList}\n\n` +
    `COMMITTED (locked — do not reassign):\n${committedList}\n\n` +
    `CONSIDERING (soft — may keep, move, or drop):\n${consideringList}\n\n` +
    `USER INSTRUCTION: ${input.prompt?.trim() || '(none — run the default methodology)'}`
  );
}

export async function generateCoverageSuggestion(
  input: SuggestionEngineInput,
): Promise<CoverageSuggestionOutput> {
  const model = await anthropicModel(MODELS.SONNET);
  const { output } = await generateText({
    model,
    system: SYSTEM,
    prompt: renderPrompt(input),
    output: Output.object({ schema: coverageSuggestionSchema }),
  });
  return output;
}
