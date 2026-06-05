# Planning Remediation Plan — realign `/planning` to the plans + the brief

> **Why this exists:** A take-stock review (Opus, 2026-06-06) found the built `/planning` had
> drifted hard from `product/3-planning.md` + `tech/3-planning.md` + the take-home brief. It
> shrank a **company-wide team-coverage strategic hub** into a **single-rep personal planner**, and
> dropped/faked the three highest-weighted pieces: the **scoring engine**, **cross-conference
> relationship intelligence**, and the **Planning AI features**. Decision: **full plan parity**,
> **real AI scoring + live weight sliders**, **seed a multi-rep team** so the company story demos.
> Build order below is by **grading leverage** — if time runs short, the top phases must land first.

## The drift (what we're fixing), mapped to source-of-truth

| # | Skew | Planned | Built | Phase |
|---|------|---------|-------|-------|
| 1 | **"My" not the company's** | C3 *assign reps*; coverage = "who covers what" team-wide | `getFollowUps(rep.id)`; coverage self-only; no assign-other-reps; 1 rep, 0 coverage seeded | **P0** |
| 2 | **Scoring faked** | C4 marquee: AI factor-estimation + sliders + live recompute + override | scores hardcoded in `setup.sql`; no `scoreConference`, no `computeIcpScore`, read-only breakdown | **P1** |
| 3 | **Cross-conf intel absent** | C7 "Planning-side signature feature" (ranked warming list) + C8 full arc | not in hub at all | **P2** |
| 4 | **Planning AI missing** | C9 AI email drafting; C5 discovery | Follow-ups tab = list + push; no `draftFollowup`, no `discoverConferences` | **P3 / P6** |
| 5 | **Geo cluster text-only** | C6 react-leaflet + OSM map | string-match region hint | **P4** |
| 6 | **HubSpot = dumb export** | dedupe by email, bulk push, arc-summary-as-note | always POST (409 on re-push), raw note, no bulk | **P5** |
| 7 | **No C1 dashboard / C3 detail page** | at-a-glance home; dedicated detail w/ repeat history | absent | **P7** |

