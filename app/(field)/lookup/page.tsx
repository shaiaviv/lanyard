'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Search, ExternalLink, Building2, User } from 'lucide-react';
import { searchPeople } from '@/app/actions/field';
import type { Contact, PersonCandidate } from '@/lib/types';

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

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="px-4 pt-12 pb-4 border-b border-zinc-100">
        <h1 className="text-xl font-bold text-zinc-900">Look up</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Find a contact before you approach them</p>
      </header>

      <div className="px-4 py-5 space-y-5">
        {/* Search input */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or company…"
              className="w-full h-11 rounded-xl border border-zinc-300 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !query.trim()}
            className="h-11 px-5 rounded-xl bg-orange-500 text-white font-semibold text-sm disabled:opacity-40"
          >
            {isPending ? '…' : 'Search'}
          </button>
        </form>

        {/* Existing contacts (from our DB) */}
        {contacts.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              Seen at previous conferences
            </h2>
            <div className="space-y-2">
              {contacts.map((c) => (
                <Link key={c.id} href={`/contact/${c.id}`}>
                  <div className="bg-white border border-zinc-200 rounded-xl p-4 hover:border-orange-200 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-zinc-900">{c.canonicalName}</p>
                        {c.currentTitle && (
                          <p className="text-sm text-zinc-500 flex items-center gap-1 mt-0.5">
                            <User size={11} className="text-zinc-400" />{c.currentTitle}
                          </p>
                        )}
                        {c.currentCompany && (
                          <p className="text-sm text-zinc-500 flex items-center gap-1">
                            <Building2 size={11} className="text-zinc-400" />{c.currentCompany}
                          </p>
                        )}
                      </div>
                      {c.linkedinUrl && (
                        <ExternalLink size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                    {c.arcCache && (
                      <p className="mt-2 text-xs text-zinc-500 italic">
                        {c.arcCache.glance.meetings} meeting{c.arcCache.glance.meetings !== 1 ? 's' : ''} · {c.arcCache.glance.verdict}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* LinkedIn enrichment candidates */}
        {enrichment.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              LinkedIn candidates
            </h2>
            <div className="space-y-2">
              {enrichment.map((p) => (
                <div key={p.linkedinUrl} className="bg-white border border-zinc-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoUrl} alt={p.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                        <User size={16} className="text-zinc-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900">{p.name}</p>
                      {p.title && <p className="text-sm text-zinc-500">{p.title}</p>}
                      {p.company && <p className="text-sm text-zinc-400">{p.company}</p>}
                      <a
                        href={p.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <ExternalLink size={10} /> View profile
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state after search */}
        {searched && !isPending && contacts.length === 0 && enrichment.length === 0 && (
          <div className="text-center py-10">
            <p className="text-zinc-500 font-medium">No results for &quot;{query}&quot;</p>
            <p className="text-sm text-zinc-400 mt-1">They might be new — capture them after you meet</p>
          </div>
        )}

        {/* Idle state */}
        {!searched && (
          <p className="text-center text-sm text-zinc-400 py-8">
            Search your team&apos;s contact history + LinkedIn
          </p>
        )}
      </div>
    </div>
  );
}
