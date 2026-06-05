// Server-side DB query helpers. All functions create a server Supabase client (RLS-scoped).
import 'server-only';
import { createSupabaseServerClient } from '@/lib/db/server';
import type { Contact, Conference, Encounter, Rep, ArcSummary, ArcVerdict } from '@/lib/types';
import { DEFAULT_WEIGHTS, type ScoringWeights } from '@/lib/scoring/computeIcpScore';

// ── Reps ─────────────────────────────────────────────────────────────────────

export async function getCurrentRep(): Promise<Rep | null> {
  const supa = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return null;

  const { data } = await supa.from('reps').select('*').eq('auth_user_id', user.id).single();
  if (!data) return null;

  return {
    id: data.id as string,
    authUserId: data.auth_user_id as string,
    teamId: data.team_id as string,
    name: data.name as string,
    email: data.email as string | null,
    currentConferenceId: (data.current_conference_id as string | null) ?? null,
  };
}

// C4 scoring weights — team-level, non-secret config stored as plaintext JSON in app_settings.
// Returns the team's saved weights or the defaults. Used to seed the live slider panel.
export async function getScoringWeights(teamId: string): Promise<ScoringWeights> {
  const supa = await createSupabaseServerClient();
  const { data } = await supa
    .from('app_settings')
    .select('key_ciphertext')
    .eq('team_id', teamId)
    .eq('key_name', 'scoring_weights')
    .maybeSingle();

  if (data?.key_ciphertext) {
    try {
      const parsed = JSON.parse(data.key_ciphertext as string) as Partial<ScoringWeights>;
      return { ...DEFAULT_WEIGHTS, ...parsed };
    } catch {
      // malformed → fall back to defaults
    }
  }
  return DEFAULT_WEIGHTS;
}

// All reps on a team — the roster a sales lead assigns coverage across.
export async function getReps(teamId: string): Promise<Rep[]> {
  const supa = await createSupabaseServerClient();
  const { data } = await supa
    .from('reps')
    .select('*')
    .eq('team_id', teamId)
    .order('name', { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((d: any) => ({
    id: d.id as string,
    authUserId: d.auth_user_id as string | null,
    teamId: d.team_id as string,
    name: d.name as string,
    email: d.email as string | null,
    currentConferenceId: (d.current_conference_id as string | null) ?? null,
  }));
}

// ── Conferences ───────────────────────────────────────────────────────────────

export async function getActiveConference(): Promise<Conference | null> {
  const supa = await createSupabaseServerClient();
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supa
    .from('conferences')
    .select('*')
    .lte('start_date', today)
    .gte('end_date', today)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? mapConference(data) : null;
}

export async function getConferences(): Promise<Conference[]> {
  const supa = await createSupabaseServerClient();
  const { data } = await supa
    .from('conferences')
    .select('*')
    .order('start_date', { ascending: true });

  return (data ?? []).map(mapConference);
}

export async function getConferenceById(id: string): Promise<Conference | null> {
  const supa = await createSupabaseServerClient();
  const { data } = await supa.from('conferences').select('*').eq('id', id).maybeSingle();
  return data ? mapConference(data) : null;
}

// ── Encounters ────────────────────────────────────────────────────────────────

export async function getEncountersForConference(
  conferenceId: string,
  repId: string,
): Promise<(Encounter & { contact: Contact | null })[]> {
  const supa = await createSupabaseServerClient();
  const { data } = await supa
    .from('encounters')
    .select('*, contacts(*)')
    .eq('conference_id', conferenceId)
    .eq('rep_id', repId)
    .order('occurred_at', { ascending: false });

  // Results are ordered newest-first. Deduplicate by contact_id so the same person
  // doesn't appear multiple times when they were captured more than once at this conference.
  // Pending encounters (contact_id = null) are kept individually.
  const seenContactIds = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).flatMap((row: any) => {
    const enc = { ...mapEncounter(row), contact: row.contacts ? mapContact(row.contacts) : null };
    if (!enc.contactId) return [enc]; // pending — always show
    if (seenContactIds.has(enc.contactId)) return []; // duplicate — skip
    seenContactIds.add(enc.contactId);
    return [enc];
  });
}

export async function getPendingCount(repId: string): Promise<number> {
  const supa = await createSupabaseServerClient();
  const { count } = await supa
    .from('encounters')
    .select('*', { count: 'exact', head: true })
    .eq('rep_id', repId)
    .eq('state', 'pending');

  return count ?? 0;
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function getContactWithEncounters(
  contactId: string,
): Promise<{ contact: Contact; encounters: (Encounter & { conferenceName: string | null })[] } | null> {
  const supa = await createSupabaseServerClient();

  const [{ data: contact }, { data: encounters }] = await Promise.all([
    supa.from('contacts').select('*').eq('id', contactId).maybeSingle(),
    supa
      .from('encounters')
      .select('*, conferences(name)')
      .eq('contact_id', contactId)
      .order('occurred_at', { ascending: false }),
  ]);

  if (!contact) return null;
  return {
    contact: mapContact(contact),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    encounters: (encounters ?? []).map((row: any) => ({
      ...mapEncounter(row),
      conferenceName: (row.conferences?.name ?? null) as string | null,
    })),
  };
}

export async function getPendingEncounters(
  repId: string,
): Promise<(Encounter & { contact: Contact | null })[]> {
  const supa = await createSupabaseServerClient();
  const { data } = await supa
    .from('encounters')
    .select('*, contacts(*)')
    .eq('rep_id', repId)
    .eq('state', 'pending')
    .order('occurred_at', { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    ...mapEncounter(row),
    contact: row.contacts ? mapContact(row.contacts) : null,
  }));
}

export async function getEncounterById(id: string): Promise<Encounter | null> {
  const supa = await createSupabaseServerClient();
  const { data } = await supa.from('encounters').select('*').eq('id', id).maybeSingle();
  return data ? mapEncounter(data) : null;
}

export interface CoverageRow {
  id: string;
  repId: string;
  repName: string;
  conferenceId: string;
  status: string;
}

export async function getConferenceCoverage(teamId: string): Promise<CoverageRow[]> {
  const supa = await createSupabaseServerClient();
  const { data } = await supa
    .from('coverage')
    .select('*, reps!inner(id, name, team_id)')
    .eq('reps.team_id', teamId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id as string,
    repId: row.rep_id as string,
    repName: (row.reps?.name ?? 'Unknown') as string,
    conferenceId: row.conference_id as string,
    status: row.status as string,
  }));
}

