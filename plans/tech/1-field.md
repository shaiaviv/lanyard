# Tech Plan — Experience 1: FIELD

> Implements `../product/1-field.md` on the stack in `./00-tech-foundation.md`. Detailed enough to
> hand to an implementing model (Sonnet). **Verify exact library APIs against current docs at build
> time** (Vercel AI SDK, Supabase, MediaRecorder, IndexedDB). Schemas/interfaces here are
> **contracts to honor**.

---

## 0. What Field is, technically
A **mobile-first PWA** route group (`app/(field)`) that: records voice → runs an async AI pipeline
→ produces a reviewable draft Encounter → commits it. Must work **offline** and **never block on
AI** (optimistic capture). It is the data *producer*; it *informs* (P1 hint side) and defers hard
identity calls to Reconcile.

---

## 1. The capture pipeline (the core)

End-to-end for one capture. **Each stage is independent and resumable; the rep never waits.**

```
[1 RECORD]  MediaRecorder → audio Blob
[2 PERSIST] write to IndexedDB queue immediately {id, audioBlob, conferenceId, repId, occurredAt,
            status:'recorded'}  → rep is free to move on (optimistic)
[3 UPLOAD]  when online: PUT audio → Supabase Storage `recordings/{id}` ; set audio_path
[4 STT]     Whisper(audio) → transcript
[5 PARSE]   Haiku parseCapture(transcript) → {fields + topics + suggestedTemperature + fit + confidencePerField}
[6 ENRICH]  EnrichmentProvider.searchPerson(name,company) → LinkedIn candidates (may be empty)
[7 MATCH]   matching engine (retrieval → Haiku adjudication) → candidates + confidence
[8 DRAFT]   assemble draft Encounter (status:'draft') → surface for REVIEW
[9 REVIEW]  rep verifies (confidence-flagged fields + LinkedIn pick + temperature confirm + match resolve)
[10 COMMIT] write encounter row; link_state confirmed|pending; remove from local queue
```

- **Stages 3–7 run server-side** (a route/server action `processCapture(captureId)`), triggered
  after upload. They're idempotent and retryable (offline → run on reconnect).
- **Stage 5 folds in #4 fit** (one Haiku call returns parse + fit) — cost control (foundation §4).
- **Graceful degradation:** STT/parse fail → keep audio + raw transcript, show manual form
  (edge-case B). Enrich empty → manual LinkedIn (foundation §5 fallback). Offline → stop after [2],
  resume later.

### Voice-parse contract (Haiku, Zod)
```ts
parseCaptureOutput = z.object({
  name, company, title: z.string().nullable(),
  email: z.string().nullable(),
  topics: z.array(z.string()),
  suggestedTemperature: z.enum(['hot','warm','lukewarm','cool','cold']),
  followUp: z.boolean(), reminder: z.string().nullable(),
  fit: z.object({ companyFit: z.enum(['strong','moderate','weak','unclear']),
                  personFit:  z.enum(['strong','moderate','weak','unclear']),
                  tier: z.enum(['strong','moderate','weak','unclear']),
                  score: z.number(), rationale: z.string() }),
  confidencePerField: z.record(z.number())   // field → 0..1, drives review highlighting
})
```
Prompt includes the shared "Grain ICP fit" definition (foundation §5) for the `fit` block.

---

## 2. Offline-first (PWA)  [the dead-wifi premise]

- **Manifest + service worker** (Serwist/Workbox — pick at build; `next-pwa` is less maintained,
  prefer Serwist). SW caches the app shell so Field loads offline.
- **IndexedDB queue** (`lib/offline/queue.ts`, via `idb`): object store `captures`
  `{id, audioBlob, conferenceId, repId, occurredAt, manualFields?, status, draft?, error?}`.
  Status: `recorded → uploading → processing → draft → committed` (+ `error`).
- **Sync manager** (`lib/offline/sync.ts`): on reconnect (`navigator.onLine` / `online` event /
  Background Sync API), drain the queue through stages 3–8. Resumable per stage.
- **Audio is the source of truth (P2):** never discard the Blob until the encounter row + uploaded
  audio are confirmed.
- UI shows per-item state ("pending sync / pending parse") and the **F8 "N unresolved" counter**.

---

## 3. Matching engine (shared; Field is first consumer)
`lib/matching/`. Implements foundation §7.

1. **Retrieval** (`retrieveCandidates`): Postgres query over `contacts` —
   `pg_trgm` similarity on name+company, exact-ish on `linkedin_url`/`email` when present; cap ~10.
   **Zero candidates → skip LLM, return `new`.**
2. **Adjudication** (`adjudicateMatch`, Haiku, Zod):
```ts
matchOutput = z.object({ results: z.array(z.object({
  contactId: z.string(), decision: z.enum(['same','different','unsure']),
  confidence: z.number(), reasoning: z.string(),
  jobChange: z.boolean(), crossRep: z.boolean() })) })
```
3. **Resolve (three-way)** in app logic: highest-confidence `same` + firsthand + high conf →
   auto-Match; medium → prompt; cross-rep or unsure → **pending** (Save-for-later) with
   `match_candidates` stored. Never auto-merge cross-rep (foundation §7, P1).

