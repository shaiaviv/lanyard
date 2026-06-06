// Regenerates the EXTENSIVE demo dataset — team, conference coverage, contacts, encounters, and
// a couple of pending captures for Reconcile — designed to exercise every use case of the app.
// Applies to the live DB AND rewrites supabase/setup.sql sections 4-6 so the seed stays reproducible.
// Conferences are NOT touched here (they're the real, researched set). Run: node scripts/gen-demo-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const TEAM = '00000000-0000-0000-0000-000000000001';
const ME = '@me'; // resolved to the signed-in rep (DB) / a subquery (setup.sql)

// ── Team (teammates; the signed-in "Demo Rep" already exists) ──────────────────
const R = {
  maya:  '00000000-0000-0000-0000-0000000000a1',
  tom:   '00000000-0000-0000-0000-0000000000a2',
  priya: '00000000-0000-0000-0000-0000000000a3',
  liam:  '00000000-0000-0000-0000-0000000000a4',
  sofia: '00000000-0000-0000-0000-0000000000a5',
};
const REPS = [
  { id: R.maya,  name: 'Maya Rodriguez', email: 'maya@grain.example' },
  { id: R.tom,   name: 'Tom Becker',     email: 'tom@grain.example' },
  { id: R.priya, name: 'Priya Nair',     email: 'priya@grain.example' },
  { id: R.liam,  name: 'Liam Walsh',     email: 'liam@grain.example' },
  { id: R.sofia, name: 'Sofia Costa',    email: 'sofia@grain.example' },
];

// conference short-names → exact DB names
const C = {
  itb25: 'ITB Berlin 2025', fin25: 'FinovateEurope 2025', m20eu25: 'Money20/20 Europe 2025',
  sibos25: 'Sibos 2025', ef25: 'EuroFinance International Treasury Management 2025',
  m20us25: 'Money20/20 USA 2025', sff25: 'Singapore FinTech Festival 2025',
  fin26: 'FinovateEurope 2026', mpe26: 'MPE (Merchant Payments Ecosystem) 2026', pay360: 'PAY360 2026',
  m20asia26: 'Money20/20 Asia 2026', nacha26: 'Nacha Smarter Faster Payments 2026',
  seamlessme26: 'Seamless Middle East 2026', act26: 'ACT Annual Conference 2026', m20eu26: 'Money20/20 Europe 2026',
  // upcoming (coverage)
  mag26: 'MAG Payments Summit London 2026', phoceu26: 'Phocuswright Europe 2026', ebaday26: 'EBAday 2026',
  africa26: 'Africa Fintech Summit Johannesburg 2026', sibos26: 'Sibos 2026',
  ef26: 'EuroFinance International Treasury Management 2026', afp26: 'AFP Annual Conference 2026',
  m20us26: 'Money20/20 USA 2026', finfall26: 'FinovateFall 2026', hk26: 'Hong Kong FinTech Week 2026',
  sff26: 'Singapore FinTech Festival 2026', saudi26: 'Seamless Saudi Arabia 2026', wtm26: 'WTM London 2026',
  websummit26: 'Web Summit 2026', slush26: 'Slush 2026', seamlessaf26: 'Seamless Africa 2026',
  atm26: 'Arabian Travel Market 2026', techcrunch26: 'TechCrunch Disrupt 2026', leap26: 'LEAP 2026',
};

const fit = (companyFit, personFit, tier, score, rationale) => ({ companyFit, personFit, tier, score, rationale });
const snap = (name, company, title, email = null, linkedin = null) => ({ name, company, title, email, linkedin });

