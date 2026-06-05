# Product Plan — Experience 1: FIELD (the in-field tool)

> Reads on `../00-foundation.md` (vision, P1, data model, matching engine §7, capture-vs-commit
> §8). This doc = the **FIELD** experience only: how the rep captures and gets in-the-moment
> intelligence on a busy show floor. **Status: ✅ COMPLETE (product plan).**

**User · device · ethos:** rep with a phone, ~30s between conversations, busy show floor.
Thumb-friendly, minimal typing, forgiving of sparse input, AI fills the gaps. Every capture is
auto-stamped `rep = you`, `date = now`, `conference = active event`. This is the data
**producer** + the *inform* side of P1 (generous with hints).

---

## Screens / jobs-to-be-done

- **F1 · Active-event context bar.** App knows which conference you're at (auto from date, or
  one-tap switch). Persistent banner: "📍 You're at: Money20/20 Europe." Removes the #1 source of
  friction (re-tagging every lead). Everything captured inherits this context.

- **F2 · Fast Capture (the hero screen) — VOICE-FIRST golden flow.**  [DECIDED]
  Primary flow is a big **record button**: rep talks ("Met Sarah from Adyen, wants FX hedging for
  travel merchants, hot, follow up next week"), AI transcribes + parses into a structured form
  (name, company, title, note, temperature), rep does a **fast review**, submit. Manual
  quick-form always one tap away as fallback. (Card-photo OCR + QR/LinkedIn parked — foundation
  §10.)

  Three behaviors make voice feel magic instead of frustrating (the real spec):
  1. **Confidence-flagged review, not a re-read.** AI fills the form *and highlights its own
     low-confidence fields*. The rep's eye goes to the one risky field, taps confirm — review is
     a *glance*, not a *read*. (Driven by `confidencePerField` in the voice-parse schema.)
  2. **Names/companies lean on the matcher.** ASR mangles proper nouns ("Adyen"→"AD in") — but
     those are exactly the fields the cross-conference matcher (foundation §7) normalizes (a
     transcription error is just another name variation). The hardest feature defends the input.
  3. **Optimistic / async — never block on AI.** Record → save audio locally → parse in the
     background (or when wifi returns) → rep moves on immediately. Handles dead show-floor wifi;
     softens loud-room risk (bad parse degrades gracefully into the review step).

  **Voice-parse schema** (AI output): `{ name, company, title, email?, topics[],
  suggestedTemperature, followUp, reminder?, rawTranscript, confidencePerField }`.
  `suggestedTemperature` is **AI-suggested, rep-confirms** (silent pre-select per privacy norm).

  **LinkedIn verify step (identity anchor).** The rep won't type a URL — instead, from the
  parsed name+company the system **surfaces likely LinkedIn profile(s)** (photo + name + title)
  and the rep taps the right one to confirm. That one tap does three jobs at once: (1) *verifies*
  the parse caught the right person, (2) *locks* the strongest identity key (foundation §6/§7),
  (3) *auto-corrects ASR mangling* — confirmed profile fields overwrite garbled ones
  ("AD in" → "Adyen, Treasury Lead"). Preferred but NOT mandatory — capture proceeds on
  name+company if no clean match. (Profile lookup depends on an enrichment provider — e.g.
  Clay/Apollo — a tech-plan choice.)

  UX norm: **"capture as you walk away."** Don't make the rep narrate a cold/tire-kicker verdict
  while the person is in earshot; spoken part stays neutral, temperature is a silent tap.

- **F3 · "Met before?" live hint + three-way resolve.** *The field-side of the signature
  feature* and the *inform* half of P1. Uses the matching engine (foundation §7). If the capture
  likely matches an existing Contact, surface inline:
  "⚠️ Possibly Sarah Chen, Adyen — met at Money20/20 EU (Jun '25) + Web Summit (Nov '25)."
  Resolution is **three-way** by confidence:
  - **High + firsthand** (your own repeat) → auto-**Match**, show "🔗 Nth meeting" (undoable).
  - **Medium** → prompt "Is this Sarah Chen from Money20/20 EU? [Yes / No / **Save for later**]",
    with the engine's reasoning shown.
  - **Low** → **New contact** (still saved — never lose a lead).
  - **Unsure / can't vouch** → **Save for later** → into the Reconcile holding pen.
  **Cross-rep matches NEVER auto-merge — they inform.** If the prior encounter is a colleague's
  (e.g. Marco), surface it richly ("Marco logged a 'maybe' here at Money20/20") so the rep can
  act — even ask the prospect directly — but linking happens only in Reconcile. Show confidence
  honestly (weakest link; don't launder a "maybe" into a confident "Nth meeting").

- **F4 · My Leads (this event).** Running list of who you've captured today, newest first.
  Prevents double-logging; tap to edit/enrich. Shows temperature + "new vs. returning" tag.

- **F5 · Contact card (lite).** Tap a lead → AI relationship-arc summary (1 paragraph), past
  encounters list, quick actions: flag follow-up · draft follow-up email · edit.

- **F6 · Follow-up flag.** One tap adds to the shared follow-up queue (worked later here or in
  Planning). Optional one-line reminder.

- **F7 · Look up & pre-brief (proactive flow — first-class).** *Read-only; does NOT create an
  Encounter (CQRS, foundation §6).* Rep sees a badge / hears a name → searches name+company →
  system surfaces likely **LinkedIn profile(s)** to verify by photo/title → rep gets the
  **briefing** (#3) *before* walking up. Serves the "catch up in 3 seconds before I engage"
  moment. Two cases: **known contact** → show our relationship briefing; **unknown** → optional
  light cold pre-brief from public info (stretch). The same briefing also appears *reactively*
  after a capture reveals a repeat. Both flows are critical and both supported.

- **F8 · Save-for-later + end-of-day reconcile nudge.** F3 always offers **Save for later** for
  anything the rep can't confidently resolve on the floor (esp. cross-rep "maybes"). A small "N
  unresolved" indicator shows the pending count; an end-of-day nudge ("You have 6 unresolved
  contacts from Money20/20 — reconcile now?") deep-links into the Reconcile experience. Keeps the
  field fast while protecting data quality.

---

## Field micro-briefing + embedded verdict (relationship intelligence, #3)  [DECIDED]

**Reframe (key decision):** the chip's PRIMARY job is to **catch the rep up instantly** on a
returning contact they've bumped into unexpectedly — *who is this, what's been discussed, how do
I pick the conversation back up* — in seconds, no prep time. The warming/tire-kicker **verdict is
embedded as one line**, not the headline. This is the *in-the-moment* version of the job's
"AI-generated pre-meeting brief," and the field manifestation of our headline AI feature (the
relationship-arc summarizer). The show floor is *ambush territory*: ~3 seconds to not look lost.

**Why briefing-first beats verdict-first:** it shifts the feature from *evaluative* (serves the
manager: "how good is this lead?") to *enabling* (serves the rep: "help me win the next 60
seconds"). Higher sales empathy. It also dissolves the nudge-noise problem — a briefing is
*information*, always welcome, so it doesn't nag like a pushed judgment does.

**Layered so it's glanceable but expandable:**
- **Glance line (always):** `Sarah Chen · Adyen · 3rd meeting (you 2×, Marco 1×) · 🌱 warming`
  (factual badge is deterministic/instant/free; renders even if the AI call pends/fails →
  graceful degradation.)
- **Tap to expand — the catch-up (AI):**
  - *Last time:* most recent encounter — when, which conf, which rep, what was discussed.
  - *Open threads:* unresolved asks / promises ("wanted a pricing example; never got a pilot").
  - *How to approach:* their style + interests → what to lead with.
  - *Suggested move:* the embedded verdict's recommended next step.
  - Folds in **all reps'** encounters (shared team memory) — catch up on the *team's* relationship.

**The embedded verdict — logic [DECIDED]:** distinguish states by **progression toward
commitment** (topic specificity deepening + concrete next steps taken), NOT raw temperature —
*"measure movement, not mood."* A perpetually-warm contact who never advances = tire-kicker.

| State | Means | Suggested move |
|---|---|---|
| 🌱 Warming → close | rising engagement + concrete progression | push for next step / pilot |
| 🤝 Nurturing | genuine, steady, still early | keep delivering value |
| ♻️ Tire-kicker | many meetings / long time, warm-but-flat, no next step | qualify hard or deprioritize |
| 🧊 Cooling | engagement declining | re-engage deliberately or let go |
| ⏳ Too early | 1–2 touches | just show facts, no verdict |

**Don't judge too early:** the harsher labels (tire-kicker/cooling) require *repetition over
time* — meeting count + elapsed time gate them. A 2nd warm meeting is "Nurturing," not a flag.

---

## Lead-qualification AI at capture (#4)  [DECIDED]

At capture, score **how good a prospect they are for Grain** — their **fit** — from who they are
+ what was said. A *different axis* from temperature: temperature = *their* interest (rep
witnessed it); fit = *our* ICP assessment (we infer it). They come apart constantly (hot lead at
a no-FX company = dead end; lukewarm ideal-ICP contact = worth patience), so we keep both.

**Why AI (not bolted-on):** judging fit from a sparse note needs *world knowledge + inference* —
knowing "Adyen" is a payments co. with FX exposure, "treasury lead" is decision-relevant,
"travel merchants" implies multi-currency needs. Rules can't encode every company; the LLM can.

**Structure — two dimensions (company × person)** [DECIDED]:
- **Company fit** — is the *org* an ICP? Grain ICP = fintech / payments / treasury with FX
  exposure (PSPs, platforms/marketplaces with international flows, cross-border payment firms,
  travel wholesalers).
- **Person fit** — does *this contact* own/influence the FX/treasury/payments decision? (Head of
  Payments / VP Treasury / CFO = strong; junior = weak.)
- Both surfaced (not just a blended number) — catches "great company, wrong contact" and vice-versa.

**Output:** tiers **Strong / Moderate / Weak / Unclear** (glance) + 1-line why + sub-dimensions on
expand; numeric score under the hood for sorting. **Unclear** when the note is too sparse — never
fake a confident score (P1: frame a guess as a guess).

**Who sets it [DECIDED]: AI computes, optional override.** Unlike temperature (rep *witnessed* →
rep confirms), fit is an *inference* → AI owns it, with an override for the rare misjudge. Keeps
capture fast.

**P1 placement:** fit is a **soft, recomputable hint**, not a committed fact — refines as we learn
more (enrichment, more encounters). Hint side of P1.

**The payoff — fit × temperature prioritization 2×2:**
|  | 🔥 Hot | ❄️ Cold |
|---|---|---|
| **⭐ Strong fit** | Chase hard (priority) | Nurture — ideal customer, not ready; don't drop |
| **Weak fit** | Be polite, don't over-invest | Deprioritize |

Drives *where the rep spends energy* — turns a score into a decision aid. Used in My Leads (F4)
sorting and Planning's follow-up prioritization.

**Shared ICP definition (DRY):** #4 is the per-contact cousin of the conference ICP scorer
(Planning C4). Both reuse **one shared definition of "Grain ICP fit"** so a conference and the
leads met there are judged by the same yardstick. Detailed criteria designed with Planning's
scoring methodology; foundation holds the shared concept.

**Credit/latency:** fold fit-scoring into the *same* LLM call as parse (one prompt: fields +
topics + suggested temperature + fit) → near-zero added cost. Obscure-company fit may need
enrichment (Clay/Apollo) — tech-plan dependency.

---

## Field-specific resolved sub-decisions
- **Capture input** — ✅ Voice-first golden flow + manual fallback; card-photo/QR parked.
- **Temperature** — ✅ 5-point warmth ladder, AI-suggested + rep-confirms (data model in
  foundation §6).
- **Design considerations** — show-floor wifi unreliable → solved by F2 optimistic/async;
  multi-rep shared pool → confirm in tech plan; voice privacy → "capture as you walk away."

## Field edge cases & states  [DECIDED — some deferred to tech/parking]

**A. Offline & sync (show-floor wifi is unreliable).**
- Capture works **fully offline**: audio (P2) + any manual fields saved locally. The AI steps
  (parse / match / enrich / brief) **queue** and run on reconnect. Clear "pending sync / pending
  parse" indicators. Nothing is ever lost.
- Offline submit → Encounter saved; AI-derived parts deferred; identity link defaults to
  **pending** until match can run (→ may land in Reconcile). Briefing offline → cached if
  available, else "unavailable offline."

**B. Capture quality.**
- Parse fails / gibberish / silence → keep the audio, show raw transcript + manual form; never
  block. Rep fills manually.
- Very sparse note → Unclear fit + weak identity → New contact or Save-for-later.
- Accidental / over-long recording → length cap + easy discard.

**C. Same-event duplicates.**
- Logging someone already captured today (rep forgot) → detected via matcher / My Leads →
  offer **"add another encounter"** (supported — multiple per conf) vs **"update the earlier
  one."** Default: add a new Encounter (each real meeting counts; feeds the briefing).

**D. Edit & undo.**
- **Edit a submitted capture** (note / temperature / fit-override / follow-up / identity) →
  allowed; if identity fields change materially → **re-run match**. Edits tracked; the audio
  stays as the source (P2).
- **Undo / delete** a recent capture (mis-tap, wrong person) → soft-delete; if it created an
  **orphan Contact** (no other encounters) → clean it up.

**E. Identity correction.**
- Wrong match/LinkedIn link → re-open identity → route to **Reconcile** to re-link (don't
  fix-by-guess on the floor — P1).
- Wrong active-conference tag → allow **re-assigning** an Encounter's conference.

**F. Briefing / lookup.**
- Pre-brief finds multiple same-name candidates → disambiguate by **LinkedIn photo / company**.
- Contact has only a colleague's encounters → briefing shows with **provenance** ("based on
  Marco's notes").

**Parking / tech-deferred:** multi-person per recording (MVP = single; AI may flag "log a 2nd?");
audio retention & privacy policy; storing raw enrichment responses.

---

## ✅ FIELD product plan — COMPLETE
1. ✅ #1 capture data model · #2 matching · #3 micro-briefing+verdict · #4 lead-qual
2. ✅ Voice flow, LinkedIn identity anchor, both briefing flows, edge-case sweep
(All three product plans complete — next phase is tech plans.)
