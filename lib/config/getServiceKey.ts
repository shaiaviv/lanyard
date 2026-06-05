// Resolve a SERVICE key (Anthropic, enrichment, HubSpot).
// PRIMARY source = in-app Settings (encrypted in app_settings); env is a dev fallback.
// Server-only. See plans/tech/00-tech-foundation.md §4/§6.
import 'server-only';
import { createAdminClient } from '@/lib/db/admin';
import { decryptSecret } from '@/lib/config/crypto';

export type ServiceName = 'anthropic' | 'enrichment' | 'hubspot';

const ENV_FALLBACK: Record<ServiceName, string | undefined> = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  enrichment: process.env.ENRICHMENT_API_KEY,
  hubspot: process.env.HUBSPOT_API_KEY,
};

/** Returns the decrypted key, or null if unconfigured (UI should prompt "configure in Settings"). */
export async function getServiceKey(name: ServiceName): Promise<string | null> {
  try {
    const supa = createAdminClient();
    const { data } = await supa
      .from('app_settings')
      .select('key_ciphertext')
      .eq('key_name', name)
      .limit(1)
      .maybeSingle();
    if (data?.key_ciphertext) return decryptSecret(data.key_ciphertext);
  } catch {
    // fall through to env (e.g. Supabase not configured yet in local dev)
  }
  return ENV_FALLBACK[name] ?? null;
}

export class MissingServiceKeyError extends Error {
  constructor(public service: ServiceName) {
    super(`No API key configured for "${service}". Add it in Settings.`);
  }
}
