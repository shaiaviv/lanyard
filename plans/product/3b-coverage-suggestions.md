# Product Plan — Coverage Suggestions (AI rep-allocation for PLANNING)

> An enhancement to the **PLANNING** experience's Coverage view (C6 in `./3-planning.md`).
> Builds on `../00-foundation.md` (esp. **P1 · generous with hints, strict with records**, the
> Coverage entity §6, and the **hybrid AI philosophy** §5) and reuses the ICP scoring + gap
> analysis already shipped (JOURNAL Entries 016–023). **Status: 🟡 PRODUCT PLAN (this doc).**
>
> Pipeline for this feature: **this product plan → tech plan (`../tech/3b-coverage-suggestions.md`)
> → implementation.**

---

## 0. One-liner

**"Generate Coverage Suggestion with AI"** — one click (plus an optional natural-language
instruction) produces a full, defensible proposal for *which rep covers which conference across the
year*, optimized for ICP priority, regional/temporal balance, and clustered travel — while treating
already-purchased tickets as immovable. You inspect the proposal in a non-destructive **Suggestion
Mode** overlay on the very same Coverage page, can **filter to a single rep** to sanity-check their
ordered travel itinerary on the map, and can step back to the real world at any time. Suggestions are
**read-only** (they never mutate real coverage) yet **listable and reloadable** by URL.

---

## 1. Why this feature, and why AI  [the defend-it-on-video story]

**The job today is a spreadsheet nightmare.** Allocating a 6-person team across ~44 events is a
multi-objective puzzle: hit every T1, don't leave APAC/Q3 naked, cluster trips so one flight covers
three London events, don't send the same rep to two overlapping conferences, don't burn one rep out
while another sits idle — *and* work around the tickets already bought. A human does this by hand in
a grid, badly. This is precisely the "fragmented across spreadsheets" pain the brief names for the
Plan stage of the spine.

**Why AI is the right tool (not bolted-on):**
- **It speaks intent.** The single highest-value input is the rep's own sentence — "send a senior
  rep to Singapore, keep Tom in Europe, we care more about treasury than travel this year." No
  slider panel or solver UI captures fuzzy strategic intent; an LLM translates it directly into an
  allocation. This is the feature's AI heart.
- **It weighs soft, unquantifiable tradeoffs** with world knowledge (which two events are
  effectively redundant, what "senior" implies, when a cluster is worth a detour) and then
  **explains itself** in plain language a salesperson trusts.
- **It's the same hybrid stance we use everywhere** (foundation §5): **AI does the fuzzy reasoning +
  natural-language intent; deterministic code enforces and validates the hard constraints**
  (committed preserved, no double-booking, capacity caps). Mirrors scoring (AI estimates factors →
  formula decides) and matching (retrieval → LLM adjudicates → rules resolve). One coherent
  philosophy on where AI belongs.

**Why this honors P1 (core principle).** A suggestion is the ultimate *hint* — a confident guess,
**framed as a guess**, that is **generous** (bold, opinionated, whole-team) yet **never touches the
record**. Read-only Suggestion Mode is P1 made literal: we're generous with the planning hint and
strict with the committed truth. A wrong suggestion costs a glance; it can never corrupt who actually
bought which ticket.

---

## 2. Vocabulary  [DECIDED]

- **Suggestion (a.k.a. draft).** One generated allocation proposal — an immutable snapshot of
  *prompt + the full proposed assignment set + rationale + headline stats*, stamped with a UUID and a
  creation time. Lives in its own store; **never** in the real `coverage` table.
- **Suggestion Mode.** Viewing the *entire* Coverage page through the lens of one draft. Activated by
  the URL `…/planning?suggestionId=<uuid>` (and the Coverage tab in focus). Everything on the page —
  gap bars, timeline, map, rep filter — reflects the *suggested* world instead of the real one.
- **Real state.** The truth: the live `coverage` table. The default view; always one click away.
- **Locked assignment.** A `committed` coverage row (ticket purchased). Carried verbatim into every
  suggestion, immovable. *(Only `committed` is locked — see §4.)*
- **Suggested assignment.** A new or moved assignment the AI proposes. Visually distinct from
  carried-over committed rows.