Reusable modules that already ship (don't rebuild): `lib/ai/summarizeArc` (arc → C7/C8/C9),
`lib/ai/parseCapture` (the AI-module **exemplar** — copy for `scoreConference`/`discoverConferences`/
`draftFollowup`), `lib/ai/icp` (shared Grain ICP def → C4 prompt), `lib/ai/{models,schemas}`,
`lib/db/queries`, `lib/config/getServiceKey`, `components/ui/Badge`. Schema is sufficient:
`conferences.{icp_score,tier,score_breakdown}`, `coverage`, `app_settings.key_name='scoring_weights'`
already anticipated. **Verify-vs-docs at build (training is stale):** AI SDK v6 (`generateText` +
`Output.object`), Next 16 App Router, react-leaflet (new dep), Supabase ssr.

---

## P0 — Company-wide foundation (Skew 1) · *highest leverage, smallest effort*

The hub must read as a sales lead planning the **whole team's** year.

- **Seed a team** — `supabase/setup.sql`: add 3–4 teammate `reps` rows (shared `team_id`) + a spread
  of `coverage` rows (committed/considering across T1/T2 events, with deliberate gaps in APAC/Q3 so
  the under-invested + clustering stories are visible on first run). Keep the real signed-in rep too.
- **Assign-other-reps UI** — `ConferenceList` / new C3 detail: the coverage control must let the lead
  set status **for any rep**, not just self. New action `assignCoverage(repId, confId, status)` in
  `app/actions/planning.ts` (generalize current `upsertCoverage`, which hardcodes `rep.id`).
- **Team-wide follow-ups** — `getFollowUps` → team-scoped variant (by `team_id`, show owning rep), so
  the Follow-up workspace is the team's queue. Keep a "mine" filter toggle.
- **Unify "under-invested"** — `ConferenceList` currently uses *my* coverage (`!myStatusMap`);
  `CoverageTimeline` uses team coverage. Pick the **team-wide** definition everywhere (a conference is
  covered if *any* rep committed). Add `getReps(teamId)` to `lib/db/queries`.
- **Header/persona copy** — frame as team coverage ("who's covering what"), not a personal to-do.

## P1 — Real ICP scoring engine (Skew 2) · *the marquee you defend on video*

The key architectural split (tech §1): **AI estimates factors (rare, $) ↔ formula recomputes (live, free).**

- **`lib/ai/scoreConference.ts`** (copy `parseCapture` pattern; Sonnet; Zod schema in `lib/ai/schemas.ts`
  per tech §1 — `factors:{icpDensity,topicFit,scale,geoRelevance,historicalPerf?}` each `{score,rationale}`).
  Prompt carries the shared `lib/ai/icp` definition. Runs **once per conference**, persists to
  `conferences.score_breakdown`. Degrades gracefully if no Anthropic key (keep seeded breakdowns).
- **`lib/scoring/computeIcpScore.ts`** (pure, client+server): `(breakdown, weights) → 0–100 → tier`
  (T1 ≥75 / T2 ≥50 / T3 <50, configurable). Default weights favor `icpDensity`.
- **Weight sliders + live recompute** in the Conferences tab — drag a weight → every card's score/tier
  re-sorts **instantly, no AI call**. Persist weights to `app_settings` key `scoring_weights`
  (plaintext config, team-level) via a `saveScoringWeights` action.
- **Per-factor override** + rationale display in C3 detail (P1 "frame guesses as guesses").
- **Action** `scoreConference(confId)` (AI, on-demand/on-add) + "re-score" button.
- *Video defense:* transparent breakdown + tunable weights + AI-fills-inputs-not-logic + quality>headcount.

## P2 — Cross-conference relationship intelligence (Skew 3) · *most-weighted rubric item*

Bring the signature story into the strategic hub.

- **`getRelationshipList(teamId, filters)`** in `lib/db/queries`: contacts with **≥2 encounters**
  (across the team), each with arc verdict (reuse `arc_cache`/`summarizeArc`), trajectory, last touch,
  follow-up state. Rank by warming signal.
- **New `components/planning/RelationshipList.tsx`** + a **4th hub tab "Relationships"**: ranked cards
  (Warming / Nurturing / Tire-kicker / Cooling / Too-early), killer filter **"warming, no follow-up,"**
  job-change badges. This is the demo centerpiece — make it sharp.
- **C8 full contact detail** — link rows to `/contact/[id]` (exists) **from Planning**; ensure it shows
  the full multi-encounter arc, title/company changes (per-encounter `identity_snapshot`),
  `summarizeArc` output, follow-up history, and actions (draft email, push HubSpot). Add
  `getContactDetail(id)` if the existing page query is thin.

## P3 — AI follow-up email drafting (Skew 4, the C9 AI feature)

- **`lib/ai/draftFollowup.ts`** (copy exemplar; Sonnet; Zod): input = full arc (last convo, open
  threads, fit/temp, topics) via `summarizeArc`; output = subject + body in Grain's voice. **Editable,
  never auto-sent.** v1 = draft + copy / `mailto:`.
- Wire into `FollowUpQueue` (a "Draft email" button per row, expandable editor) and the C8 contact page.
- Action `draftFollowup(contactId)`.

## P4 — Coverage map + real gap analysis (Skew 5)

- Add **react-leaflet + OpenStreetMap** (keyless) — new `components/planning/CoverageMap.tsx`, plot
  conferences by lat/lng, cluster nearby. Needs lat/lng on `conferences` (add columns + seed, or
  geocode-on-seed). Toggle Timeline ↔ Map in the Coverage tab.
- **`getGapAnalysis()`** — DB aggregation: high-ICP conferences with no committed coverage; under-
  invested region/quarter/vertical. Optional one-line AI summary. Replace the string-match cluster hint
  with true geo+temporal clustering ("4 events, same region, 6 weeks → one trip").

## P5 — HubSpot hardening (Skew 6) · *stop being a dumb export*

- **Dedupe by email**: `pushToHubSpot` → search (`/crm/v3/objects/contacts/search` by email) → **update
  or create** (fixes the 409-on-re-push bug at `planning.ts:53`).
- **Arc summary as a note**, not the raw capture note (run/read `summarizeArc`).
- Push fit/temperature as properties + "met at [conference]" context.
- **Bulk** "push qualified from this conference" (`bulkPushQualified(confId)`), curated by fit×temp.
- Keep mock/degrade path when no key.

## P6 — AI conference discovery (C5)

- **`lib/ai/discoverConferences.ts`** (Sonnet + web search behind an interface, seed/mock fallback per
  foundation §5/T1): query → candidates → **auto-score via `scoreConference`** → tiered results → user
  adds (dedupe vs DB by name+date). New tab/section + `discoverConferences(query)` action.

## P7 — Conference detail (C3) + Dashboard (C1)

- **C3 `/planning/conference/[id]`**: full info + `score_breakdown` viz + per-factor rationale +
  **factor override** + repeat-event history (leads captured last year) + **assign reps** + attend/skip.
- **C1 Dashboard** (build last — aggregates everything): upcoming conferences w/ coverage, recent
  captures, **warming relationships needing follow-up**, coverage gaps. Make it the hub landing.

## P8 — Settings polish (C11) + QA

- C11 already exists (encrypted keys, masked). Add **scoring weights** controls surfaced here too.
- **QA per `tech/3-planning.md` §7**: scores compute + tier; sliders recompute live with no AI re-call;
  breakdown/rationale/override; seeded conferences scored; **team** coverage assign + gap analysis;
  timeline/map render + cluster; relationship list ranks by verdict + filters; follow-up drafts pull
  real arc; HubSpot dedupes by email + bulk + degrades to mock; keys masked/server-only; dashboard
  aggregates. `npx tsc --noEmit` clean throughout; commit+push after each phase (auto-deploy on main).

---

## Sequencing note
P0→P2 are the grade-movers (company-wide framing, real scoring, cross-conference intel) and should
land first even though we're building full parity. P3–P8 fill out parity. **Model:** this remediation
*planning* is Opus-appropriate; the high-volume build (screens/CRUD/wiring) is Sonnet's wheelhouse per
the model strategy — switch at the P0 build start, keep Opus for any scoring-methodology/relationship-
verdict reasoning calls.