// ── Contacts with their encounter timelines + relationship arc ─────────────────
// e = encounter: [confKey, repId, temperature, topics[], note, followUp, snapshot, fit?]
const CONTACTS = [
  { id: 'e1', name: 'Elena Fischer', company: 'Adyen', title: 'VP Treasury', email: 'elena.fischer@adyen.com', linkedin: 'https://www.linkedin.com/in/elena-fischer-treasury',
    verdict: 'warming', lastTime: 'Money20/20 Europe 2026 — asked for pricing and brought her Head of Payments',
    openThreads: ['Send a pilot scope + pricing', 'Loop in her Head of Payments (Daan)'],
    howToApproach: 'Actively evaluating and progressing each time — move to a concrete pilot proposal.',
    suggestedMove: 'Send a pilot scope and pricing this week while intent is high.',
    enc: [
      [C.m20eu25, ME, 'warm', ['FX hedging','embedded finance'], 'Curious about embedded FX risk; took a deck. Director on the treasury team.', false, snap('Elena Fischer','Adyen','Director, Treasury','elena.fischer@adyen.com','https://www.linkedin.com/in/elena-fischer-treasury')],
      [C.sibos25, R.maya, 'warm', ['cross-border settlement','treasury workflows'], 'Followed up at Sibos; asked how we fit treasury workflows.', false, snap('Elena Fischer','Adyen','Director, Treasury','elena.fischer@adyen.com','https://www.linkedin.com/in/elena-fischer-treasury')],
      [C.m20eu26, ME, 'hot', ['pricing','integration','pilot'], 'Now VP Treasury. Asked for pricing and brought her Head of Payments. Wants a pilot.', true, snap('Elena Fischer','Adyen','VP Treasury','elena.fischer@adyen.com','https://www.linkedin.com/in/elena-fischer-treasury'), fit('strong','strong','strong',92,'PSP with heavy FX exposure; VP Treasury owns the decision')],
    ] },
  { id: 'e2', name: 'Raj Patel', company: 'Mollie', title: 'Payments Lead', email: 'raj.patel@mollie.com', linkedin: 'https://www.linkedin.com/in/raj-patel-payments',
    verdict: 'tirekicker', lastTime: 'Money20/20 Europe 2026 — same still-exploring conversation as prior years',
    openThreads: [], howToApproach: 'Three years of friendly chats with no progression — qualify hard or deprioritize.',
    suggestedMove: 'Ask one direct qualifying question: is there budget and a timeline this year?',
    enc: [
      [C.fin25, ME, 'lukewarm', ['general'], 'Friendly, vague interest. Payments Manager at Trustly.', false, snap('Raj Patel','Trustly','Payments Manager',null,'https://www.linkedin.com/in/raj-patel-payments')],
      [C.m20eu25, R.tom, 'warm', ['FX'], 'Nice chat again, no specifics. Still at Trustly.', false, snap('Raj Patel','Trustly','Payments Manager',null,'https://www.linkedin.com/in/raj-patel-payments')],
      [C.sibos25, ME, 'lukewarm', ['catching up'], 'Now at Mollie (Senior Payments Manager). Same conversation as last time.', false, snap('Raj Patel','Mollie','Senior Payments Manager','raj.patel@mollie.com','https://www.linkedin.com/in/raj-patel-payments')],
      [C.m20eu26, ME, 'lukewarm', ['hello'], 'Year three. Still exploring, never advances.', false, snap('Raj Patel','Mollie','Payments Lead','raj.patel@mollie.com','https://www.linkedin.com/in/raj-patel-payments'), fit('strong','moderate','moderate',64,'Good company fit; contact engaged but never commits')],
    ] },
  { id: 'e3', name: 'Sophie Laurent', company: 'Voyagia Travel', title: 'CFO', email: 'sophie.laurent@voyagia.com', linkedin: 'https://www.linkedin.com/in/sophie-laurent-cfo',
    verdict: 'cooling', lastTime: 'Money20/20 Europe 2026 — priorities shifted, lukewarm',
    openThreads: ['Was a pilot candidate in 2025 before budget froze'], howToApproach: 'Was hot, cooled after a budget freeze — re-warm only on a fresh trigger.',
    suggestedMove: 'Light-touch check-in next quarter; do not over-invest now.',
    enc: [
      [C.m20eu25, R.maya, 'hot', ['FX risk','pilot'], 'Very keen — wanted a pilot for travel settlement FX.', false, snap('Sophie Laurent','Voyagia Travel','CFO','sophie.laurent@voyagia.com','https://www.linkedin.com/in/sophie-laurent-cfo')],
      [C.sibos25, R.maya, 'warm', ['follow-up'], 'Still interested but budget froze for the year.', false, snap('Sophie Laurent','Voyagia Travel','CFO','sophie.laurent@voyagia.com','https://www.linkedin.com/in/sophie-laurent-cfo')],
      [C.m20eu26, ME, 'cool', ['check-in'], 'Priorities shifted; lukewarm now. Pilot is off the table for now.', false, snap('Sophie Laurent','Voyagia Travel','CFO','sophie.laurent@voyagia.com','https://www.linkedin.com/in/sophie-laurent-cfo'), fit('strong','strong','strong',80,'Travel wholesaler with real FX exposure; CFO owns it')],
    ] },
  { id: 'e4', name: 'Marcus Weber', company: 'Lunar', title: 'Head of Payments', email: 'marcus.weber@lunar.app', linkedin: 'https://www.linkedin.com/in/marcus-weber-pay',
    verdict: 'nurturing', lastTime: 'Money20/20 Europe 2026 — steady engagement, integration questions',
    openThreads: ['Answer his integration / security questions'], howToApproach: 'Genuine but early — keep nurturing with useful specifics.',
    suggestedMove: 'Share an integration one-pager and a relevant neobank customer story.',
    enc: [
      [C.sibos25, R.tom, 'warm', ['treasury'], 'Genuine interest, early stage. Head of Payments at a neobank.', false, snap('Marcus Weber','Lunar','Head of Payments','marcus.weber@lunar.app','https://www.linkedin.com/in/marcus-weber-pay')],
      [C.m20eu26, R.tom, 'warm', ['integration','security'], 'Still engaged, steady. Asked integration and security questions.', false, snap('Marcus Weber','Lunar','Head of Payments','marcus.weber@lunar.app','https://www.linkedin.com/in/marcus-weber-pay')],
    ] },
  { id: 'e5', name: 'Daniela Costa', company: 'MercadoHub', title: 'Head of Payments', email: 'daniela.costa@mercadohub.com', linkedin: 'https://www.linkedin.com/in/daniela-costa-payments',
    verdict: 'warming', lastTime: 'Money20/20 Europe 2026 — wants a technical deep-dive with her team',
    openThreads: ['Schedule a technical deep-dive', 'Share marketplace FX case study'],
    howToApproach: 'Clear upward trajectory across three events — push for the technical evaluation.',
    suggestedMove: 'Book the technical deep-dive with her engineering lead.',
    enc: [
      [C.m20eu25, R.maya, 'warm', ['marketplace FX','settlement'], 'Marketplace with intl sellers; interested in multi-currency settlement.', false, snap('Daniela Costa','MercadoHub','Head of Payments','daniela.costa@mercadohub.com','https://www.linkedin.com/in/daniela-costa-payments')],
      [C.ef25, ME, 'warm', ['treasury','hedging'], 'Came to EuroFinance; comparing hedging approaches.', false, snap('Daniela Costa','MercadoHub','Head of Payments','daniela.costa@mercadohub.com','https://www.linkedin.com/in/daniela-costa-payments')],
      [C.m20eu26, ME, 'hot', ['deep-dive','evaluation'], 'Wants a technical deep-dive with her team. Strong intent.', true, snap('Daniela Costa','MercadoHub','Head of Payments','daniela.costa@mercadohub.com','https://www.linkedin.com/in/daniela-costa-payments'), fit('strong','strong','strong',90,'Marketplace with international flows; she owns payments')],
    ] },
  { id: 'e6', name: 'Henrik Olsen', company: 'Nordstat', title: 'Treasury Manager', email: 'henrik.olsen@nordstat.com', linkedin: 'https://www.linkedin.com/in/henrik-olsen-treasury',
    verdict: 'tirekicker', lastTime: 'Money20/20 Europe 2026 — still gathering information, no next step',
    openThreads: [], howToApproach: 'Polite and curious for over a year but never advances — low priority.',
    suggestedMove: 'Send one piece of content; do not chase further until he initiates.',
    enc: [
      [C.ef25, ME, 'lukewarm', ['research'], 'Information gathering, not a buyer yet.', false, snap('Henrik Olsen','Nordstat','Treasury Manager','henrik.olsen@nordstat.com','https://www.linkedin.com/in/henrik-olsen-treasury')],
      [C.sibos25, R.liam, 'lukewarm', ['general'], 'Same vague interest. No authority signal.', false, snap('Henrik Olsen','Nordstat','Treasury Manager','henrik.olsen@nordstat.com','https://www.linkedin.com/in/henrik-olsen-treasury')],
      [C.m20eu26, ME, 'cool', ['hello'], 'Still gathering info, no next step.', false, snap('Henrik Olsen','Nordstat','Treasury Manager','henrik.olsen@nordstat.com','https://www.linkedin.com/in/henrik-olsen-treasury')],
    ] },
  { id: 'e7', name: 'Yuki Tanaka', company: 'PacificPay', title: 'Head of FX', email: 'yuki.tanaka@pacificpay.jp', linkedin: 'https://www.linkedin.com/in/yuki-tanaka-fx',
    verdict: 'cooling', lastTime: 'Money20/20 Europe 2026 — went quiet, evaluating a competitor',
    openThreads: ['Was hot in 2025; now comparing a competitor'], howToApproach: 'Cooling after a strong start — find out what changed before investing more.',
    suggestedMove: 'Direct, honest note: what changed since last year? Offer a side-by-side.',
    enc: [
      [C.m20us25, R.tom, 'hot', ['FX','APAC expansion'], 'Very engaged; APAC PSP expanding cross-border. Wanted a follow-up.', false, snap('Yuki Tanaka','PacificPay','Head of FX','yuki.tanaka@pacificpay.jp','https://www.linkedin.com/in/yuki-tanaka-fx')],
      [C.m20eu26, ME, 'cool', ['catch-up'], 'Cooler now; mentioned evaluating a competitor.', false, snap('Yuki Tanaka','PacificPay','Head of FX','yuki.tanaka@pacificpay.jp','https://www.linkedin.com/in/yuki-tanaka-fx'), fit('strong','strong','strong',85,'APAC PSP with cross-border flows; Head of FX is the buyer')],
    ] },
  { id: 'e8', name: 'Carlos Mendes', company: 'NeoBanco', title: 'VP Payments', email: 'carlos.mendes@neobanco.com', linkedin: 'https://www.linkedin.com/in/carlos-mendes-payments',
    verdict: 'warming', lastTime: 'Money20/20 Europe 2026 — moved to NeoBanco and re-engaged warmly',
    openThreads: ['Re-introduce Grain in his new role at NeoBanco'], howToApproach: 'Changed companies and came back to us — warm relationship that survived the move.',
    suggestedMove: 'Congratulate on the new role; map the use case to NeoBanco.',
    enc: [
      [C.sibos25, R.liam, 'warm', ['payments'], 'Payments Director at PSP Iberia; solid fit.', false, snap('Carlos Mendes','PSP Iberia','Payments Director','carlos.mendes@pspiberia.com','https://www.linkedin.com/in/carlos-mendes-payments')],
      [C.m20eu26, ME, 'warm', ['re-engage'], 'Now VP Payments at NeoBanco. Re-engaged warmly in his new role.', true, snap('Carlos Mendes','NeoBanco','VP Payments','carlos.mendes@neobanco.com','https://www.linkedin.com/in/carlos-mendes-payments'), fit('strong','strong','strong',88,'Neobank with FX needs; he now owns payments')],
    ] },
  { id: 'e9', name: 'Amara Okafor', company: 'AfriRemit', title: 'Chief Product Officer', email: 'amara.okafor@afriremit.com', linkedin: 'https://www.linkedin.com/in/amara-okafor-cpo',
    verdict: 'warming', lastTime: 'Money20/20 Europe 2026 — wants to pilot cross-border corridors',
    openThreads: ['Define pilot corridors (EU↔Africa)'], howToApproach: 'Cross-border remittance leader with clear, rising intent.',
    suggestedMove: 'Propose a corridor pilot focused on EU↔Africa flows.',
    enc: [
      [C.sibos25, ME, 'warm', ['cross-border','corridors'], 'Cross-border remittance company; strong corridor needs.', false, snap('Amara Okafor','AfriRemit','Chief Product Officer','amara.okafor@afriremit.com','https://www.linkedin.com/in/amara-okafor-cpo')],
      [C.m20eu26, R.maya, 'hot', ['pilot','corridors'], 'Wants to pilot cross-border corridors. High intent.', true, snap('Amara Okafor','AfriRemit','Chief Product Officer','amara.okafor@afriremit.com','https://www.linkedin.com/in/amara-okafor-cpo'), fit('strong','strong','strong',89,'Cross-border payments firm; CPO drives adoption')],
    ] },
  { id: 'e10', name: 'Thomas Müller', company: 'Bavarian Fintech', title: 'Founder & CEO', email: 'thomas@bavarianfintech.de', linkedin: 'https://www.linkedin.com/in/thomas-mueller-fintech',
    verdict: 'tooearly', lastTime: 'Money20/20 Europe 2026 — early-stage, just two touches so far',
    openThreads: ['Understand their FX volume before qualifying'], howToApproach: 'Only two touches and recent — too early to judge; keep warm.',
    suggestedMove: 'Light follow-up; learn their cross-border volume.',
    enc: [
      [C.pay360, ME, 'warm', ['intro'], 'Early-stage fintech founder; curious about embedded FX.', false, snap('Thomas Müller','Bavarian Fintech','Founder & CEO','thomas@bavarianfintech.de','https://www.linkedin.com/in/thomas-mueller-fintech')],
      [C.m20eu26, ME, 'warm', ['follow-up'], 'Still curious; small but growing volume.', false, snap('Thomas Müller','Bavarian Fintech','Founder & CEO','thomas@bavarianfintech.de','https://www.linkedin.com/in/thomas-mueller-fintech'), fit('moderate','strong','moderate',58,'Early-stage; founder owns it but volume unproven')],
    ] },
  // ── Single-encounter leads (populate follow-up queue / leads-at-conference / fit×temp 2x2) ──
  { id: 'e11', name: 'Isabelle Moreau', company: 'Galeries Pay', title: 'Head of Treasury', email: 'isabelle.moreau@galeriespay.fr', linkedin: 'https://www.linkedin.com/in/isabelle-moreau-treasury',
    enc: [[C.m20eu26, ME, 'hot', ['FX hedging','pricing'], 'Retail group PSP; wants pricing for FX hedging now. Clear buyer.', true, snap('Isabelle Moreau','Galeries Pay','Head of Treasury','isabelle.moreau@galeriespay.fr','https://www.linkedin.com/in/isabelle-moreau-treasury'), fit('strong','strong','strong',91,'Retail PSP with FX exposure; Head of Treasury is the buyer — CHASE')]] },
  { id: 'e12', name: 'Greg Thompson', company: 'Adyen', title: 'Data Analyst', email: 'greg.thompson@adyen.com', linkedin: 'https://www.linkedin.com/in/greg-thompson-data',
    enc: [[C.m20eu26, ME, 'warm', ['general'], 'Friendly junior analyst at a great-fit company, but not a decision-maker.', false, snap('Greg Thompson','Adyen','Data Analyst','greg.thompson@adyen.com','https://www.linkedin.com/in/greg-thompson-data'), fit('strong','weak','moderate',55,'Great company fit but wrong contact — be polite, find the real buyer')]] },
  { id: 'e13', name: 'Nina Petrova', company: 'Voyageur Travel', title: 'CFO', email: 'nina.petrova@voyageur.com', linkedin: 'https://www.linkedin.com/in/nina-petrova-cfo',
    enc: [[C.m20eu26, R.maya, 'hot', ['settlement FX','pilot'], 'Travel wholesaler CFO; multi-currency settlement pain. Wants a pilot.', true, snap('Nina Petrova','Voyageur Travel','CFO','nina.petrova@voyageur.com','https://www.linkedin.com/in/nina-petrova-cfo'), fit('strong','strong','strong',86,'Travel wholesaler with settlement FX; CFO owns it')]] },
  { id: 'e14', name: 'Omar Haddad', company: 'GulfPay', title: 'Payments Lead', email: 'omar.haddad@gulfpay.ae', linkedin: 'https://www.linkedin.com/in/omar-haddad-payments',
    enc: [[C.seamlessme26, R.liam, 'lukewarm', ['cross-border'], 'Strong-fit MENA PSP but only mild interest right now — nurture.', false, snap('Omar Haddad','GulfPay','Payments Lead','omar.haddad@gulfpay.ae','https://www.linkedin.com/in/omar-haddad-payments'), fit('strong','strong','strong',82,'Great fit, low intent today — NURTURE')]] },
  { id: 'e15', name: 'Lars Andersen', company: 'Scandi Marketplace', title: 'Head of Payments', email: 'lars.andersen@scandimarket.com', linkedin: 'https://www.linkedin.com/in/lars-andersen-pay',
    enc: [[C.m20eu26, R.tom, 'warm', ['marketplace','multi-currency'], 'Nordic marketplace expanding into EU; warm and engaged.', true, snap('Lars Andersen','Scandi Marketplace','Head of Payments','lars.andersen@scandimarket.com','https://www.linkedin.com/in/lars-andersen-pay'), fit('strong','strong','strong',84,'Marketplace with cross-border flows; he owns payments')]] },
  { id: 'e16', name: 'Wei Chen', company: 'SinoTrade', title: 'Group Treasurer', email: 'wei.chen@sinotrade.com', linkedin: 'https://www.linkedin.com/in/wei-chen-treasury',
    enc: [[C.sibos25, R.tom, 'warm', ['treasury','APAC'], 'APAC trading group treasurer; real FX exposure across corridors.', true, snap('Wei Chen','SinoTrade','Group Treasurer','wei.chen@sinotrade.com','https://www.linkedin.com/in/wei-chen-treasury'), fit('strong','strong','strong',83,'Trading group with multi-currency treasury; group treasurer is the buyer')]] },
  { id: 'e17', name: 'Patricia Gomez', company: 'Iberia Foods', title: 'Group Treasurer', email: 'patricia.gomez@iberiafoods.es', linkedin: 'https://www.linkedin.com/in/patricia-gomez-treasury',
    enc: [[C.ef25, R.sofia, 'hot', ['hedging','cash management'], 'Large food exporter; active FX hedging program. Strong intent.', true, snap('Patricia Gomez','Iberia Foods','Group Treasurer','patricia.gomez@iberiafoods.es','https://www.linkedin.com/in/patricia-gomez-treasury'), fit('strong','strong','strong',87,'Exporter with FX hedging needs; group treasurer owns it')]] },
  { id: 'e18', name: 'Brandon Lee', company: 'Plataforma Commerce', title: 'VP Payments', email: 'brandon.lee@plataforma.com', linkedin: 'https://www.linkedin.com/in/brandon-lee-payments',
    enc: [[C.m20us25, R.tom, 'warm', ['platform','embedded'], 'US commerce platform adding embedded cross-border. Warm.', true, snap('Brandon Lee','Plataforma Commerce','VP Payments','brandon.lee@plataforma.com','https://www.linkedin.com/in/brandon-lee-payments'), fit('strong','strong','strong',85,'Commerce platform with embedded payments; VP Payments owns it')]] },
  { id: 'e19', name: 'Fatima Al-Rashid', company: 'MENA Pay', title: 'Payments Director', email: 'fatima@menapay.ae', linkedin: 'https://www.linkedin.com/in/fatima-al-rashid',
    enc: [[C.pay360, R.liam, 'lukewarm', ['regional payments'], 'Regional PSP; exploratory conversation, moderate fit.', false, snap('Fatima Al-Rashid','MENA Pay','Payments Director','fatima@menapay.ae','https://www.linkedin.com/in/fatima-al-rashid'), fit('moderate','strong','moderate',62,'Regional PSP; some FX exposure, exploratory')]] },
  { id: 'e20', name: 'George Papadopoulos', company: 'Hellenic Fintech', title: 'CEO', email: 'george@hellenicfintech.gr', linkedin: 'https://www.linkedin.com/in/george-papadopoulos',
    enc: [[C.fin26, ME, 'cold', ['general'], 'Domestic-only fintech, little FX exposure. Polite but not a fit.', false, snap('George Papadopoulos','Hellenic Fintech','CEO','george@hellenicfintech.gr','https://www.linkedin.com/in/george-papadopoulos'), fit('weak','moderate','weak',28,'Domestic-only, minimal FX exposure — DEPRIORITIZE')]] },
];