- **Trip / itinerary.** A rep's chronologically ordered sequence of assigned conferences.
- **Cluster.** A run of a rep's consecutive stops that are close in *time and geography* — the
  "one flight covers three events" win.
- **Rep filter.** A control (works in both real and suggestion modes) that focuses the timeline and
  map on a single rep's trips, with ordered, numbered stops.

---

## 3. The methodology — what "smart" optimizes  [defend-it-on-video, part 2]

A defensible objective, stated up front so the rationale can be checked against it. Two tiers:

**Hard constraints (never violated; enforced + validated by deterministic code, not trusted to the
LLM):**
1. **Committed tickets are sacred.** Every `committed` row appears unchanged in the suggestion.
2. **No double-booking.** A rep is never assigned two conferences whose date ranges overlap (overlap
   = `[startA,endA]` intersects `[startB,endB]`, inclusive; conferences with missing dates are
   treated as non-overlapping but flagged).
3. **Capacity cap.** No rep exceeds their `capacity` (max conferences) — unless the user's prompt
   explicitly overrides, in which case it's honored *and flagged* in the rationale.

**Soft objectives (what the AI optimizes, roughly in priority order):**
1. **Cover every T1** (must-attend), then maximize **T2** coverage. ICP-weighted: a higher
   `icpScore` event earns more for being covered.
2. **Balance the calendar geographically and temporally** — close the gaps the existing
   `getGapAnalysis` already surfaces (under-served region / quarter). The AI formalizes what those
   panels show.
3. **Cluster trips** — minimize travel by grouping events near each other in time + space, anchored
   to each rep's **home base**. This is the explicit "spot opportunities to cluster trips" brief ask.
4. **Fairness / balanced load** across reps (no one rep carries everything while another idles).
5. **Honor the user's natural-language prompt** — strategic overrides ("X to region Y") take
   precedence over the generic objectives, short of breaking a hard constraint.

> **Tie to existing work:** the soft objectives are exactly the signals the Coverage view already
> computes (tier/ICP, gap-by-region, gap-by-quarter, the same-region-same-month cluster detector).
> The suggestion engine is the *active* counterpart to those *diagnostic* panels — it doesn't invent
> a new methodology, it optimizes the one we already defend.

---

## 4. Locking rule  [DECIDED — only committed is locked]

- **`committed`** → **locked.** Carried into the suggestion verbatim; the AI plans *around* it.
- **`considering`** → **soft.** The AI may keep, move, or drop it. Rationale: a "considering" is an
  un-finalized human intent, not a purchase; letting the AI reconsider it is what makes the proposal
  genuinely optimized rather than a thin gap-filler. (Chosen over "lock both" and "blank slate".)
- **`attended` / `declined`** → ignored for future planning (past or opted-out).
- **Net effect:** a suggestion = {all committed rows, unchanged} ∪ {a fresh AI allocation of every
  other upcoming event across the reps, respecting hard constraints}.

---

## 5. User flow

**5.1 Generate (from real Coverage view)**
- A primary **"Generate coverage suggestion with AI"** action sits in the Coverage view header.
- It opens a lightweight composer with an **optional instruction field** (placeholder shows examples:
  *"Send a senior rep to APAC. Keep Tom in Europe. Prioritize treasury events."*). Empty prompt is
  fine — the generic methodology runs.
- On submit: the engine runs, a draft is created, and the page navigates to
  `…/planning?suggestionId=<uuid>` — i.e., straight into Suggestion Mode for the new draft. A
  processing state covers the round-trip (consistent with the app's other AI actions).

**5.2 Inspect (Suggestion Mode)**
- A persistent **banner** marks the mode: *"Viewing AI suggestion — [one-line prompt echo or
  'Balanced default'] · generated [time]"* with a clear **"Exit to real state"** button. The banner
  is unmissable so the user never confuses a draft for reality.
- The **whole Coverage page re-renders against the draft**: the by-region / by-quarter gap bars, the
  timeline calendar, the map, and the rep filter all reflect the suggested allocation.
- **Suggested vs locked is visually legible.** Carried-over `committed` rows read as committed;
  newly-suggested assignments get a distinct "suggested" treatment (e.g., a dashed/accented chip
  labeled as a proposal) so the eye can separate "what's real and locked" from "what the AI is
  proposing." (Exact visual language → tech/impeccable pass; the *requirement* is unambiguous
  separation.)
