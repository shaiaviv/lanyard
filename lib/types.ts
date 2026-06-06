// Lanyard — shared domain types. Mirror of the DB schema (supabase/migrations/0001_init.sql)
// and plans/00-foundation.md §6. Plain TS — no library deps; everything references these.

export type Temperature = 'hot' | 'warm' | 'lukewarm' | 'cool' | 'cold'; // their interest (5-pt)
export type FitTier = 'strong' | 'moderate' | 'weak' | 'unclear';         // our ICP fit (#4)
export type LinkState = 'pending' | 'confirmed';                          // capture-vs-commit (§8)
export type ConfTier = 'T1' | 'T2' | 'T3';                                // ICP scoring (C4)
export type CoverageStatus = 'considering' | 'committed' | 'attended' | 'declined';

// Per-contact relationship-arc verdict (#3). Distinct from per-encounter Temperature.
export type ArcVerdict = 'warming' | 'nurturing' | 'tirekicker' | 'cooling' | 'tooearly';

export interface Rep {
  id: string;
  authUserId: string | null;
  teamId: string;
  name: string;
  email: string | null;
  currentConferenceId: string | null;
  // Coverage-suggestions additions (0003 migration)
  homeCity: string | null;
  homeRegion: string | null;  // Europe | Americas | APAC | MEA — matches conferences.region
  homeLat: number | null;
  homeLng: number | null;
  capacity: number;           // soft max conferences per rep (default 5)
}

export interface Conference {
  id: string;
  name: string;
  startDate: string | null; // ISO date
  endDate: string | null;
  location: string | null;
  country: string | null;
  region: string | null;
  verticals: string[];
  estAudience: number | null;
  icpScore: number | null;  // 0..100
  tier: ConfTier | null;
  scoreBreakdown: ConferenceScoreBreakdown | null;
  latitude: number | null;
  longitude: number | null;
  source: 'seed' | 'discovery';
}

// C5 — a discovered event candidate, auto-scored, not yet added to the DB.
export interface DiscoveredCandidate {
  name: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  country: string | null;
  region: string | null;
  verticals: string[];
  estAudience: number | null;
  whyRelevant: string;
  scoreBreakdown: ConferenceScoreBreakdown | null;
  icpScore: number | null;
  tier: ConfTier | null;
}

// C4 — AI-estimated factors (each 0..100 + rationale); combined by the tunable formula.
export interface ConferenceScoreBreakdown {
  factors: {
    icpDensity: FactorScore;     // highest default weight (quality > headcount)
    topicFit: FactorScore;
    scale: FactorScore;
    geoRelevance: FactorScore;
    historicalPerf: FactorScore | null; // repeat events only
  };
}
export interface FactorScore { score: number; rationale: string }

// The durable person — identity we dedupe. LinkedIn = primary anchor when present.
export interface Contact {
  id: string;
  linkedinUrl: string | null;
  canonicalName: string;
  currentCompany: string | null;
  currentTitle: string | null;
  email: string | null;
  arcCache: ArcSummary | null; // cached briefing/verdict (#3)
}

// What the person told us AT a given event (snapshot; a change vs prior = job-change signal).
export interface IdentitySnapshot {
  name: string;
  company: string | null;
  title: string | null;
  email: string | null;
  linkedin: string | null;
}

// One meeting. A Contact accumulates many (incl. multiple at the same conference).
export interface Encounter {
  id: string;
  contactId: string | null;     // null while pending/new
  conferenceId: string | null;
  repId: string | null;
  occurredAt: string;           // ISO datetime
  audioPath: string | null;     // Supabase Storage key (P2)
  transcript: string | null;
  note: string | null;
  temperature: Temperature | null;
  topics: string[];
  fit: LeadFit | null;          // #4
  followUp: boolean;
  reminder: string | null;
  state: LinkState;             // pending until reconciled
  matchCandidates: MatchCandidate[] | null;
  identitySnapshot: IdentitySnapshot | null;
  provenance: Provenance | null;
}

export interface Provenance { repId: string | null; confidence: number; source: string }

// #4 lead-qualification — fit (company × person), distinct from temperature.
export interface LeadFit {
  companyFit: FitTier;
  personFit: FitTier;
  tier: FitTier;        // combined
  score: number;        // under-the-hood for sorting
  rationale: string;
}

