'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Search, ExternalLink, Building2, User, Loader2 } from 'lucide-react';
import { searchPeople } from '@/app/actions/field';
import type { Contact, PersonCandidate } from '@/lib/types';

function ContactCard({ c }: { c: Contact }) {
  return (
    <Link href={`/contact/${c.id}`} className="block group">
      <div
        className="bg-card rounded-2xl p-4 transition-all group-hover:-translate-y-0.5 group-hover:border-[rgba(255,255,255,0.12)]"
        style={{ border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-text1 truncate">{c.canonicalName}</p>
            {c.currentTitle && (
              <p className="text-sm text-text2 flex items-center gap-1.5 mt-1">
                <User size={11} className="text-text3 flex-shrink-0" />
                {c.currentTitle}
              </p>
            )}
            {c.currentCompany && (
              <p className="text-sm text-text2 flex items-center gap-1.5">
                <Building2 size={11} className="text-text3 flex-shrink-0" />
                {c.currentCompany}
              </p>
            )}
            {c.arcCache && (
              <p className="mt-2.5 text-xs text-text3 italic">
                {c.arcCache.glance.meetings} meeting{c.arcCache.glance.meetings !== 1 ? 's' : ''} · {c.arcCache.glance.verdict}
              </p>
            )}
          </div>
          {c.linkedinUrl && (
            <ExternalLink size={14} className="text-info flex-shrink-0 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </Link>
  );
}

function EnrichmentCard({ p }: { p: PersonCandidate }) {
  return (
    <div
      className="bg-card rounded-2xl p-4 transition-all hover:-translate-y-0.5"
      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-start gap-3">
        {p.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photoUrl} alt={p.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-1 ring-white/10" />
        ) : (
          <div
            className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center flex-shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <User size={16} className="text-text3" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text1 truncate">{p.name}</p>
          {p.title && <p className="text-sm text-text2 truncate">{p.title}</p>}
          {p.company && <p className="text-sm text-text3 truncate">{p.company}</p>}
          <a
            href={p.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-info hover:text-info/80 transition-colors"
          >
            <ExternalLink size={10} />
            View on LinkedIn
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LookupPage() {
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [enrichment, setEnrichment] = useState<PersonCandidate[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearched(true);
    startTransition(async () => {
      const result = await searchPeople(query.trim());
      setContacts(result.contacts);
      setEnrichment(result.enrichment);
    });
  }

  const hasResults = contacts.length > 0 || enrichment.length > 0;

  return (
    <div className="flex flex-col min-h-full animate-fade-in">
      {/* Header */}
      <header className="px-5 pt-12 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h1 className="text-xl font-bold text-text1">Look up</h1>
        <p className="text-sm text-text2 mt-0.5">Find a contact before you approach them</p>
      </header>

      <div className="px-5 py-5 space-y-5">
        {/* Search input */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or company…"
              className="input-dark pl-9"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !query.trim()}
            className="h-[42px] px-5 rounded-xl bg-accent text-[#07090F] font-bold text-sm disabled:opacity-40 flex items-center gap-1.5 transition-opacity hover:opacity-90 flex-shrink-0"
            style={{ boxShadow: query.trim() ? '0 4px 16px rgba(244,168,37,0.2)' : 'none' }}
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : 'Search'}
          </button>
        </form>

        {/* Results */}
        {hasResults && (
          <div className="space-y-6 animate-fade-up">
            {contacts.length > 0 && (
              <section className="space-y-2.5">
                <p className="text-xs font-medium text-text3">
                  Seen at previous conferences
                </p>
                {contacts.map((c) => <ContactCard key={c.id} c={c} />)}
              </section>
            )}

            {enrichment.length > 0 && (
              <section className="space-y-2.5">
                <p className="text-xs font-medium text-text3">
                  LinkedIn candidates
                </p>
                {enrichment.map((p) => <EnrichmentCard key={p.linkedinUrl} p={p} />)}
              </section>
            )}
          </div>
        )}

        {/* Empty after search */}
        {searched && !isPending && !hasResults && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2 animate-fade-up">
            <p className="font-semibold text-text2">No results for &ldquo;{query}&rdquo;</p>
            <p className="text-sm text-text3 leading-relaxed">
              They might be new — capture them after you meet
            </p>
          </div>
        )}

        {/* Idle state */}
        {!searched && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <Search size={28} strokeWidth={1.25} className="text-text3 mb-2" />
            <p className="text-sm font-medium text-text2">Search your team&apos;s contact history</p>
            <p className="text-xs text-text3">Combined with LinkedIn candidate lookup</p>
          </div>
        )}
      </div>
    </div>
  );
}