Field uses this **live** (F3 inline hint). Reconcile re-runs it richer. Same module, different
confidence thresholds + UI.

---

## 4. Briefing (#3) implementation
`lib/ai/summarizeArc.ts` (Sonnet, Zod). Input = a contact's full encounter set (all reps).
```ts
briefingOutput = z.object({
  glance: z.object({ meetings: z.number(), spanMonths: z.number(),
                     verdict: z.enum(['warming','nurturing','tirekicker','cooling','tooearly']) }),
  lastTime, openThreads: z.array(z.string()), howToApproach, suggestedMove: z.string() })
```
- **Glance line is computed deterministically** (count/span/rep-mix) and renders instantly; the AI
  block loads after (graceful degradation if it pends/fails — foundation §3 chip).
- Verdict logic = **progression toward commitment** (prompt instructs: weight topic-specificity +
  next-steps over raw temperature; gate harsh labels by meeting-count+time — "don't judge too
  early").
- Cache result in `contacts.arc_cache`; invalidate on new encounter. Used by F3/F5 (field) and
  C7/C8 (planning) — same module.

---

## 5. Screens → components & data
- **F1 Active-event bar** — resolve active conference by date (today ∈ conference range) or manual
  pick; store in client state; stamp every capture.
- **F2 Capture** — `RecordButton` (MediaRecorder) → `ReviewDraft` form (confidence-highlighted
  fields from `confidencePerField`; `TemperaturePicker` pre-set to `suggestedTemperature`;
  `LinkedInVerify` shows `PersonCandidate[]`, tap to confirm → overwrites garbled fields).
  Manual-form fallback component.
- **F3 Met-before hint** — inline banner from match result; three-way action buttons.
- **F4 My Leads** — query encounters where `conference_id = active AND rep_id = me`, newest first;
  "new vs returning" from `contact_id` presence.
- **F5 Contact card (lite)** — briefing + encounters list + actions (flag, draft email, edit).
- **F6 Follow-up flag** — toggle `follow_up` + reminder.
- **F7 Look up & pre-brief** — search box → `EnrichmentProvider.searchPerson` + contacts query →
  verify → briefing. **Read-only: creates NO encounter** (CQRS, foundation §6).
- **F8 Reconcile nudge** — counter of `link_state='pending'` for my captures; end-of-day toast
  deep-links to `(reconcile)`.

Realtime: subscribe to Supabase changes on `encounters`/`contacts` so the shared team pool updates
live (e.g., a colleague's capture appears).

---

## 6. Server endpoints / actions
- `processCapture(captureId)` — runs pipeline stages 3–8 (upload→draft). Idempotent.
- `commitEncounter(draft)` — writes row, sets link_state, resolves contact (new/match/pending).
- `searchPeople(q)` — enrichment + contacts lookup (F7, LinkedIn verify).
- `getBriefing(contactId)` — cached arc or compute.
- `runMatch(captureFields)` — retrieval + adjudication (also callable from Reconcile).
All server-side; use Supabase service role; validate I/O with Zod.

---

## 7. Key libraries (verify versions at build)
`next`, `@supabase/supabase-js`, `ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai` (Whisper), `zod`,
`idb` (IndexedDB), Serwist (PWA/SW). MediaRecorder + `online` events are web platform APIs.

---

## 8. Edge cases → implementation (maps product §"Field edge cases")
- Offline → queue + resume (§2). · Parse fail → manual fallback, keep audio. · Same-event dup →
  matcher flags an existing same-day encounter → "add / update". · Edit submitted → update row;
  re-run match if identity changed. · Undo → soft-delete (`deleted_at`); orphan contact cleanup. ·
  Wrong identity link → mark pending → Reconcile. · Wrong conference → editable `conference_id`.

---

## 9. Build sequencing within Field (suggested for the implementer)
1. **Scaffold** Next+Supabase+PWA shell; migrations for the schema; auth + a seed rep/team.
2. **Manual capture path first** (no AI): form → `commitEncounter` → My Leads. Proves data flow.
3. **Voice → STT → parse** (online only); confidence-flagged review.
4. **Matching** (retrieval + adjudication) + F3 three-way + pending.
5. **Briefing** (#3) on contact card + glance line.
6. **Enrichment/LinkedIn verify** behind the interface (mock first, then real if key).
7. **Offline-first** (IndexedDB queue + sync) — layer in once the online path works.
8. **F7 pre-brief, F8 nudge, realtime, edge cases.**
> Rationale: each step is demoable; AI and offline are layered onto a working core (de-risks T1 +
> the offline complexity). Build the boring data path before the magic.

## 10. QA checklist (Field)
Capture commits offline & syncs · parse confidence highlights work · LinkedIn verify overwrites
garbled fields · match auto/prompt/pending thresholds behave · cross-rep never auto-merges ·
briefing glance renders without AI · pending counter + nudge deep-link · never lose a lead (audio
retained through failures).
