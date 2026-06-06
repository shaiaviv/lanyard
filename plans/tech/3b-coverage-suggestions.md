# Tech Plan — Coverage Suggestions (AI rep-allocation)

> Implements `../product/3b-coverage-suggestions.md` on the stack in `./00-tech-foundation.md`,
> bolted onto the **already-shipped** Coverage view (`CoverageView` / `CoverageTimeline` /
> `CoverageMap`, the `coverage` table, `getGapAnalysis`). Reuses the AI exemplar pattern
> (`parseCapture` / `scoreConference`: `generateText` + `Output.object`, `anthropicModel(MODELS.SONNET)`)
> and the app-wide **mock-fallback** discipline (discovery/HubSpot/enrichment).
> **Verify library APIs (AI SDK v6, react-leaflet, @supabase/ssr) against current docs at build time.**
> **Status: 🟡 TECH PLAN (this doc).**

---

## 0. The shape of the work

Three layers, in dependency order:

1. **Data** — enrich `reps` (home base + capacity); add a `coverage_suggestions` drafts table that is
   **isolated from the `coverage` truth** (read-only guarantee, P1).
2. **Engine** — the hybrid: an **AI module** proposes an allocation from conferences + reps + locked
   coverage + the user's prompt; a **deterministic validator** re-checks/repairs hard constraints and
   computes order/clusters/stats; a **heuristic fallback** runs the same validator when there's no key.
3. **Read-model + UI** — a `suggestionId` URL param puts the *existing* Coverage page into Suggestion
   Mode by overlaying the draft onto an **effective coverage set**, which the timeline, map, and gap
   panels render unchanged. Plus the **rep filter** → ordered timeline + a route-drawn travel map.

The guiding principle (mirrors scoring + matching): **AI does fuzzy reasoning + reads intent;
deterministic code owns the hard constraints and every computed number.** The AI never computes order
numbers, clusters, or stats, and its output is never trusted without validation.

---

## 1. Data model changes

### 1.1 Reps — home base + capacity  (migration `0002_coverage_suggestions.sql`)
```sql
alter table reps
  add column if not exists home_city   text,
  add column if not exists home_region text,        -- Europe | Americas | APAC | MEA (matches conferences.region)
  add column if not exists home_lat     double precision,   -- optional: anchor pin / travel distance
  add column if not exists home_lng     double precision,
  add column if not exists capacity     integer not null default 5;  -- soft max conferences/rep
```
- `home_region` is the cluster/anchor the AI reasons over and what "send Maya to APAC" is judged
  against; it must use the **same vocabulary** as `conferences.region`.
- `home_lat/lng` optional — enables a "home" pin (stop 0) and haversine distance later; not required
  for v1 clustering (which keys off conference coords + region).
- Seed all 6 demo reps with realistic bases/capacities (update `scripts/gen-demo-data.mjs` so a fresh
  DB + `setup.sql` reproduce it). e.g. Maya → London/Europe, Tom → Frankfurt/Europe, Priya →
  Singapore/APAC, Liam → New York/Americas, Sofia → Dubai/MEA, you → London/Europe.

