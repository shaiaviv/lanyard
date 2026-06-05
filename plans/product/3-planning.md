# Product Plan — Experience 3: PLANNING (the conference planning area)

> Reads on `../00-foundation.md` (vision, data model, AI features §5). This doc = the **PLANNING**
> experience only: the strategic desktop hub. **Status: ✅ COMPLETE (product plan).**

**User · device · ethos:** sales lead / ops, strategist at a desk, planning the year. Optimized
for **judgment & overview** — dense, analytical, filterable. Information-rich, defensible,
decision-supporting. Desktop-first. This is mainly the data **consumer** (reads/reasons over what
Field produces and Reconcile commits).

---

## Screens / jobs-to-be-done (seed)

- **C1 · Dashboard / home.** At-a-glance: upcoming conferences, recent captures, **warming
  relationships needing follow-up**, coverage gaps. "Here's what needs your attention."

- **C2 · Conference Explorer.** Database + rich filtering: vertical, region, month, audience
  size, tier/ICP score, coverage status. Sortable table/cards. Row: name, dates, location,
  vertical, est. audience, **ICP score + tier badge**, who's assigned. → detail.

- **C3 · Conference detail.** Full info + **score breakdown** (transparency: *why* this score).
  Repeat-event history (leads captured last year, conversion). Actions: assign reps, attend/skip.

- **C4 · ICP Scoring methodology + settings.**  [DECIDED — the marquee "defend it" piece]
  Rank/tier conferences by Grain ICP fit (shared "Grain ICP fit" definition, foundation §5).

  **Factors** (quality-weighted — ICP density first):
  1. **ICP audience density & decision-makers** *(highest weight)* — share of attendees who are
     the right *companies* AND right *roles* (treasury/payments/finance buyers), not warm bodies.
  2. **Topic / vertical fit** — does the event's theme attract our ICP (payments, fintech,
     treasury, FX, cross-border, travel)? The gateway factor.
  3. **Scale** — audience size / # of relevant attendees (reach).
  4. **Geographic relevance** — in/near a target market, coverable by the team.
  5. **Historical performance** *(repeat events only)* — leads/pipeline we actually got last time.
  - *Cost/effort is NOT in the fit score* — kept as a separate prioritization axis (high-fit-but-
    expensive ≠ high-fit-and-cheap), like the lead 2×2. Avoids muddying "fit."

  **Approach — HYBRID** (same philosophy as matching + lead-qual):
  - **AI estimates the fuzzy inputs** (topic fit, ICP density, decision-maker presence) from public
    info, *with a rationale per factor*; known data (size, location) used directly.
  - A **transparent, user-weighted formula** combines factor scores → **0–100 ICP-fit score** →
    **tiers: T1 Must-attend / T2 Consider / T3 Skip.**
  - Weights are the **adjustable sliders** (live recompute). C3 shows the **breakdown** + the AI's
    per-factor rationale. AI estimates uncertain for obscure events → show confidence + let the
    user **override** a factor input (P1: frame guesses as guesses).

  **Why defensible (video):** transparent (factor breakdown), grounded in Grain's real ICP,
  tunable (lead adjusts weights), AI fills hard-to-get inputs *without hiding the logic*. Quality
  over headcount — a 600-person treasury summit can outrank a 40k generic expo. Not a black box,
  not a naive size-sort.

- **C5 · AI Conference Discovery.** Find events *not already in the DB*. Lead asks ("payments/
  treasury events in APAC, H2"); AI searches the open web, returns candidates + reasoning,
  **auto-scores each via the C4 model** (so discovered events arrive already tiered), user reviews
  + adds to DB. AI is the right tool = open-ended search + judgment over the public web. (Tech:
  web search / enrichment provider; dedupe against existing DB.)

- **C6 · Planning / Coverage view.** ✅ **Both timeline + map** (+ gap analysis):
  - **Timeline / calendar** — all events across the year; coverage vs. gaps; temporal clusters.
  - **Map** — geographic clustering ("4 London events in 6 weeks → one trip").
  - **Gap analysis** — "under-invested in APAC / Q3 / travel"; high-ICP events with no coverage.

- **C7 · Relationship Intelligence (cross-conference graph).** Planning-side signature feature.
  Contacts encountered multiple times, ranked by **warming signal**; each shows the arc, the
  trajectory, AI verdict + next action. Killer filter: "warming relationships with no follow-up."

- **C8 · Contact detail (full).** Complete arc: every encounter (conf, date, rep, notes, rating),
  title/company changes over time, AI arc summary, follow-up history. Actions: draft email, push
  to HubSpot, assign owner.

- **C9 · Follow-up Workspace.** Work the follow-up queue across all events. **AI drafts a
  context-aware email per contact** from the *full relationship arc* — last conversation, open
  threads ("you owed her a pricing example"), topics, fit/temperature — in Grain's voice. Editable;
  never auto-sent (rep owns the send). One of the 4 AI features; same arc data as the briefing
  (#3), just rendered as an outbound draft. Also reachable from the Field card (F5) for a quick
  draft. Batch actions across the queue.

- **C10 · HubSpot Sync (the qualified handoff).** The spine's terminal **Sync** stage — graduate
  qualified conference leads into the org CRM (foundation §4b). **One-way push** (us → HubSpot):
  per-contact "push to HubSpot" + bulk "push qualified from this conference." *Curated, not a dump*
  — fit × temperature + arc decide what's worth pushing. Pushes Contact + **arc summary as a note**
  + fit/temperature properties + "met at [conference]" context. Dedupe against existing HubSpot
  contacts by email on push; show sync status. API key user-configurable (never hardcoded).

- **C11 · Settings.** API keys (OpenAI/Claude, HubSpot), reps/team, scoring weights.

---

## ✅ PLANNING product plan — COMPLETE
- ✅ **C4 ICP scoring methodology** (marquee) — hybrid (AI inputs → transparent tunable formula),
  quality/ICP-density weighted first, T1/T2/T3 tiers, defensible.
- ✅ C5 discovery (auto-scores via C4) · C9 follow-up emails (arc-driven) — the last 2 AI features.
- ✅ C1–C3, C6 (timeline+map+gap), C7 relationship graph (desktop render of #3), C8 full arc,
  C10 HubSpot (one-way curated push), C11 settings — all specced.
- Shared logic confirmed: C7/C8 reuse the #3 relationship-arc logic; C4/#4 reuse the shared
  "Grain ICP fit" definition.

**ALL THREE PRODUCT PLANS COMPLETE** → pipeline moves to **tech plans** (Field → Reconcile →
Planning), then build.
