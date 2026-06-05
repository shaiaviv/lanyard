// Server-side DB query helpers. All functions create a server Supabase client (RLS-scoped).
import 'server-only';
import { createSupabaseServerClient } from '@/lib/db/server';
import type { Contact, Conference, Encounter, Rep } from '@/lib/types';

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
}

export async function getFollowUps(repId: string): Promise<FollowUpRow[]> {
  const supa = await createSupabaseServerClient();
  const { data } = await supa
    .from('encounters')
    .select('id, contact_id, conference_id, temperature, occurred_at, note, identity_snapshot, contacts(canonical_name, current_company, linkedin_url, email), conferences(name)')
    .eq('rep_id', repId)
    .eq('follow_up', true)
    .order('occurred_at', { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => {
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
    };
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
