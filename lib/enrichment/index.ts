// Lanyard — enrichment provider (T1 shipping-risk isolation).
// LinkedIn/email lookup is external + risky (APIs, auth, cost, ToS). We hide it behind ONE
// interface with a mock fallback, so the app works end-to-end (and demos) with no live provider.
// See plans/tech/00-tech-foundation.md §5.

import type { PersonCandidate } from '@/lib/types';

export interface EnrichmentProvider {
  /** name+company → candidate people (LinkedIn verify F2 + pre-brief F7). May return []. */
  searchPerson(q: { name: string; company?: string }): Promise<PersonCandidate[]>;
}

/**
 * Default provider when no enrichment key is configured. Returns []. The UI MUST degrade
 * gracefully to manual entry when candidates are empty (LinkedIn preferred, not mandatory).
 * A small seeded set is included so the build/demo can show the verify flow without a live API.
 */
export class MockEnrichmentProvider implements EnrichmentProvider {
  constructor(private readonly seed: PersonCandidate[] = MOCK_SEED) {}

  async searchPerson(q: { name: string; company?: string }): Promise<PersonCandidate[]> {
    const name = q.name?.trim().toLowerCase() ?? '';
    if (!name) return [];
    // naive contains-match against the seed so the verify UI has something to render in demos
    return this.seed.filter(
      (p) =>
        p.name.toLowerCase().includes(name) ||
        (q.company && p.company?.toLowerCase().includes(q.company.toLowerCase())),
    );
  }
}

/**
 * Real provider (Clay / Apollo / PDL / Proxycurl). Selected at runtime when its key is set.
 * Left unimplemented here on purpose — wire to the chosen vendor in the build, behind this same
 * interface, so nothing else in the app changes.
 */
export class RealEnrichmentProvider implements EnrichmentProvider {
  constructor(private readonly apiKey: string) {}
  async searchPerson(_q: { name: string; company?: string }): Promise<PersonCandidate[]> {
    // TODO(build): call the configured enrichment vendor; map response → PersonCandidate[].
    throw new Error('RealEnrichmentProvider not yet wired — set ENRICHMENT provider in Settings.');
  }
}

/** Runtime selection: real provider iff a key exists, else mock. (Key via getServiceKey.) */
export function getEnrichmentProvider(apiKey?: string | null): EnrichmentProvider {
  return apiKey ? new RealEnrichmentProvider(apiKey) : new MockEnrichmentProvider();
}

// Tiny seed so demos can show the LinkedIn-verify flow with no live provider.
const MOCK_SEED: PersonCandidate[] = [
  { linkedinUrl: 'https://linkedin.com/in/sarah-chen-demo', name: 'Sarah Chen', title: 'Treasury Lead', company: 'Adyen' },
  { linkedinUrl: 'https://linkedin.com/in/marco-rossi-demo', name: 'Marco Rossi', title: 'Head of Payments', company: 'Stripe' },
  { linkedinUrl: 'https://linkedin.com/in/priya-nair-demo', name: 'Priya Nair', title: 'VP Treasury', company: 'Wise' },
];
