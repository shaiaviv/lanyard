# Tech Foundation — shared stack for ALL experiences

> App-wide technical decisions. All three tech plans (`tech/1-field`, `2-reconcile`, `3-planning`)
> inherit this — don't re-decide the stack per experience. Builds on the product foundation
> (`../00-foundation.md`). **Status: DECIDED (stack); schema PROPOSED.**

> **Method note for the implementer (Sonnet):** this doc fixes *architecture, schema, interfaces,
> and data flows*. It does NOT pin library code — the libraries below move fast, so **verify exact
> APIs against current docs at implementation time.** Key docs: Vercel AI SDK
> (https://sdk.vercel.ai/docs), Supabase (https://supabase.com/docs), Next.js App Router
> (https://nextjs.org/docs). Treat TS/SQL sketches here as **contracts to honor**, not final code.

---

## 1. Stack  [DECIDED]

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | one repo, mobile-friendly, route groups for the 3 experiences |
| Host | **Vercel** | `git push` deploys; non-dev can host/update (brief constraint) |
| Field delivery | **PWA** (installable, offline-first) | honors dead-wifi capture design |
| DB + Auth + Storage + Realtime | **Supabase** | one service closes T3 (team auth) + P2 (audio) + shared-memory realtime |
| AI — LLM | **Claude via Vercel AI SDK** (`@ai-sdk/anthropic`) | Haiku = cheap/high-volume (parse, match, fit); Sonnet = rich (briefing, discovery, emails) |
| AI — speech-to-text | **OpenAI Whisper** | best-in-class STT; Claude has no STT |
| Validation | **Zod** | schemas double as AI structured-output contracts + runtime validation |
| Keys | **in-app Settings (primary) + env for infra only** | user-configurable, never hardcoded (brief constraint) |

**One app, three route groups:** `app/(field)`, `app/(reconcile)`, `app/(planning)`, sharing
`lib/` and `components/`. Field group is the PWA surface (mobile-first); the others are desktop-first.

---

## 2. Database schema (Postgres / Supabase)  [PROPOSED]

Maps the product data model (`../00-foundation.md` §6). Enums + key columns shown; timestamps
(`created_at`, `updated_at`) implied on all.

```sql
-- team members (1:1 with Supabase auth.users)
reps(id pk, auth_user_id uuid →auth.users, name, email, team_id)

conferences(id pk, name, start_date, end_date, location, country, region,
            verticals text[], est_audience int,
            icp_score int, tier text,            -- 'T1'|'T2'|'T3'
            score_breakdown jsonb,                -- per-factor scores + AI rationale (C4)
            source text)                          -- 'seed' | 'discovery'

contacts(id pk,
         linkedin_url text,                       -- primary identity anchor when present (foundation §6)
         canonical_name, current_company, current_title, email,
         arc_cache jsonb)                         -- cached relationship-arc summary + verdict (#3)

encounters(id pk,
           contact_id fk→contacts NULL,           -- NULL while pending/new; set on confirm
           conference_id fk→conferences,
           rep_id fk→reps,
           occurred_at timestamptz,
           audio_path text,                        -- Supabase Storage key (P2)
           transcript text,                        -- Whisper output
           note text,
           temperature text,                       -- 'hot'|'warm'|'lukewarm'|'cool'|'cold'
           topics text[],
           fit jsonb,                               -- {companyFit, personFit, tier, score, rationale} (#4)
           follow_up bool, reminder text,
           link_state text,                         -- 'pending' | 'confirmed'
           match_candidates jsonb,                  -- [{contactId, confidence, reasoning, crossRep}] for pending
           identity_snapshot jsonb,                 -- {name, company, title, email, linkedin} as-told-at-event
           provenance jsonb)                        -- who logged, confidence, source

coverage(id pk, rep_id fk, conference_id fk, status text)  -- 'considering'|'committed'|'attended'|'declined'
```

**Indexes for matching retrieval (foundation §7):** `pg_trgm` GIN on `contacts.canonical_name`
and `contacts.current_company` (fuzzy); optional `pgvector` embedding column for semantic
candidate retrieval (stretch). `contacts.linkedin_url` unique-ish (the strong key).

**Follow-ups** are not a separate table — derived from `encounters.follow_up = true` (+ reminder).

---

## 3. Auth & team model (T3)  [DECIDED — default]

- **Supabase Auth** (email/OAuth). Each user ↔ a `reps` row.
- **v1 = one shared team/org pool:** all reps see all contacts/encounters/conferences (this IS the
  "shared team memory" feature). `team_id` column present for future multi-team, but v1 assumes one.
- **RLS:** authenticated users read/write rows in their team. Service-role key used only in
  server-side AI pipeline routes.

---

## 4. AI layer  [DECIDED]

All LLM calls go through the **Vercel AI SDK** with **Zod schemas** for structured output
(`generateObject`-style). Model tiers:
- **Haiku (cheap, high-volume):** voice-parse (+ folded lead-qual fit), match adjudication.
- **Sonnet (rich, lower-volume):** relationship briefing/arc (#3), conference discovery (C5),
  follow-up email drafting (C9), conference ICP factor estimation (C4).
- **Whisper (OpenAI):** audio → transcript.

**Shared AI modules** (`lib/ai/`): `parseCapture`, `matchContact`, `scoreFit` (may fold into
parse), `summarizeArc`, `draftFollowup`, `discoverConferences`, `scoreConference`. Each: typed
input → Zod-validated output. Keep prompts in `lib/ai/prompts/`.

**Keys:** **in-app Settings is the primary source** for service keys (Anthropic, OpenAI/Whisper,
enrichment, HubSpot) — see §6. AI modules read keys via a server-side `getServiceKey(name)` helper
(Settings store first, env fallback). Never hardcoded; never sent to the client.

---

## 5. Enrichment provider (T1 — highest shipping risk)  [DECIDED pattern]

LinkedIn/email lookup is external + risky. **Hide it behind one interface with a mock fallback**
so the whole app works end-to-end (and demos) even with no live provider.

```ts
interface EnrichmentProvider {
  // name+company → candidate people (for LinkedIn verify F2 + pre-brief F7)
  searchPerson(q: { name: string; company?: string }): Promise<PersonCandidate[]>;
}
type PersonCandidate = { linkedinUrl: string; name: string; title?: string;
                         company?: string; photoUrl?: string; email?: string };
```
- **`MockEnrichmentProvider`** (default / no key): returns seeded or empty candidates → UI falls
  back to manual entry. Build + demo never blocked.
- **`RealEnrichmentProvider`** (Clay / Apollo / PDL / Proxycurl): selected when its key is set.
- Provider chosen at runtime from env/Settings. **Field/Pre-brief must degrade gracefully to
  manual** when candidates are empty (foundation: LinkedIn preferred, not mandatory).

---

## 6. Storage, config, deployment

- **Audio (P2):** Supabase Storage bucket `recordings`; key = `audio_path` on the encounter.
  Retention/privacy policy TBD (foundation P2 note).
- **Config/keys — two tiers:**
  - **Infra/bootstrap keys = env vars** (set once at deploy): Supabase URL + anon/service keys, the
    settings-encryption secret. *Can't live in Settings* (chicken-and-egg: the DB's own credentials
    can't be stored in the DB).
  - **Service/integration keys = in-app Settings (PRIMARY)** (C11): Anthropic, OpenAI/Whisper,
    enrichment provider, HubSpot. This is how a non-dev configures the app — paste keys in the UI,
    no dashboard editing.
  - **Secure pattern for Settings keys:** stored **encrypted** in Supabase, **team/app-level**,
    **admin-set** (not per-rep). **Server-side use only** (read via `getServiceKey()`, decrypt in a
    server route, never expose to the browser). UI shows **masked** values + replace + "test
    connection". **First-run:** AI features show "configure API keys in Settings" until set.
    Schema: `app_settings(team_id, key_name, key_ciphertext, updated_by, updated_at)`.
  - `README` documents only the few **env** vars (infra) needed at deploy.
- **Deploy:** Vercel project linked to the repo; `git push` → preview/prod. Supabase project +
  migrations (SQL in `supabase/migrations/`).

---

## 7. Folder structure (proposed)

```
app/
  (field)/...        (reconcile)/...     (planning)/...
  api/ or use server actions for AI pipeline
lib/
  ai/{parseCapture,matchContact,scoreFit,summarizeArc,draftFollowup,...}.ts  prompts/
  db/ (supabase client, queries)   enrichment/ (interface + mock + real)
  matching/ (retrieval + adjudication orchestration)   offline/ (idb queue, sync)
components/   supabase/migrations/   public/ (PWA manifest, sw)
```

---

## 8. Cross-cutting patterns (used by all experiences)
- **Structured AI output** via Zod everywhere (no free-text parsing).
- **Optimistic + async pipeline** (Field capture) — see `1-field.md`.
- **Offline-first** (PWA, IndexedDB queue, sync manager) — see `1-field.md`.
- **Confidence honesty (P1)** + **source retention (P2)** are implementation invariants, not
  optional polish.
