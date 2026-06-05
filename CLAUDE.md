# Grain Take-Home: Conference Intelligence Tool — "Lanyard"

This repository is a take-home assignment for a **Sales AI Builder** role at **Grain**.
The three blocks below — the company, the role, and the assignment — are the source of truth
for every decision in this project and are reproduced **verbatim** as originally provided.
They live here in CLAUDE.md (not a side file) because they are core to every prompt.

**Product name: Lanyard.** See `.claude/JOURNAL.md` for the running decision log, and `plans/`
for the product & tech plans.

## PLANS — `plans/` directory

The product is **one app with three experiences**: FIELD (in-field capture), RECONCILE
(turning "maybes" into confident records), and PLANNING (conference strategy hub).

```
plans/
  00-foundation.md     ← SHARED product context: vision, principles (P1,P2), spine, 3-experience
                          architecture, data model, matching engine, capture-vs-commit. Read first.
  product/{1-field,2-reconcile,3-planning}.md   ← per-experience product plans (the WHAT)
  tech/00-tech-foundation.md                     ← SHARED stack: Next/Vercel, Supabase, Claude+Whisper
                                                    via AI SDK, schema, interfaces, deployment
  tech/{1-field,2-reconcile,3-planning}.md       ← per-experience tech plans (the HOW)
```

**Pipeline:** all product plans → all tech plans → build each (Field → Reconcile → Planning).
All product + tech plans are **COMPLETE**. Keep product (what/why) separate from tech (how).

**Currently in: BUILD phase — Opus core COMPLETE, now on Sonnet (high-volume build + QA).**

✅ **DONE (Opus core, `npx tsc --noEmit` clean):** scaffold (Next 16 App Router + Tailwind 4),
full schema (`supabase/migrations/0001_init.sql`), and the type-checked engine in `lib/`:
`types.ts` · `db/{admin,server,browser}` · `config/{crypto,getServiceKey}` ·
`ai/{models,icp,schemas,parseCapture,summarizeArc,transcribe}` · `matching/` · `capture/processCapture`
· `offline/queue` · `enrichment/`. Stack: Supabase + Claude/Whisper via **AI SDK v6** (use
`generateText` + `Output.object`; `generateObject` is deprecated) + Zod 4. `parseCapture` is the
AI-module EXEMPLAR — copy its pattern for new AI calls.

⏭️ **SONNET — build from here** (verify library APIs vs official docs as you go):
1. **Supabase setup:** create a project; put URL + anon + service-role keys in `.env` (template in
   `.env.example`); apply `supabase/migrations/0001_init.sql`; create a private `recordings` storage
   bucket; wire Supabase Auth + seed a rep/team row.
2. **Field screens F1–F8** + server actions (`commitEncounter`, `searchPeople`, `getBriefing`,
   `runMatch`) + the offline **sync manager** (drain `lib/offline/queue` → `lib/capture/processCapture`).
   Build the **manual capture path FIRST**, then layer voice → AI → offline (`plans/tech/1-field.md` §9).
3. **Settings UI** (encrypted service keys, masked). Then **Reconcile** + **Planning** experiences.
   **Conference seed data** (T2, `plans/tech/3-planning.md` §2). Then **QA**.

Build order per `plans/tech/1-field.md` §9. **Repo:** github.com/shaiaviv/lanyard (public).
Note: project folder is `lanyard` (renamed from `grain`).

---

## THE JOURNAL — `.claude/JOURNAL.md` — read it first, every session

**Purpose:** A running, append-only **decision log** covering the entire lifecycle of this
project — every meaningful step, decision, and reversal, with the reasoning behind it. We mine
it later for the required 5–10 minute video walkthrough (scoring logic, cross-conference design,
and the "how I used AI" story), and it lets us switch models/sessions without losing the thread.
**At the start of every session, read `.claude/JOURNAL.md` to recover where we are.**

**APPEND OFTEN — bias strongly toward logging.** Document frequently, even on small prompts,
decisions, or passing thoughts. A crisp 1–2 sentence note is often enough. When in doubt, log it.

