# Tech Plan — Experience 2: RECONCILE

> Implements `../product/2-reconcile.md` on the stack in `./00-tech-foundation.md`. Mostly
> **assembly** — reuses the matching engine, Supabase Storage (audio), and contact data. The new
> work: the resolve-card UX + the **atomic commit writes** (P1 "strict with records"). **Verify
> library APIs vs current docs at build time.**

---

## 0. What Reconcile is, technically
A **desktop-first** (responsive → light mobile) route group `app/(reconcile)` that reads the
**pending** encounters the Field produced and resolves each into a **confirmed** contact↔encounter
link. v1 scope = **pending field items only** (proactive dupe sweep, confirmed-record fixes, and
contact-merge are DEFERRED — foundation §10). This is the **commit** half of capture-vs-commit.

---

## 1. Data it operates on (no new entities)
- Reads `encounters WHERE link_state = 'pending'` (+ their `match_candidates`, `identity_snapshot`,
  `audio_path`, `provenance`, `transcript`, parsed fields).
- Reads candidate `contacts` (full history: their `encounters[]`, `linkedin_url`, `arc_cache`).
- Writes: sets `encounters.contact_id` + flips `link_state → 'confirmed'`; may create a `contacts`
  row (New) or update a contact's latest title/company/LinkedIn (Match).
- **Loop-in teammate:** lightweight `notifications(id, rep_id, type, payload, read)` row (in-app
  badge). Keep minimal (matches lean scope); email is a stretch.

---

## 2. Screens → components & data

- **R1 · Reconciliation inbox** (`ReconcileQueue`).
  - Query: pending encounters for the team (default filter: *my captures*), grouped by
    conference/day; show count + progress ("3 of 12"). Deep-linked from Field F8 nudge.
  - **Realtime:** Supabase subscription on `encounters` (link_state changes) so the queue updates
    live across devices (hotel phone ↔ office desktop).
  - **Empty state:** "All caught up — records are clean."

- **R2 · Resolve card** (`ResolveCard`, one-at-a-time, keyboard-driven).
  - **Load `getResolveContext(encounterId)`** (server): the pending encounter (fields + transcript
    + **signed audio URL** for playback) · the candidate contact(s) full data · **provenance** ·
    a **richer re-run of the matcher** (Sonnet, more context, no time pressure — see §3).
  - **Layout:** new capture ⟷ candidate(s) side-by-side; **LinkedIn photos/titles side-by-side**
    (the human-verifiable anchor); engine reasoning + confidence; **audio player** (P2 payoff).
  - **Actions** → `resolveEncounter(encounterId, action, payload)`:
    - **Match** → `contact_id = chosen; link_state='confirmed'`; update contact latest
      title/company + fill `linkedin_url`/`email` if missing; **invalidate `arc_cache`**.
    - **New** → create `contacts` from `identity_snapshot`; link; confirmed.
    - **Loop in teammate** (cross-rep) → link to the **shared** contact + insert a `notifications`
      row for the colleague. (Shared pool → contact already visible to both.)
    - **Defer** → leave pending (rare).
  - **Optimistic UI:** advance to the next card immediately; reconcile the write in the background.
  - **Keyboard:** e.g. `Y`=match top candidate · `N`=new · `S`=defer · `←/→` navigate.

- **R3 · Proactive duplicate sweep** — ⏸ DEFERRED (foundation §10).

---

## 3. Matching re-run (richer than the floor)
Reuse `lib/matching/adjudicateMatch` with **model = Sonnet** (vs Haiku on the floor) and the full
candidate context (entire encounter histories, not a summary). No latency constraint here, so we
spend more compute for a more confident call. Same Zod `matchOutput` contract as Field — only the
model + thresholds differ. This is the "re-run richer" the product plan promises.

---

## 4. Data-integrity invariants (P1 — this is the strict surface)
- The commit is the **one place** a `pending → confirmed` transition happens. Do it in a **single
  transaction** (set `contact_id` + `link_state`, and if New, create the contact) so a partial
  write can't leave an orphan/half-linked record.
- **Provenance preserved:** the encounter keeps its `identity_snapshot` (job-change history) and
  `provenance` after linking — confirming a match doesn't rewrite history.
- **Cross-rep never silently merges:** linking to a colleague's contact is an explicit human action
  here (never automatic), per foundation §7 + P1.
- `arc_cache` invalidation on any link change so briefings/relationship views recompute.

---

## 5. Server endpoints / actions
- `getReconcileQueue({ repId?, teamId })` → pending encounters + candidate previews + counts.
- `getResolveContext(encounterId)` → full context + signed audio URL + Sonnet re-run match.
- `resolveEncounter(encounterId, action, payload)` → atomic write (§4) + cache invalidation +
  optional notification.
All server-side, Zod-validated, Supabase service role.

---

## 6. Device / responsive
Same components, responsive. Desktop = side-by-side compare (rich). Mobile (hotel) = stacked card,
swipe/tap to resolve the obvious, leave hard ones for desktop. Audio playback needs network (signed
URL) — fine, Reconcile is a calm/online moment.

---

## 7. Build sequencing within Reconcile
1. **Queue list** — render pending encounters (reuses data already written by Field).
2. **Resolve card read-side** — load context + audio playback + candidate compare.
3. **Resolve actions (write-side)** — Match/New atomic commits + arc_cache invalidation.
4. **Richer re-run** (Sonnet) wired into the card.
5. **Cross-rep loop-in + notifications.**
6. **Keyboard shortcuts, realtime, mobile responsive, empty state.**
> Field must exist first (it produces the pending rows). Reconcile is thin once Field's data +
> matching engine are in place — most of this is wiring, not new machinery.

## 8. QA checklist (Reconcile)
Pending items appear + grouped + counted · audio plays · LinkedIn side-by-side renders · Sonnet
re-run shows richer reasoning · Match writes are atomic (no half-links) · arc_cache invalidates
(briefing updates) · cross-rep links to the shared contact + notifies · Defer keeps pending ·
realtime updates across devices · empty state when clean.
