# Interview Prep — Ben Strugo (VP BD), Grain

> Your interview covers two things: (1) a deep dive on the Lanyard take-home, and (2) a general
> "getting to know you." This doc covers both, with exact answers you can rehearse.
> 
> **Core frame for every answer:** You're not presenting code — you're presenting *judgment*.
> Every decision you made was a sales-empathy decision first, a technical decision second.

---

## PART 1: THE ASSIGNMENT — KNOW IT COLD

### 1a. The one-liner you should open with

> "I built Lanyard — a conference intelligence tool with three distinct experiences: a field app
> for reps on the show floor, a reconciliation inbox for turning uncertain matches into confident
> records, and a planning hub for the whole team's conference strategy. The core thesis is that
> every conference interaction sits inside a relationship lifecycle — Decide, Plan, Capture, Track,
> Act, Sync — and the tool's job is to make each stage faster and smarter."

---

### 1b. The scoring methodology — DEFEND IT IN DETAIL

This is explicitly called out in the brief as something you must defend. Know it cold.

**The formula:**
```
ICP Score = weighted average over PRESENT factors (0–100)
Tiers: T1 ≥ 75 (must-attend), T2 ≥ 50 (consider), T3 < 50 (skip)
```

**Five factors (default weights):**
| Factor | Weight | Why this weight |
|--------|--------|-----------------|
| ICP Density | **40%** | How many PSPs / treasury / FX desks are actually in the room. Quality > headcount. |
| Topic Fit | **25%** | Is FX/cross-border payments the primary theme, or a side track? |
| Scale | **15%** | Raw audience size, capped — a 500-person FX-specialist summit beats a 40k generic expo. |
| Geo Relevance | **10%** | EU is Grain's primary market. APAC/MEA weighted lower. |
| Historical Performance | **10%** | Repeat ROI from previous years (redistributed when unknown). |