**Two entry sizes:**
- **Micro-entry** (default for small stuff): a single timestamped line under the current full
  entry, e.g. `- [HH:MM] Chose X over Y because Z.` Cheap to write — use liberally.
- **Full entry** (substantial decisions / phase changes): a numbered `## Entry NNN` section
  answering: What did we decide? What were the alternatives? Why this one? What did we choose NOT
  to do?

**Worth a quick note:** any decision big or small · a reversal · a thought/idea/hunch · a
dead-end ruled out · model switches (Opus ↔ Sonnet) · a shipped component/milestone · a notable
AI-collaboration moment · anything the user emphasizes.

**HOW to write:** Append, never rewrite history (reversals get a NEW note referencing the old).
Number full entries sequentially, newest at the bottom. Keep it short.

## MODEL STRATEGY — optimize AI credits

- **Opus** (expensive, best reasoning): open-ended planning, brainstorming, research, scoring
  methodology, architecture, and the pattern-setting core of the build.
- **Sonnet** (cheaper, fast): execution — high-volume screens/CRUD/wiring + QA/refinement.
- **Handoff point:** when work stops being "what should we build and why" and becomes "implement
  the agreed plan / volume." Log the switch in the journal. (Model is switched by the USER via
  `/model` — the assistant can't self-switch.)

## Working norms
- Keep scope tight. Shipping something end-to-end beats half-building everything (a grading
  criterion). Never hardcode API keys — service keys are user-configurable via in-app Settings
  (encrypted, server-side only); only infra keys live in env. Favor simple deployment a non-dev
  could host/update.

---

# 1. ABOUT THE JOB (the role)

## Role Overview

We're hiring a Sales Intelligence & AI Specialist to supercharge Grain's Sales and Business
Development teams with AI.

This role sits at the intersection of revenue, research, and AI tooling. Your mission is to help
our commercial team move faster and smarter - by finding the right leads, delivering high-quality
sales intelligence, and building AI-powered workflows that create measurable business impact.

We're looking for someone hungry, curious, AI-native, and highly execution-oriented. Someone who
learns new tools fast, experiments constantly, and ships quickly.

## Responsibilities

**Lead Generation & Outbound**
- Source and qualify high-fit prospects across Grain's target segments: software platforms,
  marketplaces, neobanks, payments, and travel.
- Build AI-powered outbound workflows including audience enrichment, personalized outreach, and
  automated follow-ups.
- Deliver warm, well-qualified leads to Sales and BD teams.

**Sales Enablement & Research**
- Prepare AI-generated pre-meeting briefs covering company background, contacts, recent news, and
  strategic angles.
- Build target-account plans for conferences and industry events (Money20/20, Web Summit, ITB, etc.).
- Maintain structured account and contact intelligence within HubSpot and related tools.
- Run focused research sprints on verticals, competitors, ICPs, and market trends.

**AI Tooling & Automation**
- Build and continuously improve AI workflows, research agents, prompt libraries, and sales
  automations used daily by the commercial team.
- Integrate across tools like HubSpot, Clay, LinkedIn, Gmail, Google Calendar, Granola, and
  OpenAI / Claude APIs.
- Measure impact based on meetings booked, pipeline generated, and time saved.
- Prototype fast, iterate constantly, and manage multiple workstreams simultaneously.

## Qualifications
- Technical, highly curious builders - CS/Engineering graduates or exceptional self-learners.
- AI-native people who actively use tools like ChatGPT, Claude, Gemini, and automation workflows daily.
- Fast learners who enjoy building practical solutions and figuring things out independently.
- Excellent English communication skills - required.

## Advantages
- Startup, SaaS, fintech, growth, research, GTM, or sales experience.
- Familiarity with outbound sales, lead generation, or customer-facing workflows.
- Experience with automation/no-code tools such as Zapier, Make, n8n, Clay, Apollo, or similar.
- Previous high-tech experience.

## Requirements added by the job poster
- 1+ years of work experience with Builders
- 1+ years of work experience with ChatGPT for Web Developers

## About the company

**Grain** — Financial Services • 51-200 employees

Grain is your trusted partner for cross currency management. We offer the only end-to-end embedded
cross currency solution that enables software platforms and marketplaces to eliminate FX risk for
their customers.

