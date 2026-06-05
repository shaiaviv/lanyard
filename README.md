# Lanyard — Conference Intelligence for Grain's Sales Team

> Take-home for the **Sales AI Builder** role at **Grain**. A single web app that turns
> conferences from a scattered, gut-feel expense into a measurable pipeline engine.

**A lanyard holds your badge — your identity on the show floor.** This tool is about that
identity: recognizing who you met, across events, and acting on the relationships that develop.

## The product — one app, three experiences

| Experience | For | Does |
|---|---|---|
| **Field** (mobile, PWA) | the rep on the show floor | voice-first lead capture · "have I met them before?" · in-the-moment relationship briefing |
| **Reconcile** (desktop) | rep/ops, end of day | turn captured "maybes" into high-confidence contact records |
| **Planning** (desktop) | sales lead / ops | ICP-scored conference database · yearly coverage (timeline + map) · cross-conference relationship intelligence · push qualified leads to HubSpot |

Built on two principles: **P1 — be generous with hints, strict with records** (inform freely on
the floor, only commit data you're sure of) and **P2 — keep the source, not just the derivation**
(retain the raw voice recording, not only the AI's parse).

## How it was built (and how I worked with AI)

This repo includes the **full planning + decision trail**, because the role grades *how you work
with AI*:
- [`plans/`](plans/) — product plans (the *what*) and tech plans (the *how*), per experience,
  over a shared [`foundation`](plans/00-foundation.md) / [`tech-foundation`](plans/tech/00-tech-foundation.md).
- [`.claude/JOURNAL.md`](.claude/JOURNAL.md) — an append-only decision log of the entire project:
  every major decision, the alternatives considered, and the reasoning — including a deliberate
  **Opus (planning + hardest core) → Sonnet (high-volume build + QA)** model split to optimize cost.

## Tech stack

Next.js 16 (App Router) · Supabase (Postgres + Auth + Storage + Realtime) · Vercel AI SDK v6 with
**Claude** (Haiku for high-volume parse/match, Sonnet for briefing/scoring/emails) + **Whisper**
for speech-to-text · TypeScript + Zod 4 · PWA (offline-first capture). Deploys on Vercel.

**API keys are user-configurable** (in-app Settings, encrypted) — never hardcoded.

## Status

Planning is complete; the **core engine is built and type-checked** (`lib/`): the async capture
pipeline, cross-conference matching engine, AI modules, encrypted key store, and offline queue.
UI screens, wiring, the other two experiences, conference seed data, and QA are in progress.

## Local setup

```bash
npm install
cp .env.example .env        # fill in Supabase infra vars + a SETTINGS_ENCRYPTION_SECRET
# apply supabase/migrations/0001_init.sql to your Supabase project
npm run dev
```

Service keys (Anthropic, OpenAI, enrichment, HubSpot) are entered in the app's **Settings** page,
not the environment.
