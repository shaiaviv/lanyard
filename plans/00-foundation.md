# Foundation — Lanyard (Grain Conference Intelligence Tool)

> **Product name: Lanyard.** A lanyard holds your badge — your *identity* on the show floor — and
> this product is fundamentally about identity: recognizing who you met, across events. Names the
> world (conferences) and the core (identity) at once.

> **Shared context for ALL plans.** Every per-experience product plan and tech plan builds on
> this. Don't duplicate this content into them — link back here. Tags: **[DECIDED]**,
> **[PROPOSED]** (awaiting confirmation), **[OPEN]** (needs a decision).
> Major decisions also get a `.claude/JOURNAL.md` entry.

> **Planning-phase principle:** We define the *full, no-compromises product vision* first. We do
> NOT cut scope here. Sequencing (what ships first) is a tech-plan / build concern.

---

## 1. Product Vision  [DECIDED]

**One-liner:** A single command center that turns conferences from a scattered, gut-feel expense
into a measurable pipeline engine — helping Grain's sales team decide *where* to show up, capture
*who* they meet without friction, and recognize *which relationships are actually warming* across
a year of events.

**The problem (from the brief):** Today, conference decisions, coverage, lead capture, and
follow-up are fragmented across spreadsheets, Slack threads, and individual notebooks. Nothing
connects the rep on the show floor at Money20/20 to the realization that they've now met this
same person three times and it's time to close.

**The "wow" bar:** Every feature ships at a high polish/usefulness bar — no filler screens.
*Signature story* for the demo: **cross-conference relationship intelligence** (the lead anchor),
everything else built to the same standard.

---

## 2. Core principles  [DECIDED]

North-star principles that settle downstream design arguments. Add as they emerge.

