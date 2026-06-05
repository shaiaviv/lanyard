// AI providers wired to Settings-resolved keys (getServiceKey). Server-only.
// AI SDK v6: structured output via generateText({ output: Output.object({ schema }) }).
import 'server-only';
import { createAnthropic } from '@ai-sdk/anthropic';
import { getServiceKey, MissingServiceKeyError } from '@/lib/config/getServiceKey';

// Model IDs — aliases resolve to the newest dated release. Verify against the current model list
// if a call 404s (model IDs change). Tiering per plans/tech/00-tech-foundation.md §4.
export const MODELS = {
  HAIKU: 'claude-haiku-4-5', // cheap/high-volume: parse(+fit), match adjudication
  SONNET: 'claude-sonnet-4-6', // rich: briefing/arc, discovery, follow-up emails, conference scoring
} as const;

/** A Claude model bound to the configured Anthropic key. */
export async function anthropicModel(id: string) {
  const apiKey = await getServiceKey('anthropic');
  if (!apiKey) throw new MissingServiceKeyError('anthropic');
  return createAnthropic({ apiKey })(id);
}
