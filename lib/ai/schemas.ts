// Zod 4 schemas = the structured-output contracts for every AI call (passed to Output.object()).
// Mirror lib/types.ts. (Zod 4: z.record requires explicit key+value types.)
import { z } from 'zod';

export const temperatureEnum = z.enum(['hot', 'warm', 'lukewarm', 'cool', 'cold']);
export const fitTierEnum = z.enum(['strong', 'moderate', 'weak', 'unclear']);
export const arcVerdictEnum = z.enum(['warming', 'nurturing', 'tirekicker', 'cooling', 'tooearly']);

// #4 lead-fit (company × person), folded into the parse call.
export const leadFitSchema = z.object({
  companyFit: fitTierEnum,
  personFit: fitTierEnum,
  tier: fitTierEnum,
  score: z.number().min(0).max(100),
  rationale: z.string(),
});

// F2 voice-parse output (Haiku). confidencePerField drives the review highlighting.
export const parseCaptureSchema = z.object({
  name: z.string().nullable(),
  company: z.string().nullable(),
  title: z.string().nullable(),
  email: z.string().nullable(),
  topics: z.array(z.string()),
  suggestedTemperature: temperatureEnum,
  followUp: z.boolean(),
  reminder: z.string().nullable(),
  note: z.string(), // cleaned note / summary of what was discussed
  fit: leadFitSchema,
  confidencePerField: z.record(z.string(), z.number()), // field name → 0..1
});
export type ParseCaptureOutput = z.infer<typeof parseCaptureSchema>;

// Matching engine adjudication output (foundation §7).
export const matchSchema = z.object({
  results: z.array(
    z.object({
      contactId: z.string(),
      decision: z.enum(['same', 'different', 'unsure']),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
      jobChange: z.boolean(),
    }),
  ),
});
export type MatchOutput = z.infer<typeof matchSchema>;

// #3 relationship-arc briefing (Sonnet). Glance line is computed deterministically; this is the AI block.
export const briefingSchema = z.object({
  verdict: arcVerdictEnum,
  lastTime: z.string(),
  openThreads: z.array(z.string()),
  howToApproach: z.string(),
  suggestedMove: z.string(),
});
export type BriefingOutput = z.infer<typeof briefingSchema>;

// C4 conference ICP factor estimation (Sonnet). Combined by the tunable formula client-side.
const factorScore = z.object({ score: z.number().min(0).max(100), rationale: z.string() });
export const conferenceFactorsSchema = z.object({
  factors: z.object({
    icpDensity: factorScore,
    topicFit: factorScore,
    scale: factorScore,
    geoRelevance: factorScore,
    historicalPerf: factorScore.nullable(),
  }),
});
export type ConferenceFactorsOutput = z.infer<typeof conferenceFactorsSchema>;

// Coverage Suggestions (Sonnet). AI proposes assignments + reasoning only — order/clusters/stats
// are computed deterministically in buildSuggestionDraft (never trusted to the AI).
export const coverageSuggestionSchema = z.object({
  assignments: z.array(z.object({
    repId: z.string(),
    conferenceId: z.string(),
    reason: z.string(), // short why-this-rep-here
  })),
  perRepNotes: z.array(z.object({ repId: z.string(), note: z.string() })),
  rationale: z.string(), // overall narrative: coverage, gaps, clusters, prompt handling
  unsatisfiable: z.array(z.object({ request: z.string(), why: z.string() })).default([]),
});
export type CoverageSuggestionOutput = z.infer<typeof coverageSuggestionSchema>;

// C5 AI conference discovery (Sonnet). Surfaces real events not already in the DB.
export const discoverConferencesSchema = z.object({
  candidates: z.array(
    z.object({
      name: z.string(),
      startDate: z.string().nullable(),  // ISO date, best estimate
      endDate: z.string().nullable(),
      location: z.string().nullable(),   // city
      country: z.string().nullable(),
      region: z.string().nullable(),     // Europe | Americas | APAC | MEA
      verticals: z.array(z.string()),
      estAudience: z.number().nullable(),
      whyRelevant: z.string(),           // why it fits Grain's ICP
    }),
  ),
});
export type DiscoverConferencesOutput = z.infer<typeof discoverConferencesSchema>;
