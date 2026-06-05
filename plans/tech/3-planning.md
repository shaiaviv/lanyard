# Tech Plan — Experience 3: PLANNING

> Implements `../product/3-planning.md` on the stack in `./00-tech-foundation.md`. The largest
> surface; mostly **reads/reasons** over data Field produces + Reconcile commits, plus the marquee
> **ICP scoring engine** and **T2 conference seeding**. **Verify library APIs vs current docs at
> build time.**

---

## 0. What Planning is, technically
A **desktop-first** route group `app/(planning)` — the strategic hub. Data **consumer** (reads
conferences/contacts/encounters/coverage) + the home of the **scoring engine**, **discovery**,
**follow-up drafting**, and **HubSpot sync**. Reuses shared modules: matching (n/a here), arc
(`summarizeArc`/`arc_cache`), the "Grain ICP fit" definition.

---

## 1. The ICP scoring engine (C4 — marquee)  [the key architectural split]

**Separate the AI factor-estimation (rare, expensive) from the formula (live, free).** This is both
the UX (sliders recompute instantly) and credit control.

1. **AI factor estimation** — `lib/ai/scoreConference` (Sonnet, Zod), runs **once per conference**
   (on add / on demand), estimates the fuzzy factors from public info + known fields:
```ts
conferenceFactorsOutput = z.object({
  factors: z.object({
    icpDensity:      z.object({ score: z.number(), rationale: z.string() }),  // 0..100, highest weight
    topicFit:        z.object({ score: z.number(), rationale: z.string() }),
    scale:           z.object({ score: z.number(), rationale: z.string() }),
    geoRelevance:    z.object({ score: z.number(), rationale: z.string() }),
    historicalPerf:  z.object({ score: z.number(), rationale: z.string() }).nullable() // repeat events only
  })
})
```
   Stored in `conferences.score_breakdown`. Prompt carries the shared "Grain ICP fit" definition.
2. **Deterministic formula** — `computeIcpScore(breakdown, weights)` = weighted sum → 0–100 →
   tier (T1 ≥75 / T2 ≥50 / T3 <50, thresholds configurable). **Runs client-side live** as the
   user drags the **weight sliders** — NO AI re-call. Default weights favor `icpDensity` (quality
   over headcount).
3. **C3 detail** shows the breakdown bar + per-factor **AI rationale**; user can **override** a
   factor input (P1: AI estimate is a guess). Weights live in `app_settings` (team-level).

> Why this matters: AI runs rarely (pennies), the formula runs on every slider drag (instant +
> free). Defensibility = transparent breakdown + tunable weights + AI-fills-inputs-not-logic.

---

## 2. Conference seeding (T2)
`supabase/seed.sql` (or a `scripts/seed-conferences.ts`) populates a **sample DB of real events**
from public info — fintech/payments/treasury/travel/SaaS. Examples to research + verify (name,
dates, location, vertical, est. audience): Money20/20 (Europe/USA/Asia), Web Summit, Singapore
FinTech Festival, Sibos, ITB Berlin, Seamless, Fintech Meetup, Money2020, Payments Canada Summit,
etc. After seeding, run `scoreConference` to populate scores. **Aim ~20–30 events.** Treat data as
researched/verified, not invented. Do this **early** (Explorer needs data).

---

## 3. Screens → components & data

- **C2 Conference Explorer** — `conferences` table query + filter (vertical, region, month,
  audience, tier/score, coverage status); sortable table/cards; tier badge. → C3.
- **C3 Conference detail** — full info + `score_breakdown` viz + per-factor rationale + factor
  override; repeat history; **assign reps** (writes `coverage`); attend/skip (`coverage.status`).
- **C4 Scoring settings** — weight sliders (→ `app_settings`), live recompute across the list.
- **C5 AI Discovery** — `lib/ai/discoverConferences` (Sonnet + **web search**): query → search →
  candidates → `scoreConference` each → tiered results → user adds (dedupe vs DB by name+date).
  **Web search behind an interface** (Tavily/Exa/Brave or AI-SDK web tool) with a **seed/mock
  fallback** for demo (same risk pattern as enrichment, foundation §5).