- **P1 · Be generous with hints, strict with records.** Informing the rep and committing to the
  system-of-record are different acts with different stakes, so they get **different confidence
  bars**. *Committing data* (confirmed matches, a contact's encounter history) requires **high**
  confidence — a wrong committed fact is corrosive; once a rep catches the tool lying, they stop
  trusting all of it, and an untrusted sales tool is dead. *Informing on the floor* can run on
  **low/medium** confidence — the payoff is asymmetric: a wrong hint costs ~2 seconds (rep shrugs
  it off), a right hint is a gift. Calibrate the threshold to the *blast radius of being wrong*,
  not one global certainty number. Corollary: always **frame a guess as a guess** ("Marco logged
  a *maybe*…"). *Core to the vision.*

- **P2 · Keep the source, not just the derivation.** Store raw inputs (the voice **recording**,
  the transcript), not only the AI's parsed interpretation. The source is ground truth you can
  replay, re-parse with a better model later, or audit when a derivation looks wrong — you can
  always re-derive from source, never recover source from a lossy derivation. First application:
  retain capture audio on the Encounter, not just the parsed fields. (Tech-plan: storage size +
  retention/privacy policy.)

---

## 3. The Spine — a relationship lifecycle  [DECIDED]

Every feature hangs off one organizing idea: the **lifecycle of a conference-driven
relationship**. This keeps the tool from being seven disconnected screens. Each stage maps
directly to a required component from the brief.

| Stage | What the user does | Required component it satisfies |
|---|---|---|
| **1. Decide** | See all relevant conferences, scored by ICP fit; pick where to invest | Conference list + filtering · Scoring/tiering |
| **2. Plan** | See yearly coverage; spot under-invested gaps and geo/time clusters | Planning view |
| **3. Capture** | On the show floor, log a person in seconds | Field lead-capture interface |
| **4. Track** | Tool recognizes repeat contacts across events; interprets the pattern | Cross-conference contact tracking |
| **5. Act** | Get AI-drafted, context-aware follow-ups / nudges | AI-powered feature |
| **6. Sync** | Push qualified leads into the CRM | Path to HubSpot |

The magic is in the *seams*: a Capture updates Track, which triggers an Act nudge, which Syncs.

---

## 4. One app, three experiences, one data core  [DECIDED — Decision A]

A **single product** — one app, one login, one shared data core — presented as **three
experiences** (pages/modes), each tuned to a different mode of work. NOT separate apps; three
*views* onto the same database (like Gmail's Inbox / Search / Settings). One codebase, one
deploy, one source of truth. All three read/write the same Conferences · Contacts · Encounters ·
Reps, so a change in one is instantly live in the others.

| Experience | User · device | Optimized for | Plan |
|---|---|---|---|
| **FIELD** | rep on the show floor · mobile | capture *speed*, zero friction | `product/1-field.md` |
| **RECONCILE** | rep/ops in a calm moment · desktop (light mobile) | *correctness* — commit high-confidence data | `product/2-reconcile.md` |
| **PLANNING** | sales lead / ops · desktop | *judgment & overview* | `product/3-planning.md` |

Detailed per-experience ethos and screens live in each product plan.

### 4b. Where HubSpot fits — system of engagement → system of record  [DECIDED]

We are **NOT** a CRM and don't duplicate HubSpot. Division of labor:
- **HubSpot = system of record.** The org's central CRM — all contacts/companies/deals/sequences
  /reporting, across every channel. The real pipeline lives here.
- **Our tool = a specialized system of engagement.** Purpose-built for the one context HubSpot
  does badly: the show floor + the cross-conference relationship. We own *conference relationship
  intelligence*.

So we sit **upstream**: capture & qualify in the field → push the **qualified, deduped** leads
**into** HubSpot, where they graduate from "person I met at an event" to "pipeline opportunity."
This is the spine's terminal **Sync** stage, and literally the role's mandate ("deliver warm,
well-qualified leads to Sales & BD").

- **Not a dumb export:** our fit × temperature + relationship arc + reconciliation decide *which*
  leads are worth pushing — a curated handoff, not a data dump that pollutes the CRM.
- **What gets pushed:** Contact (name/company/title/email/LinkedIn) + the **arc summary as a
  note** + fit/temperature as properties + "met at [conference]" context.
- **Direction [DECIDED]: one-way push only** (us → HubSpot). Dedupe against existing HubSpot
  contacts by email on push. Inbound "is this already a customer/open deal?" check → parking lot.
- **Lives in:** Planning (C10) — a deliberate, curated desktop action. API key user-configurable.
- **Scope discipline:** we never model deals/pipelines/reporting — that's HubSpot's job. The
  integration boundary is where we hand off.

---

## 5. AI features — build all  [DECIDED — Decision C]

All four AI capabilities are in the vision. Each must clear the "AI judgment, not bolted-on"
bar — AI is the *right* tool because the job is synthesis/judgment over messy, unstructured
inputs, not something rules do better.

| AI feature | Why AI is right for it | Primary experience |
|---|---|---|
| **Relationship-arc summarizer** *(narrative headline)* | Messy encounter history → "here's where this stands + do this next" verdict | Field (quick verdict) + Planning (full arc) |
| **Auto-drafted follow-up emails** | Context-aware, per-contact, Grain-voice writing | Field + Planning |
| **AI lead-qualification scorer** | Infers fit/intent from sparse, noisy field notes | Field capture + Planning |
| **AI conference discovery** | Open-ended search/judgment to surface unknown ICP-fit events | Planning |

**Shared concept — "Grain ICP fit" [DECIDED, criteria TBD].** One definition of what makes a good
Grain fit (fintech / payments / treasury with FX exposure: PSPs, platforms & marketplaces with
international flows, cross-border payment firms, travel wholesalers) is **reused** by both the
**lead-qualification scorer** (Field #4, per-contact: company × person fit) and the **conference
ICP scorer** (Planning C4, per-event: density/topic/scale/geo/history, hybrid AI-inputs →
transparent tunable formula). Same yardstick for an event and the leads met there. Both follow
the same **hybrid philosophy** (AI estimates fuzzy inputs → transparent logic decides) used by the
matching engine — one coherent stance on where AI belongs vs. deterministic logic.

---

## 6. Shared data model  [PROPOSED]

Core entities:
- **Conference** — name, date(s), location, vertical, est. audience size, ICP score, tier.
- **Contact** — a person (name, title, company, email/LinkedIn) — the *identity* we dedupe.
  Durable; evolves across encounters. Fields: `linkedinUrl` (**primary identity anchor when
  present**), `canonicalName`, `currentCompany`, `currentTitle` (latest known), best-known
  `email`, `encounters[]`, derived relationship arc/status.
  - **LinkedIn = the identity anchor.** Chosen for *verifiability*, not just uniqueness: a rep can
    confirm it at a glance (photo + title + company) against the person in front of them — no
    other identifier is human-verifiable on the floor. De-facto primary key **when present**, but
    NOT mandatory (won't always resolve in seconds: common names, no profile, privacy) → the
    system must still work on name+company without it.
- **Encounter** — the join: "Rep X met Contact Y at Conference Z on date D." The heart of
  cross-conference tracking — a Contact accumulates multiple Encounters. Immutable record of one
  meeting:
  - Auto-stamped: `conference` (= active event), `rep` (= you), `timestamp` (= now)
  - `audioRecording` — the stored raw voice capture (source of truth, P2; retained, not just used)
  - `note` — voice transcript / rich context (the gold for the relationship AI)
  - `temperature` — 5-point warmth ladder (their interest/intent), see below
  - `topics[]` — AI-extracted, e.g. ["FX hedging", "travel merchants"]
  - `followUp` flag + optional `reminder`
  - `leadScore` — derived (our *fit*; distinct from temperature)
  - *identity snapshot*: `name`, `company`, `title`, `email?`, `linkedin?` — what they told you
    *at this event*. A changed title/company vs. a prior encounter is **signal (job change), not
    error** — we keep the snapshot per encounter.
  - `linkState` — `confirmed` | `pending` (see §8 capture-vs-commit). Pending links carry
    candidate suggestion(s) + provenance and don't count toward confident history until resolved.

- **Rep** — a team member: name, etc. Used for attribution (`Encounter.rep`), coverage, and the
  shared team pool. (Team/auth model = tech-plan, see §11/T3.)
- **Coverage** — "Rep R is **assigned to / planning** Conference C." A planned-attendance join,
  **distinct from Encounter** (a planned attendance is not an actual meeting). Powers C3 assign-reps
  and C6 coverage + gap analysis. Lightweight: `rep`, `conference`, `status` (considering /
  committed / attended / declined). *Added in the take-stock review — was a real gap.*

The **Encounter** concept is what makes "met them 3 times" possible — it separates the durable
*person* from each *meeting event*. A Contact can have **multiple Encounters at the same
conference** (meet in the morning, learn more, approach again that afternoon) — nothing limits
Encounters to one-per-conference.

**Read vs. write (CQRS):** *getting a briefing* about someone (querying) and *logging an
Encounter* (commanding) are separate operations. A pre-brief lookup is read-only and must NOT
create an Encounter — only an actual capture does. Keeps the encounter history honest.

**Temperature — 5-point warmth ladder (interest/intent, NOT fit)** [PROPOSED labels]:
| | Level | Meaning |
|---|---|---|
| 🔥 | Hot | Active intent; wants a next step now |
| 🙂 | Warm | Genuine interest; worth nurturing |
| 😐 | Lukewarm | Polite, non-committal, unclear |
| 🥶 | Cool | Low interest / not now |
| ❄️ | Cold | No interest / brush-off |

Richer than 3-point on purpose: gives the cross-conference arc real *trajectory resolution*
(Warm→Warm→Lukewarm→Cool = a cooling tire-kicker). Friction stays low because AI pre-selects and
the rep only confirms.

---

## 7. Shared engine — cross-conference matching  [DECIDED]

The signature feature's engine, used by **Field** (to *inform* on the floor) and **Reconcile**
(to *commit*). Given a new capture, decide whether it's an existing `Contact` or a new person.
Two failure modes shape everything: **false split** (miss a repeat — fails *silently*, the
worst) and **false merge** (fuse two people — embarrassing wrong nudges). The brief wants us to
*catch* repeats, so we lean toward recall but guard merges with confirmation.

**Approach: LLM-first decision, with a cheap retrieval step in front** (retrieval + reasoning):
1. **Candidate retrieval (cheap, deterministic).** Narrow the full contact set to a small
   shortlist (normalized-name fuzzy / phonetic key / optional embedding similarity over
   `name+company+title`). Keeps prompts short, cost bounded. **Zero candidates → no LLM call.**
2. **LLM adjudication (the decision).** Send the new capture + shortlist to a **cheap model
   (Haiku-class)**; returns per candidate a verdict + **confidence** + short reasoning, including
   **job-change detection** (e.g. "VP Treasury @Adyen '24 vs Director @Stripe '25 — same person,
   moved"). Judgment rules can't easily encode.
3. **Three-way resolution (driven by confidence):** **Match / New contact / Save for later.**
   Where this surfaces (live floor prompt vs. holding pen) is experience-specific — see the Field
   and Reconcile plans.

**Signal reliability** (informs retrieval + weighting): **LinkedIn URL** (near-deterministic
match when present, survives job changes, *and* human-verifiable by photo/title) > email > name +
company (common, breaks on job change) > name + topics > name alone. A confirmed LinkedIn match
collapses matching to near-certainty — the strongest lever we have.

**Cross-rep rule:** if a candidate prior encounter belongs to a *different rep*, the engine
**informs but never auto-merges** — see P1 and the Field/Reconcile plans.

**Credit control:** cheap model + short retrieved prompts + skip-on-zero-candidates → a rep
logging dozens of people costs pennies. Latency is hidden by async capture (Field plan).

---

## 8. Shared principle — capture vs. commit  [DECIDED]

**Separate *capture* (fast, in the field) from *commit* (correct, later).** The committed
contact↔encounter graph stays **high-confidence**; uncertainty waits in a holding pen until it
can be resolved honestly. A captured lead is *always saved*; only its *link* to a known Contact
can be provisional (`linkState = pending`). (Staging-vs-committed pattern — like a Drafts folder
/ git staging area.) This dissolves the speed-vs-accuracy tension by putting them in *different
moments*: **Field** = fast & forgiving (capture), **Reconcile** = slow & exact (commit). Embodies
P1.

---

## 9. Global decisions log

- **A — Center of gravity:** ✅ One app, three experiences (Field / Reconcile / Planning) over one
  shared data core.
- **B — Hero / wow:** ✅ Every feature held to a high "wow" bar; cross-conference intelligence is
  the signature demo story.
- **C — AI features:** ✅ Build all four (relationship-arc summarizer is the headline).
- **D — Product name / framing:** ✅ **Lanyard.** Evokes the conference setting *and* the
  product's core (a lanyard holds your identity badge; this tool is about identity across events).
- **E — Build sequencing / what ships first:** [DEFERRED to tech-plan phase]
- **F — Plan/build one experience at a time:** ✅ Order: Field → Reconcile → Planning (matches
  producer→consumer dependency; front-loads the hardest pieces).
- **G — Doc structure:** ✅ `plans/` with this foundation + `product/` and `tech/`, one file per
  experience. Pipeline: all 3 product plans → all 3 tech plans → build each, iterate + QA.

---

## 10. Parking lot / explicitly out of scope (for now)

Deferred so we don't half-build everything. Revisit during tech-plan sequencing.
- Card-photo OCR capture; QR-badge / LinkedIn-paste enrichment (Field capture stretch methods).
- Multi-person-per-recording capture (MVP = single person).
- **Reconcile integrity-hub extras** (deferred from v1, not deleted): proactive duplicate sweep
  over committed records; fixing/re-linking already-confirmed records; merging two existing
  contacts.
- Cold pre-brief / research brief for an *unknown* person (Field F7 stretch).
- **Inbound HubSpot check** — pull customer/deal status to warn "already a customer / open deal —
  don't pitch cold" in the field briefing (needs two-way integration). Compelling future.
- _(add as we make cuts)_

---

## 11. Open threads — tech-plan must-resolve

Surfaced in the take-stock review (after all 3 product plans). The tech plans must address these;
they live across the seams between features, which is why feature-by-feature planning missed them.

- **T1 · Enrichment + web-search dependency (HIGHEST SHIPPING RISK).** Load-bearing for LinkedIn
  profile lookup (F2/F7), email (HubSpot dedupe), and conference discovery (C5) — external data we
  don't own (APIs, auth, cost, LinkedIn ToS). **Design behind an interface with a manual/mock
  fallback** so the product works end-to-end (and demos!) even if live enrichment flakes. The #1
  thing most likely to stall the build.
- **T2 · Conference DB seeding.** The brief wants a sample DB from public info. Upfront build/
  content task: research + populate real events (Money20/20, Web Summit, ITB, …). Decide source,
  count, and fields. Don't discover this at build time.
- **T3 · Multi-rep / team / auth model.** Cross-rep matching, shared team memory, coverage, "loop
  in teammate" all assume a shared team pool. Decide early: default = **one shared team/org pool**
  (all reps see shared contacts/encounters). Confirm auth approach.
- **T4 · Signal presentation (sales-empathy risk).** FOUR distinct scores coexist: per-encounter
  **temperature** (their interest), per-contact **fit** (our ICP), per-contact **arc verdict**
  (Warming/Tire-kicker…), per-conference **ICP tier**. Each justified, but on screen they can
  overwhelm. Design clear visual hierarchy + labels; don't show all four everywhere. This is the
  "built-for-a-salesperson vs. generic CRUD" line.
- **T5 · (minor) Product name** (Decision D) — pick during build/tech.
- Also tracked: audio storage + retention/privacy (P2); follow-up modeled simply as
  `Encounter.followUp` + reminder.