// ── Pending captures (Reconcile inbox) — assigned to the signed-in rep ──────────
const PENDING = [
  { conf: C.m20eu26, rep: ME, snapshot: snap('Elena Fisher','Adyen','VP Treasury',null,null),
    note: 'Met someone from Adyen treasury — think I have met her before?',
    candidates: [{ contactId: 'e1', decision: 'unsure', confidence: 0.72, reasoning: 'Name nearly matches Elena Fischer (Adyen, VP Treasury) met at 3 prior events — likely the same person, spelling differs.', jobChange: false, crossRep: false }] },
  { conf: C.m20eu26, rep: ME, snapshot: snap('Ahmed Khalil','DesertPay','Head of Payments','ahmed.khalil@desertpay.ae',null),
    note: 'New contact, MENA PSP, seemed interested in cross-border.',
    candidates: [] },
];

// ── Coverage plan (planned attendance for upcoming events) ─────────────────────
// status: considering | committed | attended | declined. Deliberate gaps + clusters.
const COVERAGE = [
  [ME, C.m20eu26, 'attended'], [R.maya, C.m20eu26, 'attended'], [R.tom, C.m20eu26, 'attended'],
  [R.maya, C.mag26, 'committed'], [ME, C.ebaday26, 'considering'], [R.liam, C.ebaday26, 'considering'],
  [R.sofia, C.phoceu26, 'considering'], [R.liam, C.africa26, 'considering'],
  [R.tom, C.sibos26, 'committed'], [ME, C.sibos26, 'committed'],
  [ME, C.ef26, 'considering'], [R.maya, C.ef26, 'considering'],
  [R.tom, C.afp26, 'committed'], [R.tom, C.m20us26, 'committed'], [ME, C.m20us26, 'considering'],
  [R.tom, C.finfall26, 'considering'], [R.priya, C.hk26, 'committed'],
  [R.priya, C.sff26, 'considering'], [R.liam, C.saudi26, 'considering'],
  [R.sofia, C.wtm26, 'considering'], [R.sofia, C.websummit26, 'declined'], [R.priya, C.slush26, 'declined'],
  [R.liam, C.seamlessaf26, 'considering'],
];