- **C6 Coverage view** — three lenses:
  - **Timeline/calendar** — conferences across the year; overlay `coverage`; highlight temporal
    clusters + gaps. (Custom timeline or light lib.)
  - **Map** — **react-leaflet + OpenStreetMap** (keyless — avoids another API key) plotting events;
    cluster nearby.
  - **Gap analysis** — DB aggregations: high-ICP conferences with no `coverage`; under-invested
    region/quarter/vertical. Optional one-line AI summary.
- **C7 Relationship Intelligence** — list/ranked view (not a node graph): contacts with ≥2
  encounters, ranked by warming signal (from `arc_cache` verdict), filterable ("warming, no
  follow-up"). Reuses `summarizeArc`.
- **C8 Contact detail (full)** — full encounter timeline, title/company changes (from per-encounter
  `identity_snapshot`), `summarizeArc` output, follow-up history; actions: draft email, push
  HubSpot, assign owner.
- **C9 Follow-up Workspace** — queue = `encounters.follow_up = true`. `lib/ai/draftFollowup`
  (Sonnet) drafts per-contact email from the full arc (last convo, open threads, fit/temp, Grain
  voice). **Editable, never auto-sent.** v1 = draft + copy/`mailto`; **Gmail send = stretch**.
- **C10 HubSpot Sync** — `lib/hubspot/` behind an interface (real client when key set; **mock**
  otherwise). One-way push: map Contact + **arc summary as a note** + fit/temperature properties +
  "met at [conference]"; **dedupe by email** (search → update or create); per-contact + bulk
  "push qualified from conference"; show sync status. Key from Settings.
- **C1 Dashboard** — aggregations (last, since it summarizes everything): upcoming conferences
  (coverage), recent captures, **warming relationships needing follow-up** (arc verdict=warming AND
  no follow-up scheduled), coverage gaps.
- **C11 Settings** — the **Settings-primary key UI** (encrypted, masked, test-connection,
  first-run prompt — tech-foundation §6) + reps/team + scoring weights.

---

## 4. External dependencies (behind interfaces, with fallbacks)
- **Web search** (C5 discovery) — interface + seed/mock fallback (demo never blocked).
- **HubSpot** (C10) — client interface + mock; one-way push only (foundation §4b).
- **Map** — react-leaflet + OSM (keyless) → no extra dependency to fail.

---

## 5. Server endpoints / actions
`scoreConference(confId)` (AI, rare) · `computeIcpScore(breakdown, weights)` (pure, client+server) ·
`discoverConferences(query)` · `assignCoverage(repId, confId, status)` · `getGapAnalysis()` ·
`getRelationshipList(filters)` · `getContactDetail(id)` · `draftFollowup(contactId)` ·
`pushToHubspot(contactId)` / `bulkPushQualified(confId)` · settings/keys CRUD (encrypted).

---

## 6. Build sequencing within Planning
1. **Seed conferences (T2)** + **C2 Explorer / C3 detail** — data + browse first.
2. **C4 scoring engine** (AI factor estimation + live formula + sliders + breakdown) — the marquee.
3. **C6 coverage** (assign reps → timeline + map + gaps).
4. **C7 relationship list + C8 contact detail** (reuse arc — already built for Field).
5. **C9 follow-up drafting** · **C10 HubSpot push**.
6. **C5 discovery** · **C1 dashboard** (aggregates everything) · **C11 settings polish**.
> Reuses Field's arc + the shared ICP definition; Planning is mostly reads + the scoring engine.
> Dashboard last (it summarizes the rest).

## 7. QA checklist (Planning)
Scores compute + tier correctly · sliders recompute live with no AI re-call · breakdown + rationale
+ factor override work · seeded conferences present & scored · coverage assign + gap analysis
correct · timeline/map render + cluster · relationship list ranks by verdict + filters · follow-up
drafts pull real arc context · HubSpot push maps fields + dedupes by email + degrades to mock ·
keys configured in Settings (masked, server-only) · dashboard aggregates accurately.