// Matching engine output per candidate (foundation §7).
export interface MatchCandidate {
  contactId: string;
  decision: 'same' | 'different' | 'unsure';
  confidence: number;   // 0..1
  reasoning: string;
  jobChange: boolean;
  crossRep: boolean;
}

// #3 relationship-arc summary (briefing). Glance line is computed deterministically.
export interface ArcSummary {
  glance: { meetings: number; spanMonths: number; verdict: ArcVerdict };
  lastTime: string;
  openThreads: string[];
  howToApproach: string;
  suggestedMove: string;
}

// Matching engine resolution output (split out here so client components can reference it)
export type MatchResolution = 'auto-match' | 'prompt' | 'new' | 'pending';

// Flat parse output — mirrors ParseCaptureOutput from lib/ai/schemas without the Zod dep
export interface ParsedCapture {
  name: string | null;
  company: string | null;
  title: string | null;
  email: string | null;
  topics: string[];
  suggestedTemperature: Temperature;
  followUp: boolean;
  reminder: string | null;
  note: string;
  fit: LeadFit;
  confidencePerField: Record<string, number>;
}

// Voice-capture pipeline output — needs to cross the server→client boundary via state
export interface CaptureDraft {
  transcript: string;
  parsed: ParsedCapture;
  identity: IdentitySnapshot;
  matchCandidates: MatchCandidate[];
  resolution: MatchResolution;
  bestMatchId: string | null;
  linkedinCandidates: PersonCandidate[];
  enrichmentConfigured: boolean;
}

export interface Coverage {
  id: string;
  repId: string;
  conferenceId: string;
  status: CoverageStatus;
}

// Candidate person from an enrichment provider (LinkedIn verify F2 / pre-brief F7).
export interface PersonCandidate {
  linkedinUrl: string;
  name: string;
  title?: string;
  company?: string;
  photoUrl?: string;
  email?: string;
}

// ── AI Coverage Suggestions (plans/product/3b-coverage-suggestions.md) ───────

// Input shared by the AI call and the heuristic fallback.
export interface SuggestionEngineInput {
  conferences: {
    id: string; name: string; startDate: string | null; endDate: string | null;
    region: string | null; location: string | null; tier: string | null;
    icpScore: number | null; latitude: number | null; longitude: number | null;
  }[];
  reps: { id: string; name: string; homeRegion: string | null; capacity: number }[];
  committed: { repId: string; conferenceId: string }[];
  considering: { repId: string; conferenceId: string }[];
  prompt: string | null;
}

// One proposed assignment in a validated draft.
export interface SuggestedAssignment {
  repId: string;
  conferenceId: string;
  locked: boolean;    // true = carried-over committed ticket (immovable)
  order: number;      // 1-based chronological visit order within the rep's itinerary
  clusterId: string | null;
}

export interface TripCluster {
  id: string;
  repId: string;
  label: string;          // e.g. "Europe · Mar"
  conferenceIds: string[];
}

export interface SuggestionConflict {
  kind: 'capacity' | 'double_booking' | 'prompt_unsatisfiable' | 'unmapped' | 'undated';
  message: string;
  repId?: string;
  conferenceId?: string;
}

export interface SuggestionStats {
  t1Covered: number; t1Total: number;
  t2Covered: number; t2Total: number;
  icpWeightedCoverage: number;  // 0..100: sum(icpScore covered) / sum(icpScore all upcoming) × 100
  byRegion: { region: string; covered: number; total: number }[];
  byQuarter: { quarter: string; covered: number; total: number }[];
  clustersFormed: number;
}

// The VALIDATED draft persisted in coverage_suggestions.payload and rendered in Suggestion Mode.
export interface SuggestionDraft {
  assignments: SuggestedAssignment[];
  clusters: TripCluster[];
  rationale: string;
  perRepNotes: { repId: string; note: string }[];
  conflicts: SuggestionConflict[];
  stats: SuggestionStats;
  generatedAt: string;
  conferenceCount: number;  // snapshot size — for staleness display
  source: 'ai' | 'heuristic';
}

export interface CoverageSuggestion {
  id: string;
  teamId: string;
  createdBy: string | null;
  prompt: string | null;
  source: 'ai' | 'heuristic';
  draft: SuggestionDraft;
  createdAt: string;
}