Our simple, automated tool enables our partners and their customers to lock rates and move funds
across borders without the hassle of banks and brokers.

---

# 2. THE ASSIGNMENT (verbatim)

## Sales AI Builder — Home Assignment

**Build a Conference Intelligence Tool for Grain's Sales Team**

- Time expectation: 4-6 hours of focused work, completed within 3 days of receiving this brief.
- Format: A working tool, source code, and a short video walkthrough.

### The Business Problem

Grain helps PSPs (payment service providers), travel wholesalers, cross-border payment companies,
and businesses with FX exposure manage currency risk. Our ICP is concentrated in fintech, payments,
and treasury - please keep that in mind throughout.

Conferences are a primary pipeline-generation channel for our sales team. Today, decisions about
which conferences to attend, who covers what, and how leads are captured and followed up are
fragmented across spreadsheets, Slack threads, and individual notebooks. We want a single tool
that helps the team:
- Decide which conferences to prioritize based on ICP fit
- Plan team coverage across the year and spot opportunities to cluster trips
- Execute in the field - capture leads quickly during conferences
- Recognize and act on relationships that develop across multiple conferences
- Sync captured leads back to HubSpot

### What You Need to Build

A working web-based tool that a non-technical salesperson can actually use. It should include:
- **A conference list and filtering view.** Use publicly available information to create a sample
  conference database with relevant fintech, payments, travel, and SaaS industry events (for
  example: Money20/20). Include fields such as conference name, date, location, vertical, and
  estimated audience size, and allow users to filter and explore the list.
- **A scoring or tiering system.** Rank conferences by ICP fit. You decide the methodology and
  defend it in your video - there's no single right answer.
- **A planning view.** Show coverage across the year, where we're under-invested, and where
  multiple events cluster geographically or temporally.
- **A field interface for capturing leads.** Salespeople need to log people they meet while they're
  physically at a conference. Think about what they actually need in their hand on a busy show
  floor - speed and friction matter more than completeness.
- **Cross-conference contact tracking.** When the same person is encountered at multiple
  conferences, the tool should recognize it and surface the pattern. The goal: help the rep judge
  whether a repeat contact is a warming relationship worth closing, or a polite tire-kicker who's
  been listening for a year and never buying. Think about how you'd handle name variations, job
  changes between events, and what the right "nudge" looks like - too aggressive and it's noise,
  too subtle and it's invisible.
- **At least one meaningful AI-powered feature.** Examples: a feature that helps the team find
  conferences they don't already know about, an AI-assisted lead-qualification scorer, auto-drafted
  follow-up emails, a relationship-arc summarizer for cross-conference contacts. Your call - but be
  ready to explain why AI is the right tool for that specific job.
- **A path to push leads into HubSpot.**

### Constraints
- Deployable without a complex build pipeline - we value simplicity. A non-developer should be able
  to host and update this.
- Use any AI tools you want during the build (Claude, Cursor, v0, Copilot, etc.). We want to see
  how you work with AI - that's a core part of this role.
- API keys for any integrations should be configurable by the user, not hardcoded into the source.

### What to Submit
1. A working live URL we can click and use.
2. The source code (GitHub repo or zipped archive).
3. A 5–10 minute video recording walking us through:
   - A live demo of the tool from a salesperson's perspective
   - Your scoring and prioritization logic, and why you chose it
   - How you approached cross-conference contact tracking - including edge cases you considered
   - How you used AI tools to build this and where they helped vs. got in the way
   - What you'd build next if you had another week

### How We'll Evaluate

We're not grading code quality in isolation. A scrappy tool that a salesperson would actually use
beats a beautifully-architected one that misses the point. Specifically:
- **Sales empathy.** Does this feel built for a salesperson, or is it a generic CRUD app?
- **AI judgment.** Is the AI feature genuinely useful, or bolted on?
- **Cross-conference intelligence.** Is the matching robust? Does the signal carry useful
  interpretation, or is it just a count?
- **Shipping instinct.** Did you scope smartly and get something working end-to-end, or build half
  of everything?
- **Communication.** Can you explain trade-offs clearly?

Questions about scope or interpretation are welcome. The way you ask is itself useful information.