- A **rationale panel** (the trust surface) summarizes, in the AI's words + structured stats:
  - headline coverage achieved (T1 covered X/Y, T2 X/Y, ICP-weighted coverage delta vs. real),
  - gaps closed (region/quarter before → after),
  - clusters formed (e.g., "Maya: 3-stop EU swing in March"),
  - how the **user's prompt** was honored,
  - any **conflicts / notes** (e.g., "couldn't place a rep at EuroFinance — both EU reps committed to
    overlapping events"; "honored your request to send Tom to APAC, which pushed his load to 6 — above
    the default cap of 5").

**5.3 Sanity-check a rep (rep filter, the user's signature ask)**
- The **rep filter** (a selector in the Coverage view) focuses on one rep. In **either** mode:
  - **Timeline:** only that rep's stops, in chronological order, each numbered, with clusters grouped/
    labeled so you can see the trip structure.
  - **Map = ordered travel map.** That rep's conferences plotted as **numbered pins in visit order,
    connected by route lines** (stop 1 → 2 → 3 …). **Hovering a pin reveals: conference name, dates,
    and "Stop N of M"** (plus its cluster label if part of one). This is exactly the "ordered travel
    map … hover tells me what conference, when, and order number, so I can sanity-check the
    clustering" requirement.
  - In Suggestion Mode + a rep selected, this is the killer combination: you watch the AI's proposed
    itinerary for that rep as a literal route and judge whether the clustering makes sense.

**5.4 Exit**
- "Exit to real state" (or removing `suggestionId`) returns to live coverage. Nothing was written;
  the truth is exactly as it was.

**5.5 The suggestions list (revisit / reload)**
- A **Suggestions list** affordance (a panel/drawer in the Coverage view) shows every generated
  draft: prompt echo, created time, and headline stat (e.g., "T1 16/16 · 3 clusters"). Selecting one
  reopens it in Suggestion Mode (navigates to its `suggestionId`).
- Because drafts persist in their own store, a **hard reload of a `?suggestionId=` URL re-renders that
  exact draft**, and the URL is shareable to a teammate. (This is why the dedicated store, not
  localStorage, was chosen — DECIDED.)

---

## 6. Read-only guarantee  [DECIDED]

- Suggestions are **never applied** to the real `coverage` table in v1. There is no "apply" button.
  The feature's job is decision *support*, not decision *execution*.
- Drafts live in a dedicated store, isolated from the truth. Generating, viewing, listing, and
  reloading suggestions has **zero** effect on real coverage.
- **Parking lot (explicitly out of scope now, not deleted):** a future "Apply this suggestion"
  (write the suggested assignments as `considering`/`committed`), per-assignment accept, and
  editing/tweaking a draft before applying. Noted so the data model can anticipate it without
  building it.

---

## 7. What the rep model needs  [DECIDED — add home-base + capacity]

Reps today are name/email only — too thin for realistic clustering. We add:
- **`home_base`** — a home city/region per rep, the anchor the AI clusters travel around and the
  thing "send Maya to APAC" is judged against.
- **`capacity`** — a soft max number of conferences per rep (default sensible value), the hard cap
  for load-balancing.
- These are seeded for the demo team (6 reps) so the suggestion has something real to optimize on
  first run. (Schema + seed details → tech plan.)

---

## 8. Edge cases  [the cross-conference rigor the rubric rewards]

- **No committed coverage (fresh team).** AI plans the whole board from scratch; nothing locked.
- **Prompt conflicts with a hard constraint.** e.g., "send Maya to Money20/20 USA" when she's
  committed to an overlapping event. The engine **never** breaks committed/double-booking — it
  *declines and explains* in the rationale rather than silently violating. (Frame the limit honestly,
  P1.)
- **Prompt pushes a rep over capacity.** Honored (user intent wins over the soft cap) but **flagged**
  in the rationale.
- **Conferences with no coordinates.** Still assignable and shown on the timeline; **omitted from the
  travel-map route** with a small "N stops not mapped (no location)" note — never silently dropped.
- **Conferences with missing/!=dates.** Treated as non-overlapping for double-booking, but flagged so
  the user knows ordering may be approximate.
- **Past conferences.** Excluded — only upcoming, plannable events.
- **Single-stop reps.** No route lines; just the one numbered pin.
- **Stale drafts.** A suggestion is a *snapshot in time*. If conferences/reps/committed coverage
  change later, the draft still renders as generated; the list/banner shows "generated [date] against
  N events" so a stale draft is recognizable, not misleading. (No auto-recompute; regenerate to get
  fresh.)
- **No Anthropic key / AI failure.** Graceful **mock/heuristic fallback** produces a labeled
  suggestion via a deterministic greedy allocator (cover T1 first, cluster by home region, respect
  hard constraints) so the feature **always demos**, consistent with the app-wide mock-fallback
  pattern (scoring, discovery, HubSpot, enrichment). The banner/rationale label it as a non-AI
  fallback so it's never mistaken for the real model's reasoning (P1).
- **Empty result / everything already committed.** Suggestion mode still renders (it just equals real
  state), with a rationale noting there was little to optimize.

---

## 9. Sales-empathy checks (the "built for a salesperson" bar, foundation T4)

- **One click to value.** The default (empty-prompt) generation must produce a useful plan with no
  configuration. The prompt is power-user sugar, not a gate.
- **Trust through transparency.** The rationale panel is non-negotiable — a black-box allocation a
  sales lead can't interrogate won't be trusted or used. It must say *what* and *why*, in their
  language.
- **Never overwhelm.** Suggestion Mode reuses the existing Coverage chrome rather than a new dense
  dashboard; the only additions are the banner, the suggested-chip treatment, the rationale panel,
  and the rep filter. We do not surface all four app scores here (T4) — Coverage is about *who covers
  what*, so tier/ICP and coverage status are the signals shown.
- **Reversible and safe.** Read-only + an always-present exit means the user can explore fearlessly.

---

## 10. Acceptance criteria (product-level)

- [ ] A "Generate coverage suggestion with AI" action with an optional instruction field exists in
      the Coverage view.
- [ ] Generating creates a draft and lands the user in Suggestion Mode via `?suggestionId=<uuid>`.
- [ ] Suggestion Mode re-renders gap bars + timeline + map against the draft, with an unmissable
      banner and an exit affordance, and visually distinguishes suggested vs. locked-committed.
- [ ] Every `committed` ticket is preserved verbatim; no rep is double-booked; capacity respected
      (or over-cap only by explicit prompt, and flagged).
- [ ] A rationale panel explains coverage achieved, gaps closed, clusters formed, prompt handling,
      and conflicts.
- [ ] The rep filter works in both modes: timeline shows ordered numbered stops; map shows a numbered,
      route-connected itinerary whose pins reveal name + dates + "Stop N of M" on hover.
- [ ] A suggestions list shows all drafts and reopens any; a hard reload of a `?suggestionId=` URL
      re-renders that exact draft.
- [ ] No suggestion ever mutates the real `coverage` table.
- [ ] With no Anthropic key, a labeled heuristic fallback still produces a valid, viewable suggestion.

---

## 11. Out of scope (parking lot)

- "Apply suggestion" / per-assignment accept / draft editing (see §6).
- Cost/budget modeling (flights, hotels) beyond cluster-count as a travel proxy.
- Multi-team / cross-team allocation.
- Auto-regenerating stale drafts.
- Optimizing for anything beyond the §3 objectives (e.g., rep–vertical specialization) — could be a
  natural next prompt-driven extension.

---

## 12. Open questions for the tech plan

- Exact draft storage shape (table columns vs. a single JSONB payload) and how the read path overlays
  a draft onto the existing Coverage queries without duplicating render logic.
- Prompt/response contract for the engine (Zod schema): per-rep ordered assignments + rationale +
  stats + conflicts, and how deterministic validation re-checks hard constraints on the AI output and
  repairs/flags violations.
- Cluster-detection algorithm (time + geo thresholds) shared by timeline grouping and map routing.
- Map routing rendering with react-leaflet (numbered markers + polylines) and hover tooltips.
- Where the rep filter + mode state live (URL params vs. client state) for shareable, reload-safe URLs.
</content>
</invoke>