// ─────────────────────────────────────────────────────────────────────────────
function monthsBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24 * 30)); }

async function applyToDb() {
  const { data: meRow } = await supa.from('reps').select('id').not('auth_user_id', 'is', null).order('created_at').limit(1).single();
  const meId = meRow.id;
  const repId = (r) => (r === ME ? meId : r);

  const { data: confs } = await supa.from('conferences').select('id,name,start_date');
  const confByName = Object.fromEntries(confs.map((c) => [c.name, c]));

  // Wipe demo data (keep conferences + the signed-in rep)
  await supa.from('encounters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supa.from('contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supa.from('coverage').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supa.from('reps').delete().is('auth_user_id', null);

  // Teammates
  await supa.from('reps').insert(REPS.map((r) => ({ id: r.id, auth_user_id: null, name: r.name, email: r.email, team_id: TEAM })));

  // Contacts + encounters
  const contactRows = [];
  const encounterRows = [];
  for (const c of CONTACTS) {
    const id = uuidFor(c.id);
    const dates = c.enc.map(([conf]) => confByName[conf].start_date);
    const arc = c.verdict
      ? { glance: { meetings: c.enc.length, spanMonths: monthsBetween(dates.reduce((a, b) => (a < b ? a : b)), dates.reduce((a, b) => (a > b ? a : b))), verdict: c.verdict },
          lastTime: c.lastTime, openThreads: c.openThreads, howToApproach: c.howToApproach, suggestedMove: c.suggestedMove }
      : null;
    contactRows.push({ id, canonical_name: c.name, current_company: c.company, current_title: c.title, email: c.email, linkedin_url: c.linkedin, arc_cache: arc });
    for (const [conf, r, temp, topics, note, followUp, sn, f] of c.enc) {
      encounterRows.push({ contact_id: id, conference_id: confByName[conf].id, rep_id: repId(r), occurred_at: confByName[conf].start_date,
        temperature: temp, topics, note, follow_up: followUp, state: 'confirmed', fit: f ?? null, identity_snapshot: sn, provenance: { source: 'seed' } });
    }
  }
  for (const p of PENDING) {
    encounterRows.push({ contact_id: null, conference_id: confByName[p.conf].id, rep_id: repId(p.rep), occurred_at: confByName[p.conf].start_date,
      temperature: 'warm', topics: [], note: p.note, follow_up: false, state: 'pending',
      match_candidates: p.candidates.map((m) => ({ ...m, contactId: uuidFor(m.contactId) })), identity_snapshot: p.snapshot, provenance: { source: 'seed' } });
  }
  await supa.from('contacts').insert(contactRows);
  // chunk encounters
  for (let i = 0; i < encounterRows.length; i += 50) await supa.from('encounters').insert(encounterRows.slice(i, i + 50));

  // Coverage
  const covRows = COVERAGE.map(([r, conf, status]) => ({ rep_id: repId(r), conference_id: confByName[conf].id, status }));
  const { error: covErr } = await supa.from('coverage').upsert(covRows, { onConflict: 'rep_id,conference_id' });
  if (covErr) throw covErr;

  return { contacts: contactRows.length, encounters: encounterRows.length, coverage: covRows.length };
}

function uuidFor(short) {
  // e1 → ...00000001 ... e20 → ...00000014 (hex; stable, collision-free with rep a-ids)
  const n = Number(short.slice(1));
  return `00000000-0000-0000-0000-0000000000${n.toString(16).padStart(2, '0')}`;
}

// ── Emit reproducible SQL into supabase/setup.sql (sections 4-6) ───────────────
const Q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const JS = (o) => (o == null ? 'null' : `'${JSON.stringify(o).replace(/'/g, "''")}'`);
const ARR = (a) => `'{${(a ?? []).map((x) => `"${String(x).replace(/"/g, '\\"')}"`).join(',')}}'`;
const repCell = (r) => (r === ME ? 'null' : Q(r)); // null → resolved to signed-in rep via subquery
const ME_SUBQ = '(select id from reps where auth_user_id is not null order by created_at limit 1)';