### 1.2 `coverage_suggestions` — the drafts store (NEVER touches `coverage`)
```sql
create table coverage_suggestions (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null,
  created_by  uuid references reps(id) on delete set null,
  prompt      text,                       -- the user's free-text instruction (nullable = default run)
  source      text not null default 'ai', -- 'ai' | 'heuristic' (fallback) — labeled in UI (P1)
  payload     jsonb not null,             -- the VALIDATED SuggestionDraft (see §2.2)
  created_at  timestamptz not null default now()
);
create index on coverage_suggestions (team_id, created_at desc);
```
- **Read-only w.r.t. truth:** this table is the *only* thing the feature writes. The `coverage`
  table is never mutated by any suggestion code path. (The product's read-only guarantee, §6.)
- `payload` holds the whole validated draft (assignments + rationale + stats + conflicts + snapshot
  meta), so a reload renders the exact draft with **zero recomputation** and no dependency on
  conferences/reps having stayed the same → snapshot semantics for free.
- RLS: mirror the permissive one-team policy the other tables use (authenticated team members
  read/write). Writes go through the **admin client** in actions (same as `assignCoverage`), reads
  through the RLS server client.

> **No migration runner?** The repo applies SQL via the Supabase SQL editor + `setup.sql` (JOURNAL
> Entries 014/022). Ship the changes as `migrations/0002_*.sql` **and** fold them into `setup.sql`
> (+ the `scripts/gen-*.mjs` generators) so a fresh DB is correct and existing DBs get a paste-able file.

---

## 2. Types & contracts

### 2.1 `lib/types.ts` additions (plain TS — keep out of `'use server'` modules, per the type-boundary rule)
```ts
export interface Rep { /* …existing… */ homeCity: string | null; homeRegion: string | null;
  homeLat: number | null; homeLng: number | null; capacity: number; }

// One proposed assignment in a draft.
export interface SuggestedAssignment {
  repId: string;
  conferenceId: string;
  locked: boolean;          // true = carried-over committed ticket (immovable)
  order: number;            // 1-based chronological visit order within the rep's itinerary
  clusterId: string | null; // groups consecutive near-in-time-and-space stops
}
export interface TripCluster { id: string; repId: string; label: string;  // e.g. "Europe · Mar"
  conferenceIds: string[]; }
export interface SuggestionConflict { kind: 'capacity'|'double_booking'|'prompt_unsatisfiable'|'unmapped'|'undated';
  message: string; repId?: string; conferenceId?: string; }
export interface SuggestionStats {
  t1Covered: number; t1Total: number; t2Covered: number; t2Total: number;
  icpWeightedCoverage: number;                 // 0..100, vs real-state baseline
  byRegion: { region: string; covered: number; total: number }[];
  byQuarter: { quarter: string; covered: number; total: number }[];
  clustersFormed: number;
}
// The VALIDATED draft persisted in coverage_suggestions.payload and rendered in Suggestion Mode.
export interface SuggestionDraft {
  assignments: SuggestedAssignment[];
  clusters: TripCluster[];
  rationale: string;                            // the AI's plain-language narrative (trust surface)
  perRepNotes: { repId: string; note: string }[];
  conflicts: SuggestionConflict[];
  stats: SuggestionStats;
  generatedAt: string;
  conferenceCount: number;                      // snapshot size, for staleness display
  source: 'ai' | 'heuristic';
}
export interface CoverageSuggestion { id: string; teamId: string; createdBy: string | null;
  prompt: string | null; source: 'ai'|'heuristic'; draft: SuggestionDraft; createdAt: string; }
```

### 2.2 AI output contract — `lib/ai/schemas.ts` (Zod 4, passed to `Output.object`)
The AI returns **only** what requires judgment — assignments + reasoning. Everything computable
(order, clusters, stats) is derived by code afterward.
```ts
export const coverageSuggestionSchema = z.object({
  assignments: z.array(z.object({
    repId: z.string(),
    conferenceId: z.string(),
    reason: z.string(),                         // short why-this-rep-here
  })),
  perRepNotes: z.array(z.object({ repId: z.string(), note: z.string() })),
  rationale: z.string(),                        // overall narrative: coverage, gaps, clusters, prompt handling
  unsatisfiable: z.array(z.object({ request: z.string(), why: z.string() })).default([]),
});
export type CoverageSuggestionOutput = z.infer<typeof coverageSuggestionSchema>;
```
> Note: committed assignments are **not** asked of the AI — the validator injects them. The AI only
> allocates the non-committed events. `unsatisfiable` is how the model declines a prompt it can't honor
> without breaking a hard constraint (instead of silently violating it — §8).

---

## 3. The engine

### 3.1 AI module — `lib/ai/generateCoverageSuggestion.ts` (Sonnet; copies the exemplar)
```ts
import 'server-only';
import { generateText, Output } from 'ai';
import { anthropicModel, MODELS } from '@/lib/ai/models';
import { coverageSuggestionSchema, type CoverageSuggestionOutput } from '@/lib/ai/schemas';

export interface SuggestionEngineInput {
  conferences: { id; name; startDate; endDate; region; location; tier; icpScore }[]; // upcoming, plannable
  reps: { id; name; homeRegion; capacity }[];
  committed: { repId; conferenceId }[];     // locked — the AI plans around these
  considering: { repId; conferenceId }[];   // soft context (AI may keep/move/drop)
  prompt: string | null;
}

export async function generateCoverageSuggestion(input: SuggestionEngineInput): Promise<CoverageSuggestionOutput> {
  const model = await anthropicModel(MODELS.SONNET);
  const { output } = await generateText({
    model,
    system: SYSTEM,                          // methodology §3 of product plan + GRAIN_ICP context
    prompt: renderPrompt(input),             // compact numbered conf/rep lists w/ ids, locked set, the user instruction
    output: Output.object({ schema: coverageSuggestionSchema }),
  });
  return output;
}
```
- `SYSTEM` encodes the **methodology**: hard constraints (don't touch committed, no double-booking,
  respect capacity unless explicitly told otherwise) + soft objectives in priority order (T1→T2
  ICP-weighted, balance region/quarter, cluster near home base, fairness) + "if a prompt request
  can't be honored without breaking a hard rule, put it in `unsatisfiable`, don't break the rule."
  Reuse the shared `GRAIN_ICP` constant (`lib/ai/icp.ts`) like the scorer does.
- `renderPrompt` passes conferences/reps **by id** in compact lists; the model references ids. (Ids
  are validated in §3.2 — hallucinated ids are dropped.)
- Sonnet (not Haiku): this is reasoning-heavy, runs rarely (on demand), so cost is a non-issue —
  same call profile as discovery/scoring.

### 3.2 Validator/derivation — `lib/scoring/buildSuggestionDraft.ts` (pure, isomorphic — NO `server-only`)
The trust layer. Turns raw AI output (or heuristic output, same shape) into a validated `SuggestionDraft`.
```ts
export function buildSuggestionDraft(
  raw: CoverageSuggestionOutput,
  ctx: SuggestionEngineInput & { realStats: SuggestionStats },
): SuggestionDraft
```
Steps (all deterministic):
1. **Inject locked.** Start the assignment set from every `committed` row (`locked: true`). These are
   never removed.
2. **Validate AI assignments.** Drop any with unknown repId/conferenceId; drop any that duplicate a
   locked pair; drop ones for non-upcoming confs.
3. **Enforce no double-booking.** For each rep, sort assignments by `startDate`; if a new (non-locked)
   assignment's date range overlaps one already kept, **drop it** and record a `double_booking`
   conflict. (Overlap = inclusive interval intersection; missing dates → treat as non-overlapping +
   record an `undated` conflict so ordering is flagged as approximate.)
4. **Enforce capacity.** If a rep exceeds `capacity`, trim **lowest-ICP non-locked** assignments to
   fit and record a `capacity` conflict — UNLESS the prompt explicitly raised it for that rep (engine
   passes a `capacityOverrides` set parsed from `unsatisfiable`/notes), in which case keep + flag.
5. **Compute order + clusters** via `clusterTrips()` (§3.3).
6. **Compute stats** via the shared `computeGapAnalysis` (§5.2) over the effective set + ICP-weighted
   coverage delta vs `realStats`.
7. **Carry** rationale, perRepNotes, and map `unsatisfiable` → `prompt_unsatisfiable` conflicts;
   add `unmapped` conflicts for assigned confs without coordinates.

> This is where the read-only + correctness guarantees actually live. The AI can be wrong; the draft
> that gets stored is always internally valid (committed intact, no rep double-booked).

### 3.3 Cluster + ordering — `lib/scoring/clusterTrips.ts` (pure, shared by timeline + map)
```ts
export function clusterTrips(repAssignments: {conferenceId; startDate; endDate; region; lat; lng}[]):
  { order: Map<string, number>; clusters: TripCluster[] }
```
- Sort by `startDate` → assign `order` 1..N.
- A **cluster** = a maximal run of consecutive stops where the gap between one stop's end and the
  next's start ≤ **`CLUSTER_DAYS` (default 21)** AND they're geographically close (same `region`, or
  haversine(lat/lng) ≤ **`CLUSTER_KM` (default 800)** when coords exist).
- `label` = `${region} · ${monthShort}`. Thresholds exported as named constants (tunable, documented).

### 3.4 Heuristic fallback — `lib/scoring/heuristicSuggestion.ts` (pure)
Runs when there's no Anthropic key (or the AI call throws), producing the **same
`CoverageSuggestionOutput` shape** so it flows through the identical validator → identical draft:
- Greedy: order non-committed upcoming events by tier then ICP desc; assign each to the eligible rep
  (no double-booking, under capacity) whose `homeRegion` matches the event region first, else least-
  loaded rep; fill T1, then T2, then T3 as capacity allows.
- `rationale` plainly states it's a non-AI heuristic; `source: 'heuristic'` so the banner/list label
  it (P1 — never pass a heuristic off as the model's reasoning).

---

## 4. Server actions & queries

### 4.1 Actions — `app/actions/suggestions.ts` (new `'use server'` file)
```ts
generateCoverageSuggestionAction(prompt: string | null):
  Promise<{ id: string; source: 'ai'|'heuristic' } | { error: string }>
```
- `getCurrentRep()` → gather: `getConferences()` (filter to upcoming/plannable), `getReps(teamId)`
  (now with home/capacity), `getConferenceCoverage(teamId)` split into committed/considering, and the
  real `getGapAnalysis` for the baseline stats.
- Try `generateCoverageSuggestion(...)`; on `MissingServiceKeyError` (or any AI error) →
  `heuristicSuggestion(...)`. **Either path → `buildSuggestionDraft(...)`.**
- Persist to `coverage_suggestions` via the **admin client** (like `assignCoverage`/`saveScoringWeights`);
  return the new `id`. Client then navigates to `?suggestionId=<id>`.
- `revalidatePath('/planning')` so the suggestions list refreshes.
- **Never** writes `coverage`.

> Keep types out of the `'use server'` boundary: `CoverageSuggestion`/`SuggestionDraft` live in
> `lib/types.ts` (the journal's repeated Turbopack gotcha — Entry "Type Architecture Fix").

### 4.2 Queries — `lib/db/queries.ts` additions
```ts
getCoverageSuggestions(teamId): Promise<CoverageSuggestion[]>   // list (id, prompt, source, createdAt, headline stats)
getCoverageSuggestionById(id):  Promise<CoverageSuggestion | null>  // reload a specific draft
```
Both map snake→camel like the existing helpers; `payload` JSONB casts straight to `SuggestionDraft`.

---

## 5. The Suggestion-Mode read-model (the overlay)

### 5.1 Wiring `suggestionId` through the page
- `app/(planning)/planning/page.tsx` reads `searchParams` (Next 16: `searchParams` is async — `await`
  it). If `suggestionId` present → `getCoverageSuggestionById(id)` in the `Promise.all`, pass the
  `CoverageSuggestion | null` to `PlanningHub`.
- `PlanningHub` gains a `suggestion?: CoverageSuggestion | null` prop. When set, it **forces the
  Coverage tab** (suggestion mode is a Coverage concept) and renders the **mode banner**
  ("Viewing AI suggestion · [prompt echo] · generated …" + "Exit to real state" → `Link` to
  `/planning`). The banner is unmissable (P1).
- The page stays a server component; the suggestion is fetched server-side so a hard reload of
  `?suggestionId=` re-renders the exact draft → shareable, reload-safe URLs (the reason we chose a DB
  table over localStorage).

### 5.2 Effective coverage + shared gap helper (DRY)
- Extract a **pure** `computeGapAnalysis(conferences, coverageRows)` into
  `lib/scoring/gapAnalysis.ts`; refactor the server `getGapAnalysis` to call it (no behavior change).
- `CoverageView` gains an optional `suggestion?: SuggestionDraft` prop. When present it builds an
  **effective `CoverageRow[]`**: locked committed rows (status `committed`) + suggested rows (a new
  display status `suggested`), and computes gap from that effective set with the shared helper. The
  timeline, map, and gap bars consume the effective set **unchanged** — one render path, two data
  sources (real vs. overlaid).
- `CoverageRow.status` gains `'suggested'` for display; `COVERAGE_STYLE` in `CoverageTimeline` gets a
  distinct **suggested** treatment (e.g., accent/dashed chip labeled as a proposal) so suggested vs.
  locked-committed is unmistakable (product §5.2). Map: suggested-covered markers get a distinct ring
  from committed-green.

### 5.3 The rationale panel
New `SuggestionSummary` component rendered above the timeline/map in suggestion mode: the AI
`rationale`, the `stats` (T1 X/Y, T2 X/Y, ICP-weighted coverage vs real, clusters formed,
before→after by region/quarter), `perRepNotes`, and a conflicts list. This is the trust surface — it
is not optional.

---

## 6. Rep filter + ordered travel map

### 6.1 Rep filter (both modes)
- `CoverageView` gets client state `repFilter: string | 'all'` + a rep `<select>`/segmented control.
- Passed into `CoverageTimeline` and `CoverageMap`. When set, both restrict to that rep's
  assignments; the timeline shows each stop's **order number** and groups by cluster label; in
  suggestion mode the order/cluster come straight from the draft, in real mode they're computed on the
  fly via `clusterTrips()` over that rep's committed+considering set.
- Kept as client state (interactive sanity-checking); `suggestionId` stays the only URL param. (Could
  be URL-synced later if shareable rep views are wanted — noted, not built.)

### 6.2 Ordered travel map — `CoverageMap` enhancement
When a rep is selected, switch from the all-events circle view to an **itinerary view**:
- **Numbered pins** in visit order using `L.divIcon` (a styled badge showing the order number) via
  react-leaflet `<Marker icon={…}>` — avoids leaflet's default-marker-asset issue and gives us the
  number for free.
- **Route line** connecting stops in order with `<Polyline positions={orderedLatLngs} />` (dashed,
  accent color).
- **Hover tooltip per pin**: conference **name**, **dates**, and **"Stop N of M"** (+ cluster label if
  clustered) — exactly the product's sanity-check requirement.
- Optional **home pin (stop 0)** when `homeLat/Lng` set.
- **Unmapped stops** (no coords): excluded from the route, surfaced as a small "N stops not mapped
  (no location)" caption (never silently dropped — §8).
- Needs `Marker`, `Polyline` added to the react-leaflet imports; verify icon/Polyline APIs vs current
  react-leaflet docs at build time.

---

## 7. Components — new & modified

**New**
- `components/planning/GenerateSuggestionButton.tsx` — the CTA + prompt composer (textarea w/ example
  placeholder, "Generate"), calls the action in a `useTransition`, then `router.push('?suggestionId=…')`.
- `components/planning/SuggestionBanner.tsx` — the mode banner + exit.
- `components/planning/SuggestionSummary.tsx` — rationale + stats + conflicts panel.
- `components/planning/SuggestionsList.tsx` — drawer/panel listing drafts (prompt, time, headline stat,
  `source` label), each links to its `suggestionId`.
- `lib/ai/generateCoverageSuggestion.ts`, `lib/scoring/{buildSuggestionDraft,clusterTrips,heuristicSuggestion,gapAnalysis}.ts`.

**Modified**
- `CoverageView` — rep filter, suggestion prop, effective-coverage build, mounts the suggestion UI.
- `CoverageTimeline` — `suggested` status style; per-rep ordered/clustered rendering with order numbers.
- `CoverageMap` — itinerary view (numbered markers + polyline + hover), `suggested` ring style.
- `CoverageRow` (`lib/db/queries.ts`) — allow `status: '…'|'suggested'` for display.
- `PlanningHub` / `planning/page.tsx` — thread `suggestion`; force Coverage tab + banner in mode.
- `lib/types.ts`, `lib/ai/schemas.ts`, `lib/db/queries.ts`, `getReps`/`mapRep` (home + capacity).
- Seed: `scripts/gen-demo-data.mjs` + `setup.sql` (rep bases/capacities).

---

## 8. Edge cases → handling

| Case | Handling |
|---|---|
| No committed coverage | Validator injects nothing locked; AI/heuristic plans the whole board. |
| Prompt breaks a hard constraint | AI returns it in `unsatisfiable` → `prompt_unsatisfiable` conflict; constraint never violated. |
| Prompt pushes rep over capacity | Honored + `capacity` conflict flagged (override path in validator). |
| Conf without coords | Assignable + on timeline; excluded from map route + `unmapped` conflict/caption. |
| Conf missing dates | Treated non-overlapping for double-booking + `undated` conflict (ordering approximate). |
| Past conferences | Filtered out before the engine (upcoming/plannable only). |
| Single-stop rep | No polyline; one numbered pin. |
| Stale draft | Snapshot in `payload`; banner/list show "generated [date] · N events". No auto-recompute. |
| No Anthropic key / AI error | Heuristic fallback → same validator → labeled `source:'heuristic'`. |
| AI hallucinates ids | Validator drops unknown repId/conferenceId silently (logged in conflicts if material). |
| Everything already committed | Draft ≈ real state; rationale notes little to optimize. |

---

## 9. Server endpoints / actions (summary)
`generateCoverageSuggestionAction(prompt)` · `getCoverageSuggestions(teamId)` ·
`getCoverageSuggestionById(id)`. Pure helpers: `buildSuggestionDraft` · `clusterTrips` ·
`heuristicSuggestion` · `computeGapAnalysis`. AI: `generateCoverageSuggestion`. **No mutation of
`coverage` anywhere.**

---

## 10. Build sequencing
1. **Schema + types + seed** — migration `0002`, `reps` home/capacity, `coverage_suggestions`, type
   additions, seed rep bases. (Foundation for everything.)
2. **Pure core** — `gapAnalysis` extraction + `clusterTrips` + `buildSuggestionDraft` + `heuristicSuggestion`
   (unit-testable, no AI/DB). Refactor `getGapAnalysis` onto the shared helper (no behavior change).
3. **Engine** — `lib/ai/schemas.ts` contract + `generateCoverageSuggestion` + the action (AI→fallback→
   validate→persist). Verify with the heuristic path first (no key needed), then the AI path.
4. **Suggestion Mode read-model** — searchParams wiring, `getCoverageSuggestionById`, effective
   coverage in `CoverageView`, banner + summary, suggested-status styling.
5. **Generate flow + list** — `GenerateSuggestionButton` composer, `SuggestionsList`, navigation.
6. **Rep filter + travel map** — timeline ordering/clusters + `CoverageMap` itinerary view (markers,
   polyline, hover).
7. **QA** (§11).
> Order = de-risk first: the pure validator and heuristic make the whole feature demoable **before**
> the AI call exists, matching the build-manual-path-first discipline used for Field (tech/1-field §9).

---

## 11. QA checklist
- Generating creates a draft + navigates to `?suggestionId=`; hard reload re-renders the same draft.
- Suggestion Mode: banner present, Coverage tab forced, exit returns to real state, **`coverage` table
  unchanged** (verify in DB before/after).
- Every committed ticket appears in the draft unchanged; no rep double-booked; capacity respected
  (or over-cap only via explicit prompt, and flagged).
- Suggested vs. committed visually distinct on timeline + map.
- Rationale + stats + conflicts render and match the assignments.
- Rep filter: timeline shows ordered numbered + clustered stops; map shows numbered route + hover
  (name + dates + "Stop N of M"); unmapped stops captioned.
- Gap bars in suggestion mode reflect the overlaid set (recomputed via the shared helper).
- No Anthropic key → labeled heuristic suggestion still valid + viewable.
- Suggestions list shows all drafts + reopens any; `source` labeled.
- `npx tsc --noEmit`, eslint, `npm run build` clean; verified live in a browser (Playwright) like
  prior planning phases.

---

## 12. Library/API verification (build time)
Established, already-verified patterns to copy (don't re-derive): AI calls via `createAnthropic` +
`generateText` + `Output.object` (`lib/ai/scoreConference.ts`); Zod 4 schemas; `@supabase/ssr` async
`cookies()`; admin client for writes. **Verify at build time:** Next 16 async `searchParams`;
react-leaflet `Marker` + `L.divIcon` + `Polyline` (the only genuinely new library surface);
`useTransition` + `useRouter().push` for the generate→navigate flow.
```
```
</content>
