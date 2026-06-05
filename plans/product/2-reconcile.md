# Product Plan — Experience 2: RECONCILE (the reconciliation area)

> Reads on `../00-foundation.md` (esp. matching engine §7, capture-vs-commit §8, P1, P2). This
> doc = the **RECONCILE** experience only: turning the field's "maybes" into high-confidence
> committed records. **Status: ✅ COMPLETE (product plan).**

**User · device · ethos:** rep/ops in a calm moment — end of day at the hotel, or back at the
office. Optimized for **correctness**. The *commit* half of P1: deliberate, full-context,
trustworthy. First-class on purpose — data integrity is an activity the team *does*, not a chore
hidden in a settings menu.

**Central tension:** Reconcile is where "strict with records" lives, so **care** matters — but if
it's tedious, reps skip it and the pending pile rots. The design goal: make *careful* resolution
*fast* (surface enough evidence to decide confidently in seconds).

---

## Scope  [DECIDED]

- **IN (v1):** resolve **pending field items only** — the floor "Save for later"s (F8), captures
  that went pending offline, and cross-rep "maybes." One-at-a-time inbox.
- **DEFERRED (parking, foundation §10):** proactive duplicate sweep over committed records;
  fixing/re-linking already-confirmed records; merging two existing contacts. These are "nice
  hygiene," not the core resolve loop. *Deferred, not deleted — speak to them as "next."*

---

## What feeds the queue

A focused inbox of *identity decisions*, all `linkState = pending`:
- **Pending matches** — floor save-for-laters + medium-confidence captures not resolved on the spot.
- **Offline-pending** — captures whose matching couldn't run until reconnect.
- **Cross-rep maybes** — a capture that might match a *colleague's* contact (never auto-merged).

---

## Screens / jobs-to-be-done

- **R1 · Reconciliation inbox.** The holding pen: all pending items, with an at-a-glance **count**
  and progress ("3 of 12"). The field **end-of-day nudge** (F8) deep-links straight here. Grouped
  by conference / day. **Empty state:** "All caught up — records are clean." (a satisfying, P1
  moment.)

- **R2 · Resolve card (one-at-a-time, full context).** The core interaction. For each pending
  item, show enough to decide confidently, then advance to the next (keyboard-driven for speed):
  - **The new capture** — note, topics, temperature, identity snapshot, LinkedIn, *and **audio
    playback*** (P2 payoff: unsure what was said? replay the recording).
  - **Candidate contact(s)** — their history/encounters, LinkedIn, and **provenance** (who logged
    what, how sure — a colleague's "maybe" reads as a maybe, P1).
  - **Matching engine's reasoning + confidence** — *re-run richer here* than the time-pressured
    floor pass (more compute/context, no rush).
  - **LinkedIn side-by-side** — the human-verifiable anchor: same photo/title → near-certain.
  - **Outcomes:** **Match** (link → flips `pending → confirmed`) · **New contact** (distinct
    person) · **Loop in teammate** (cross-rep — see below) · **Defer again** (rare; stays pending).

- **R3 · Proactive duplicate sweep.** ⏸ **DEFERRED** (out of v1 scope; foundation §10). Would
  surface unflagged likely-dupes among committed records.

---

## Cross-rep resolution

When the candidate is a *colleague's* contact: the card shows their provenance, and resolving as
**Match** links this encounter to the **shared** contact and **flags/notifies the colleague**
("you both now have history with Sarah Chen"). Exact notify/assign mechanic depends on the
multi-rep model → confirm in tech plan. Principle: cross-rep linking happens *here* (deliberate),
never auto-merged on the floor.

## Device
Desktop-first (rich side-by-side). The one-at-a-time card model also works well on **mobile**
(hotel, end-of-day) — same flow, swipe/tap; the rep can clear the obvious ones and leave the rest
for desktop. (Confirm split in tech plan.)

## Why this surface is mostly *assembly*
Reconcile is where the earlier investments compound: **P1** (this is the "strict" side), **P2**
(audio replay to resolve doubt), and the **shared matching engine** (re-run richer). Little new
machinery — mostly presenting what we already built so a human can make a confident call.

---

## ✅ RECONCILE product plan — COMPLETE
Scope = pending field items, one-at-a-time inbox, evidence-rich resolve card. Deferred: proactive
dupe sweep, confirmed-record fixes, contact merges.
(All three product plans complete — next phase is tech plans.)