export interface FollowUpRow {
  encounterId: string;
  contactId: string | null;
  contactName: string;
  company: string | null;
  conferenceId: string | null;
  conferenceName: string | null;
  temperature: string | null;
  occurredAt: string;
  note: string | null;
  linkedinUrl: string | null;
  email: string | null;
  repId: string;
  repName: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFollowUpRow(row: any): FollowUpRow {
  const snap = row.identity_snapshot as { name?: string; company?: string } | null;
  return {
    encounterId: row.id as string,
    contactId: row.contact_id as string | null,
    contactName: (row.contacts?.canonical_name ?? snap?.name ?? 'Unknown') as string,
    company: (row.contacts?.current_company ?? snap?.company ?? null) as string | null,
    conferenceId: row.conference_id as string | null,
    conferenceName: (row.conferences?.name ?? null) as string | null,
    temperature: row.temperature as string | null,
    occurredAt: row.occurred_at as string,
    note: row.note as string | null,
    linkedinUrl: (row.contacts?.linkedin_url ?? null) as string | null,
    email: (row.contacts?.email ?? null) as string | null,
    repId: row.rep_id as string,
    repName: (row.reps?.name ?? 'Unknown') as string,
  };
}

const FOLLOWUP_SELECT =
  'id, rep_id, contact_id, conference_id, temperature, occurred_at, note, identity_snapshot, ' +
  'contacts(canonical_name, current_company, linkedin_url, email), conferences(name), reps!inner(id, name, team_id)';

// Team-wide follow-up queue — every flagged contact across the team, with the owning rep.
// Planning is a company-wide hub, so the lead sees the whole team's follow-ups, not just their own.
export async function getTeamFollowUps(teamId: string): Promise<FollowUpRow[]> {
  const supa = await createSupabaseServerClient();
  const { data } = await supa
    .from('encounters')
    .select(FOLLOWUP_SELECT)
    .eq('reps.team_id', teamId)
    .eq('follow_up', true)
    .order('occurred_at', { ascending: false });

  return (data ?? []).map(mapFollowUpRow);
}

export async function getFollowUps(repId: string): Promise<FollowUpRow[]> {
  const supa = await createSupabaseServerClient();
  const { data } = await supa
    .from('encounters')
    .select(FOLLOWUP_SELECT)
    .eq('rep_id', repId)
    .eq('follow_up', true)
    .order('occurred_at', { ascending: false });

  return (data ?? []).map(mapFollowUpRow);
}

// ── Coverage gap analysis (C6) ────────────────────────────────────────────────

export interface GapAnalysis {
  uncovered: { id: string; name: string; tier: string | null; icpScore: number | null; startDate: string | null; region: string | null }[];
  byRegion: { region: string; total: number; covered: number }[];
  byQuarter: { quarter: string; total: number; covered: number }[];
}

// Where the team is under-invested: high-value upcoming events with no committed rep, plus
// coverage rates by region and quarter. Drives the Coverage view's gap callouts.
export async function getGapAnalysis(teamId: string): Promise<GapAnalysis> {
  const supa = await createSupabaseServerClient();
  const today = new Date().toISOString().split('T')[0];

  const [{ data: confs }, { data: cov }] = await Promise.all([
    supa.from('conferences').select('id, name, tier, icp_score, start_date, region').gte('end_date', today),
    supa.from('coverage').select('conference_id, status, reps!inner(team_id)').eq('reps.team_id', teamId).eq('status', 'committed'),
  ]);

  const committed = new Set((cov ?? []).map((r) => r.conference_id as string));
  const upcoming = confs ?? [];

  const uncovered = upcoming
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((c: any) => (c.tier === 'T1' || c.tier === 'T2') && !committed.has(c.id))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any) => ({ id: c.id, name: c.name, tier: c.tier, icpScore: c.icp_score, startDate: c.start_date, region: c.region }))
    .sort((a, b) => (b.icpScore ?? 0) - (a.icpScore ?? 0));

  const regionMap = new Map<string, { total: number; covered: number }>();
  const quarterMap = new Map<string, { total: number; covered: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of upcoming as any[]) {
    const region = (c.region as string) ?? 'Unknown';
    const r = regionMap.get(region) ?? { total: 0, covered: 0 };
    r.total += 1;
    if (committed.has(c.id)) r.covered += 1;
    regionMap.set(region, r);

    if (c.start_date) {
      const d = new Date(c.start_date);
      const q = `${d.getUTCFullYear()} Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
      const qa = quarterMap.get(q) ?? { total: 0, covered: 0 };
      qa.total += 1;
      if (committed.has(c.id)) qa.covered += 1;
      quarterMap.set(q, qa);
    }
  }

  return {
    uncovered,
    byRegion: [...regionMap.entries()].map(([region, v]) => ({ region, ...v })).sort((a, b) => a.covered / a.total - b.covered / b.total),
    byQuarter: [...quarterMap.entries()].map(([quarter, v]) => ({ quarter, ...v })).sort((a, b) => a.quarter.localeCompare(b.quarter)),
  };
}

// ── Cross-conference relationship intelligence (C7) ───────────────────────────

export interface RelationshipRow {
  contactId: string;
  name: string;
  company: string | null;
  title: string | null;
  linkedinUrl: string | null;
  verdict: ArcVerdict | null;
  meetings: number;
  conferences: number;
  spanMonths: number | null;
  lastSeen: string;
  latestTemperature: string | null;
  hasFollowUp: boolean;
  conferenceTrail: string[]; // distinct conference names, chronological
  jobChange: boolean;        // company or title changed across encounters
}

// Contacts met ≥2 times across the team, with their relationship arc — the signature
// cross-conference view. Verdict comes from the cached arc (arc_cache); ranking surfaces the
// most actionable relationships (warming first, then at-risk cooling).
export async function getRelationshipList(teamId: string): Promise<RelationshipRow[]> {
  const supa = await createSupabaseServerClient();
  const { data } = await supa
    .from('encounters')
    .select(
      'contact_id, occurred_at, follow_up, temperature, conference_id, identity_snapshot, ' +
        'contacts!inner(id, canonical_name, current_company, current_title, linkedin_url, arc_cache), ' +
        'conferences(name), reps!inner(team_id)',
    )
    .eq('reps.team_id', teamId)
    .not('contact_id', 'is', null)
    .order('occurred_at', { ascending: true });

  // Group encounters by contact, then derive the arc summary fields.
  // jobChange is computed at the end from the accumulated company/title sets.
  type Agg = Omit<RelationshipRow, 'jobChange'> & { _companies: Set<string>; _titles: Set<string> };
  const byContact = new Map<string, Agg>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data ?? []) as any[]) {
    const c = row.contacts;
    if (!c) continue;
    const id = c.id as string;
    const snap = row.identity_snapshot as { company?: string | null; title?: string | null } | null;
    let agg = byContact.get(id);
    if (!agg) {
      const arc = c.arc_cache as ArcSummary | null;
      agg = {
        contactId: id,
        name: c.canonical_name as string,
        company: (c.current_company ?? null) as string | null,
        title: (c.current_title ?? null) as string | null,
        linkedinUrl: (c.linkedin_url ?? null) as string | null,
        verdict: (arc?.glance?.verdict ?? null) as ArcVerdict | null,
        meetings: 0,
        conferences: 0,
        spanMonths: (arc?.glance?.spanMonths ?? null) as number | null,
        lastSeen: row.occurred_at as string,
        latestTemperature: null,
        hasFollowUp: false,
        conferenceTrail: [],
        _companies: new Set<string>(),
        _titles: new Set<string>(),
      };
      byContact.set(id, agg);
    }
    agg.meetings += 1;
    agg.lastSeen = row.occurred_at as string; // ascending → last wins
    agg.latestTemperature = (row.temperature as string | null) ?? agg.latestTemperature;
    if (row.follow_up) agg.hasFollowUp = true;
    const confName = row.conferences?.name as string | undefined;
    if (confName && !agg.conferenceTrail.includes(confName)) agg.conferenceTrail.push(confName);
    if (snap?.company) agg._companies.add(snap.company);
    if (snap?.title) agg._titles.add(snap.title);
  }

  const VERDICT_RANK: Record<string, number> = {
    warming: 5, cooling: 4, nurturing: 3, tooearly: 2, tirekicker: 1,
  };

  return [...byContact.values()]
    .filter((r) => r.meetings >= 2)
    .map((r) => {
      const { _companies, _titles, ...rest } = r;
      return {
        ...rest,
        conferences: r.conferenceTrail.length,
        jobChange: _companies.size > 1 || _titles.size > 1,
      };
    })
    .sort((a, b) => {
      const rank = (VERDICT_RANK[b.verdict ?? ''] ?? 0) - (VERDICT_RANK[a.verdict ?? ''] ?? 0);
      if (rank !== 0) return rank;
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
    });
}

export async function searchContacts(q: string): Promise<Contact[]> {
  if (!q.trim()) return [];
  const supa = await createSupabaseServerClient();
  const safe = q.trim().replace(/[%_]/g, '\\$&'); // basic ilike escaping
  const { data } = await supa
    .from('contacts')
    .select('*')
    .or(
      `canonical_name.ilike.%${safe}%,current_company.ilike.%${safe}%,email.ilike.%${safe}%`,
    )
    .limit(12);

  return (data ?? []).map(mapContact);
}

// ── Mappers (snake_case → camelCase) ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConference(row: any): Conference {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location,
    country: row.country,
    region: row.region,
    verticals: row.verticals ?? [],
    estAudience: row.est_audience,
    icpScore: row.icp_score,
    tier: row.tier,
    scoreBreakdown: row.score_breakdown ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    source: row.source,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapContact(row: any): Contact {
  return {
    id: row.id,
    linkedinUrl: row.linkedin_url,
    canonicalName: row.canonical_name,
    currentCompany: row.current_company,
    currentTitle: row.current_title,
    email: row.email,
    arcCache: row.arc_cache ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEncounter(row: any): Encounter {
  return {
    id: row.id,
    contactId: row.contact_id,
    conferenceId: row.conference_id,
    repId: row.rep_id,
    occurredAt: row.occurred_at,
    audioPath: row.audio_path,
    transcript: row.transcript,
    note: row.note,
    temperature: row.temperature,
    topics: row.topics ?? [],
    fit: row.fit ?? null,
    followUp: row.follow_up,
    reminder: row.reminder,
    state: row.state,
    matchCandidates: row.match_candidates ?? null,
    identitySnapshot: row.identity_snapshot ?? null,
    provenance: row.provenance ?? null,
  };
}