**Why I designed it this way:**
- The #1 mistake in conference scoring is confusing *scale with fit*. Web Summit has 70k attendees — but ~95% are not Grain's ICP. A 600-person treasury summit where every attendee is a CFO or VP Payments is worth 10x more. ICP Density at 40% reflects this.
- The hybrid design: **AI estimates the fuzzy inputs** (ICP density, topic fit, decision-maker presence — things you can't compute from a spreadsheet), and **a deterministic formula turns them into a score**. This is transparent, auditable, and tunable. A salesperson can drag the sliders and watch the ranking update in real time with zero AI calls.
- The "Unclear/null historical" redistribution: a first-year event isn't penalized. Its 10% historical weight gets redistributed to ICP Density (the most reliable factor). Fair to new events.

**Example answers:**
- Q: "Why is Web Summit a T3?" → "70k attendees sounds impressive, but the ICP density is ~2-3%. Money20/20 Europe with 8k gets 89/100 because the entire room is payment ops, treasury, and PSP decision-makers. Scale without fit is noise, not signal."
- Q: "Why is EuroFinance scored so high?" → "It's the global treasury and FX conference. The attendees are literally corporate treasurers and heads of FX — Grain's exact buyer. Density is nearly 100%."
- Q: "Can a rep change the weights?" → "Yes — live sliders in the UI. Drag Scale from 15% to 50% and every card instantly re-ranks with no AI call. The formula is the source of truth; the AI-estimated breakdown is just its input."

---

### 1c. Cross-conference contact tracking — the most-weighted criterion

This is explicitly the hardest rubric item. Have a complete narrative.

**The core insight:**
> "I separated the durable *person* (Contact) from each *meeting* (Encounter). A Contact accumulates Encounters across conferences — that's what makes 'met them 3 times' representable. Without this split, you can't tell the difference between 3 separate people named Sarah Chen and one Sarah who keeps showing up."

**The matching engine (step by step):**
1. **Candidate retrieval (cheap, deterministic)** — pg_trgm fuzzy search on name+company. Zero candidates = no AI call at all. This keeps cost near-zero at scale.
2. **LLM adjudication (Haiku/cheap model)** — sends new capture + shortlist (not the full DB) to the AI. Returns per-candidate: verdict (same/different/unsure), confidence score, reasoning, and job-change detection.
3. **Three-way resolution by confidence:**
   - High confidence + your own prior encounter → auto-Match (shown as "3rd meeting, undoable")
   - Medium confidence → prompt the rep ("Is this Sarah Chen from Money20/20 EU?")
   - Low / cross-rep / unsure → Save for later → Reconcile inbox

**Edge cases you considered (know these):**

- **Name variations / ASR errors** ("Adyen" → "AD in"): The matcher is designed to absorb this. A transcription error is just another name variation. The fuzzy retrieval catches it; the LLM confirms. And if the rep taps the LinkedIn profile at capture, it overwrites the garbled fields entirely.
- **Job changes between conferences** ("VP Treasury @Adyen '24 → Head of Payments @Stripe '25"): The LLM specifically looks for this pattern. We store an *identity snapshot* on every Encounter — not just on the Contact — so a changed title/company is a *signal*, not a conflict.
- **Cross-rep encounters**: If it was your colleague Marco who met them last, the system *informs* you but *never auto-merges* — it surfaces "Marco logged a maybe here at Money20/20" and leaves the link as pending until a human confirms in Reconcile. Wrong committed data kills trust; a wrong hint is shruggable. This is **P1: be generous with hints, strict with records**.
- **False split vs. false merge**: A false split (silently missing a repeat) is worse than a false merge (embarrassing wrong nudge). So the system leans toward recall — it surfaces more candidates — but guards merges with confirmation. Asymmetric blast radius.

**The relationship arc verdict:**
Five states, gated by *movement* not *mood*:
- 🌱 Warming → concrete progression toward commitment
- 🤝 Nurturing → genuine but early
- ♻️ Tire-kicker → many meetings, warm-but-flat, no next step
- 🧊 Cooling → engagement declining
- ⏳ Too early → 1-2 touches, no judgment yet

*"A perpetually-warm contact who never advances a conversation is a tire-kicker. I measure movement, not mood."*

**The Planning-side view** (Relationships tab):
- Aggregates confirmed encounters per contact
- Detects job changes by diffing identity snapshots across encounters
- Ranks: Warming first, then Tire-kicker at risk, etc.
- Key filter: "Warming · no follow-up" — the killer signal, the rep who's close but hasn't followed up

---

### 1d. The AI features — justify each one

The rubric is explicitly "AI judgment, not bolted-on." Know the WHY for each.

**1. Voice capture → parse + fit scoring (Field)**
- *Why AI is right*: the rep speaks 15 seconds walking away from someone. You can't get a structured record from that with rules. The AI extracts: name, company, title, topics, suggested temperature, lead-fit, follow-up flag — all from unstructured speech. It also flags its own low-confidence fields so the review is a *glance* not a *re-read*.
- *Why not bolted on*: remove it and the core value prop (show-floor capture) doesn't work.

**2. Relationship-arc summarizer (Field briefing + Planning C8)**
- *Why AI is right*: synthesizing 5 encounters across 3 conferences over 18 months into a paragraph — "Last time at Sibos she asked for a pricing example, never got it. She's a VP now. Lead with that." — requires reasoning over messy, variable-length text. Rules can't do this.
- *Why not bolted on*: the value of cross-conference tracking is useless without interpretation. Knowing "3 encounters" is a number. Knowing "warming relationship with an unmet ask" is an insight.

**3. ICP scoring engine — AI estimates factors, formula scores (Planning C4)**
- *Why AI is right*: "What % of Money20/20 attendees are PSPs or platforms with FX exposure?" isn't in a spreadsheet. The LLM knows the conference world and can estimate density, decision-maker presence, and topic alignment from public knowledge.
- *Why not bolted on*: the formula is transparent and tunable by the user (sliders). AI fills the INPUTS it can't know without world knowledge; the LOGIC is fully deterministic. This is the honest use case.

**4. AI Coverage Suggestions (Planning)**
- *Why AI is right*: "Given 6 reps in London/Frankfurt/Singapore/NYC/Dubai, 190 conferences, budget constraints, and the instruction 'prioritize EU treasury', allocate who goes where" is a global optimization over natural-language goals. Deterministic code enforces hard constraints (no double-booking, capacity limits, committed tickets preserved) but the soft optimization (clustering trips, balancing regions, interpreting the instruction) is AI's job.
- *Why not bolted on*: this replaces a multi-hour spreadsheet exercise.

**5. Conference discovery (Planning C5)**
- *Why AI is right*: finding conferences you don't already know about from the fintech/payments world. This is exactly the job description's "AI-generated target-account plans for conferences" task. AI can generate candidates from world knowledge.

---

### 1e. The HubSpot integration — know the positioning

Don't just say "it pushes leads to HubSpot." Know the philosophy.

> "We're not a CRM — we're a system of engagement upstream of one. HubSpot is the system of record; we're the capture and qualification layer. When a rep has met someone three times, the relationship is warming, and the ICP fit is strong — *that's* when we push. Not a data dump. A curated handoff: contact + relationship arc summary as a note + fit/temperature as properties + 'met at [conference]' context. It's the difference between polluting the CRM with every badge scan and delivering warm, pre-qualified relationships."

**Technical detail if asked:**
- Dedupes by email first (search → update if exists, create if not — avoids 409s)
- Arc summary attached as an associated note
- Labeled mock fallback when no HubSpot key configured (so the flow demos without an account)
- Bulk push: "Push all qualified" from the follow-up queue

---

### 1f. The "capture vs. commit" principle — the insight evaluators remember

> "The biggest design decision I made was separating *capture* from *commit*. On a busy show floor, speed wins — so capture is always saved immediately, fully offline if needed. The AI matching runs async. But *committing* a link between this capture and an existing contact in the system of record? That requires high confidence and a human confirmation — either on the floor (high confidence, your own repeat) or in the Reconcile inbox (everything else). Wrong committed data is corrosive. Once a rep catches the tool lying to them, they stop trusting all of it, and an untrusted sales tool is dead. A wrong floor hint? They shrug and move on. Different blast radius, different confidence bar."

---

### 1g. The three-experience architecture — why it matters

> "I didn't build one compromised UI that tries to serve everyone. I built three experiences on one data core:
> - **Field**: mobile-first, one thumb, capture in 30 seconds. Speed over completeness.
> - **Reconcile**: calm, deliberate, hotel/office. Turn uncertain matches into confident records.
> - **Planning**: desktop, full-width, the strategic view. Company-wide coverage, gap analysis, relationship intelligence across all reps.
> One database. One login. But optimized for three very different modes of work. Like Gmail's Inbox vs. Search vs. Settings — same data, three jobs."

---

### 1h. What you'd build next

The brief explicitly asks this. Have a crisp answer.

**Top 3:**
1. **HubSpot inbound pull** — check if a conference lead is already a customer or open deal *before* the rep pitches them cold. Show "⚠️ Existing customer - don't pitch" in the field briefing. Currently it's a one-way push; making it two-way closes the loop.
2. **Email automation** — draft follow-up emails from the relationship arc (contact's open asks, warmth, Grain voice) and push them into Gmail / HubSpot sequences. The content is already there in the arc; connecting the last mile is the remaining friction.
3. **Conference scraping / live enrichment** — instead of manually seeding the conference DB, build a crawler/agent that auto-discovers events, auto-scores them against the ICP, and flags new additions for the team. Continuous intelligence, not a point-in-time seed.

---

## PART 2: THE "GETTING TO KNOW YOU" — BEN AS VP BD

### 2a. Who Ben Strugo is (do your homework)
Ben is VP Business Development at Grain. His world:
- He owns the top of the commercial funnel — partnerships, key accounts, strategic deals
- Conference-driven pipeline is likely a big part of his job
- He'll evaluate you on whether you make his team more effective, not whether you can code
- He's evaluating *how you think about sales workflows*, not just whether the tool works

**What to research before the call:**
- Google "Ben Strugo Grain" + LinkedIn
- Read Grain's recent press/blog for deals or partnerships he might be working on
- Look at Grain's LinkedIn for recent posts — gives you context for how the company talks about itself

---

### 2b. Your narrative — who you are (craft this, know it cold)

The role is "AI-native, execution-oriented, curious builder." Your narrative needs to hit all three.

**Draft narrative (personalize with your real background):**
> "I'm someone who lives at the intersection of AI tools and getting things done — I use Claude, GPT, and no-code automation workflows the same way other people use Excel. For this assignment I didn't just learn the tech; I wrote a decision journal for every choice I made, switching between Opus for planning/architecture and a cheaper model for execution — the same cost/quality tradeoff a sales leader makes when deciding which conferences to attend. The reason I want this role specifically is that it's the first one I've seen that treats AI as a capability multiplier for revenue, not just a product feature. That's how I already think."

**Key themes to weave in naturally:**
- You learn tools by *using them in production*, not tutorials
- You think about ROI/impact (meetings booked, pipeline, time saved) — not features
- You're comfortable with ambiguity and scope yourself smartly
- You ship things end-to-end; half-built is worse than nothing

---

### 2c. Questions to ask Ben (shows you did homework)

Have 3–5 of these ready. Ask 2–3 based on how the conversation flows.

1. **"What's the current biggest friction point for your BD reps around conference pipeline? Is it capture, follow-up, or identifying who to meet in the first place?"** — Shows you understand the problem space at the workflow level.

2. **"When you think about a tool like this going from prototype to daily use by the team — what's usually the killer feature that makes adoption stick vs. the one that looks good in a demo but gets ignored?"** — Shows sales empathy + execution focus.

3. **"Grain is at a stage where you're probably doing a lot of event-driven BD. What verticals or geographies are you most aggressively targeting right now?"** — Shows you understand the business context and lets him get excited.

4. **"The role mentions measuring impact by meetings booked and pipeline generated. What does that feedback loop look like today — is that tracked systematically or mostly by feel?"** — Shows you think about measurement and accountability.

5. **"How does the BD team currently use AI day-to-day? Are there workflows that are already running, or is this a greenfield?"** — Shows genuine curiosity about the real state, not just the job description.

---

### 2d. Questions they'll ask you — prep these answers

**"Tell me about yourself / your background"**
→ 60 seconds. Structure: what you've done → what you're focused on now → why this role specifically.
→ Land on: AI-native, builder mindset, excited about revenue impact from AI tools.

**"Why Grain?"**
→ Don't just say "fintech is interesting." Connect it to the *specific problem*: cross-currency / FX is a complex, relationship-driven sales cycle where good intelligence genuinely changes the outcome. Grain is embedding itself in the infrastructure of cross-border payments — that's a distribution play, not just a product sale. You want to be at a company where sales intelligence directly drives the business model.

**"What AI tools do you use every day?"**
→ Be specific and honest. Mention: Claude (reasoning, writing, coding), ChatGPT (quick lookups), Cursor/Claude Code (building), possibly Make/Zapier/n8n for automations, possibly Clay for enrichment. The key is to have stories — not just names.
→ *"I've built workflows that [specific example]. I measured [specific outcome]."*

**"Walk me through how you built Lanyard"**
→ Tell the story as a process, not a list of features. Start with: "I spent the first session entirely on planning — using a high-reasoning AI model to understand Grain's business, the ICP, the brief, and then the hardest parts of the problem before writing a line of code. Then I switched to a cheaper model for the high-volume execution phase. That model-switching decision is itself an example of how I think about AI as a cost/quality tradeoff."
→ Then walk: product plan → tech plan → build field first (producers before consumers) → Reconcile → Planning → remediation pass → 190 conferences → AI coverage suggestions.

**"What was the hardest part of the project?"**
→ Cross-conference matching. Not technically — conceptually. The hardest part was distinguishing "Sarah Chen, same person, new job" from "Sarah Chen, different person, same name" from "Sarah Fischer, misheard name on the show floor." All three are real. And the stakes are different: a false match is embarrassing, a false split silently loses relationship history — which is worse. So I designed toward recall and guarded merges with confirmation. That asymmetric thinking is what separates sales-empathetic design from a generic CRUD app.

**"Where did AI help you the most in building this?"**
→ Planning — writing the product plan, scoring methodology design, reasoning about edge cases in cross-conference matching. The AI caught a contradiction I hadn't spotted (I wanted suggestions to be "read-only" but also "reloadable by URL" — those two requirements conflict unless you persist the suggestions). Having a model that asks sharp clarifying questions before writing a plan is like having a senior colleague who spots the thing you took for granted.

**"Where did AI get in the way?"**
→ Early on, it was too conservative on scope — it proposed one AI feature, I had to push back and design all four. It also initially proposed a "hybrid" matching approach; I pushed it to LLM-first, and it correctly added "but retrieval in front so it scales and stays cheap." The lesson: AI is a collaborator, not an oracle. You have to push back when its defaults are too safe, and take its corrections when you've overstepped.

**"What would you do in your first 30/60/90 days in this role?"**
→ **30 days:** embed. Shadow 3–5 BD calls, sit in on conference prep, understand the current HubSpot hygiene, map where the biggest time-sinks are.
→ **60 days:** ship one workflow that saves 2+ hours a week for the team. Something small, measurable, daily-use.
→ **90 days:** instrument it. Show the impact (meetings booked from AI-enriched leads vs. cold, time saved on research, pipeline influence). Build the habit of measuring AI output, not just deploying it.

**"What's your experience with [specific tool] — HubSpot / Clay / Apollo / Zapier?"**
→ Be honest about your level. If you've used it, give a specific example. If you haven't but it's in the job description, lead with "I haven't used it deeply but I've used [adjacent tool] and I pick up tools fast — I built Lanyard in 4-6 hours using AI SDK v6 and Supabase SSR before they were in my training data by reading the docs live."

---

### 2e. Your strongest "moments" to have ready

These are memorable proof points that show who you are. Have each one as a 2-sentence story.

1. **The journal decision** — "I built a running decision log for the entire project — every choice and the reasoning behind it. Not for the evaluators — for me. When I started a new session, I read the journal to recover where I was. That's the same discipline I'd bring to maintaining the team's intelligence."

2. **The Opus/Sonnet split** — "I switched between AI models based on what the work required. Open-ended planning and architecture → the expensive model. High-volume screens, CRUD, QA → the cheap model. The same way a sales team should allocate senior reps to high-value discovery calls and automate the rest."

3. **The false split insight** — "I realized that missing a repeat contact is worse than flagging the wrong one. So I tuned the matching engine toward recall and guarded merges with confirmation. That's not a technical decision — it's a sales empathy decision."

4. **The 190 conferences** — "I used parallel research agents across 6 regions to build a database of 190 real, scored events in one session. Each agent returned structured factor scores; a single deterministic formula turned them all into a ranking. Wall-clock: ~4 minutes for what would take a human a full day of research."

5. **The adversarial verification** — "After building the 190 events, I spun up adversarial agents to try to refute each one — fact-checking dates, locations, whether they're real events. 0 fabrications. That's the workflow I'd apply to any research task: generate → verify → fix → publish."

---

## PART 3: THE MINDSET — HOW TO SHOW UP

### 3a. Be the salesperson who builds, not the engineer who sells

Every answer should be refracted through "how does this help a rep close more deals?" not "how does this work technically." Ben cares about:
- Does the rep actually use it?
- Does it make meetings better?
- Does it translate to pipeline?

### 3b. Show genuine excitement about Grain's space

FX / cross-currency is interesting territory for BD:
- It's a relationship-heavy sale (trust matters in moving money)
- The ICP is concentrated (fintech/treasury world is a small, conference-driven community)
- Lanyard is literally the tool for that exact community
- If the tool were real, Grain's BD team would be the first users

### 3c. The AI authenticity test

Ben will sense if you're overselling AI experience. Be specific. If you built automation workflows, describe them. If you use Claude daily, say for what. The most credible thing you can say isn't "I use AI constantly" — it's "I use Claude to [specific use case] and it saves me [specific time/quality outcome]."

### 3d. End on appetite, not completion

Don't end with "so that's what I built." End with:
> "What I'm most excited about in this role is that the build was a prototype. In a real deployment, you'd have real HubSpot data, real rep feedback, real conference attendance patterns. The model gets better the more it knows. I want to be the person who iterates on that in production."

---

## QUICK REFERENCE — NUMBERS TO KNOW

| Metric | Value |
|--------|-------|
| Conference DB | 190 real events (was 44, was 10) |
| Tiers | T1: 24 / T2: 100 / T3: 22 (approx) |
| ICP Score — Money20/20 Europe | 89 (highest) |
| ICP Score — Web Summit | 48 (T3) |
| ICP Score — EuroFinance | 84 (T1) |
| Demo team | 6 reps |
| Demo contacts | 20 / 38 encounters / 10 cross-conference arcs |
| Default weight — ICP Density | 40% (most important factor) |
| Matching: retrieval | pg_trgm fuzzy search |
| Matching: adjudication | Haiku (cheap model, short prompt) |
| HubSpot dedupe key | email |
| AI SDK version | v6 (generateText + Output.object, NOT generateObject — deprecated) |
| Live URL | grain-sooty.vercel.app (or whatever the latest deploy is) |

---

## THE NIGHT BEFORE

1. Open the live app and do a full walkthrough as a salesperson would — capture → leads → reconcile → planning → relationships → coverage map → AI coverage suggestion
2. Confirm demo@grain.com / LanyardDemo!2026 still works
3. Read entries 001–013 of the journal (the planning phase) — this is the "how you used AI" story
4. Sleep. You know this cold.