async function emitSetupSql() {
  const { data: confs } = await supa.from('conferences').select('name,start_date');
  const startByName = Object.fromEntries(confs.map((c) => [c.name, c.start_date]));

  const teammates = `-- ── 4. Teammate reps (the wider sales team; no auth account — for coverage planning) ──
insert into reps (id, auth_user_id, name, email, team_id) values
${REPS.map((r) => `  (${Q(r.id)}, null, ${Q(r.name)}, ${Q(r.email)}, ${Q(TEAM)})`).join(',\n')}
on conflict (id) do nothing;`;

  const covVals = COVERAGE.map(([r, conf, status]) => `  (${repCell(r)}, ${Q(conf)}, ${Q(status)})`).join(',\n');
  const coverage = `-- ── 5. Conference coverage (who covers what; deliberate gaps + clusters for the demo) ──
insert into coverage (rep_id, conference_id, status)
select coalesce(v.rep::uuid, ${ME_SUBQ}), c.id, v.status::coverage_status
from (values
${covVals}
) as v(rep, conf, status)
join conferences c on c.name = v.conf
on conflict (rep_id, conference_id) do nothing;`;

  // Contacts (with computed arc_cache)
  const contactVals = CONTACTS.map((c) => {
    const dates = c.enc.map(([conf]) => startByName[conf]);
    const arc = c.verdict
      ? { glance: { meetings: c.enc.length, spanMonths: monthsBetween(dates.reduce((a, b) => (a < b ? a : b)), dates.reduce((a, b) => (a > b ? a : b))), verdict: c.verdict },
          lastTime: c.lastTime, openThreads: c.openThreads, howToApproach: c.howToApproach, suggestedMove: c.suggestedMove }
      : null;
    return `  (${Q(uuidFor(c.id))}, ${Q(c.linkedin)}, ${Q(c.name)}, ${Q(c.company)}, ${Q(c.title)}, ${Q(c.email)}, ${JS(arc)}::jsonb)`;
  }).join(',\n');

  // Encounters (confirmed + pending) as one INSERT…SELECT
  const encRows = [];
  for (const c of CONTACTS) {
    for (const [conf, r, temp, topics, note, followUp, sn, f] of c.enc) {
      encRows.push(`  (${Q(uuidFor(c.id))}, ${Q(conf)}, ${repCell(r)}, ${Q(temp)}, ${ARR(topics)}, ${Q(note)}, ${followUp}, 'confirmed', ${JS(f)}, null, ${JS(sn)})`);
    }
  }
  for (const p of PENDING) {
    const cands = p.candidates.map((m) => ({ ...m, contactId: uuidFor(m.contactId) }));
    encRows.push(`  (null, ${Q(p.conf)}, ${repCell(p.rep)}, 'warm', ${ARR([])}, ${Q(p.note)}, false, 'pending', null, ${JS(cands)}, ${JS(p.snapshot)})`);
  }
  const encounters = `-- ── 6. Demo leads: contacts, encounters, and pending captures (Reconcile inbox) ──
insert into contacts (id, linkedin_url, canonical_name, current_company, current_title, email, arc_cache) values
${contactVals}
on conflict (id) do nothing;

insert into encounters (contact_id, conference_id, rep_id, occurred_at, temperature, topics, note, follow_up, state, fit, match_candidates, identity_snapshot, provenance)
select v.contact_id::uuid, c.id, coalesce(v.rep::uuid, ${ME_SUBQ}), c.start_date::timestamptz,
  v.temperature::temperature, v.topics::text[], v.note, v.follow_up, v.state::link_state,
  v.fit::jsonb, v.cands::jsonb, v.snap::jsonb, '{"source":"seed"}'::jsonb
from (values
${encRows.join(',\n')}
) as v(contact_id, conf, rep, temperature, topics, note, follow_up, state, fit, cands, snap)
join conferences c on c.name = v.conf
where not exists (
  select 1 from encounters e
  where e.conference_id = c.id
    and e.identity_snapshot->>'name' = v.snap::jsonb->>'name'
);`;

  const block = [teammates, coverage, encounters].join('\n\n') + '\n';
  const path = new URL('../supabase/setup.sql', import.meta.url);
  const sql = readFileSync(path, 'utf8');
  const start = sql.indexOf('-- ── 4.');
  if (start === -1) throw new Error('section 4 marker not found');
  writeFileSync(path, sql.slice(0, start) + block);
  console.log('Rewrote setup.sql sections 4-6');
}

const r = await applyToDb();
console.log('Applied demo data:', r);
await emitSetupSql();
