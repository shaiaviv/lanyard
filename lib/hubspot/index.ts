// HubSpot sync (C10) — the spine's terminal "Sync" stage. One-way, CURATED push of qualified
// conference leads into the CRM (foundation §4b): dedupe by email (search → update or create),
// the relationship ARC as an associated note, fit/temperature/"met at" context. Degrades to a
// labeled MOCK when no key is configured, so the flow is demoable without a HubSpot account.
import 'server-only';
import { getServiceKey } from '@/lib/config/getServiceKey';

const BASE = 'https://api.hubapi.com';
const NOTE_TO_CONTACT_ASSOC = 202; // HubSpot-defined association typeId

export interface HubspotContactInput {
  name: string;
  email: string | null;
  company: string | null;
  title: string | null;
  linkedinUrl: string | null;
  noteBody: string; // arc summary + context, pushed as an associated note
}

export interface HubspotPushResult {
  contactUrl: string;
  action: 'created' | 'updated' | 'mock';
  mock: boolean;
}

function splitName(name: string): { firstname: string; lastname: string } {
  const [first, ...rest] = (name || 'Unknown').trim().split(' ');
  return { firstname: first, lastname: rest.join(' ') };
}

async function hsFetch(key: string, path: string, init: RequestInit) {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

// Find an existing contact by email. Returns the contact id or null.
async function findByEmail(key: string, email: string): Promise<string | null> {
  const res = await hsFetch(key, '/crm/v3/objects/contacts/search', {
    method: 'POST',
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
      properties: ['email'],
      limit: 1,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: { id: string }[] };
  return data.results?.[0]?.id ?? null;
}

// Best-effort: attach the relationship arc as a note on the contact. Never fails the push.
async function createNote(key: string, contactId: string, body: string): Promise<void> {
  try {
    await hsFetch(key, '/crm/v3/objects/notes', {
      method: 'POST',
      body: JSON.stringify({
        properties: { hs_note_body: body.slice(0, 65_535), hs_timestamp: new Date().toISOString() },
        associations: [
          { to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: NOTE_TO_CONTACT_ASSOC }] },
        ],
      }),
    });
  } catch {
    /* note is best-effort */
  }
}

export async function pushContact(
  input: HubspotContactInput,
): Promise<{ ok: true; result: HubspotPushResult } | { ok: false; error: string }> {
  const key = await getServiceKey('hubspot');

  // ── Mock fallback: no key → simulate a successful, deduped push (labeled) ──
  if (!key) {
    return {
      ok: true,
      result: { contactUrl: 'https://app.hubspot.com/contacts', action: 'mock', mock: true },
    };
  }

  const { firstname, lastname } = splitName(input.name);
  const properties: Record<string, string> = { firstname, lastname };
  if (input.email) properties.email = input.email;
  if (input.company) properties.company = input.company;
  if (input.title) properties.jobtitle = input.title;
  if (input.linkedinUrl) properties.website = input.linkedinUrl;

  try {
    // Dedupe by email: update if the contact already exists, else create.
    const existingId = input.email ? await findByEmail(key, input.email) : null;

    let contactId: string;
    let action: 'created' | 'updated';
    if (existingId) {
      const res = await hsFetch(key, `/crm/v3/objects/contacts/${existingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties }),
      });
      if (!res.ok) return { ok: false, error: await errorMessage(res) };
      contactId = existingId;
      action = 'updated';
    } else {
      const res = await hsFetch(key, '/crm/v3/objects/contacts', {
        method: 'POST',
        body: JSON.stringify({ properties }),
      });
      if (!res.ok) return { ok: false, error: await errorMessage(res) };
      const data = (await res.json()) as { id: string };
      contactId = data.id;
      action = 'created';
    }

    if (input.noteBody.trim()) await createNote(key, contactId, input.noteBody);

    return {
      ok: true,
      result: { contactUrl: `${'https://app.hubspot.com/contacts/'}${contactId}`, action, mock: false },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

async function errorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  return body.message ?? `HubSpot error ${res.status}`;
}
