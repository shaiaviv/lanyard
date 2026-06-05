'use client';
import { useState, useTransition } from 'react';
import { Sparkles, Loader2, Plus, Check, Search, MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { discoverConferencesAction, addDiscoveredConference } from '@/app/actions/planning';
import type { DiscoveredCandidate } from '@/lib/types';

function CandidateCard({ c }: { c: DiscoveredCandidate }) {
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function add() {
    setErr(null);
    startTransition(async () => {
      const res = await addDiscoveredConference(c);
      if ('error' in res) setErr(res.error);
      else setAdded(true);
    });
  }

  const start = c.startDate ? new Date(c.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {c.tier && <Badge variant={c.tier as 'T1' | 'T2' | 'T3'}>{c.tier}</Badge>}
          {c.icpScore != null && (
            <span className="text-xs font-bold tabular-nums text-accent">ICP {c.icpScore}</span>
          )}
        </div>
        {added ? (
          <span className="flex items-center gap-1 text-xs text-success font-semibold">
            <Check size={12} /> Added
          </span>
        ) : (
          <button
            onClick={add}
            disabled={isPending}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-accent hover:bg-accent/15 transition-colors disabled:opacity-40"
          >
            {isPending ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            Add to database
          </button>
        )}
      </div>
      <h4 className="text-sm font-bold text-text1 leading-snug">{c.name}</h4>
      <div className="flex items-center gap-3 text-xs text-text3 flex-wrap mt-1">
        {start && <span>{start}</span>}
        {c.location && <span className="flex items-center gap-1"><MapPin size={10} /> {c.location}</span>}
        {c.estAudience && <span className="flex items-center gap-1"><Users size={10} /> {c.estAudience.toLocaleString()}</span>}
      </div>
      <p className="text-[11px] text-text2 mt-2 leading-relaxed">{c.whyRelevant}</p>
      {err && <p className="text-[11px] text-red-400 mt-1">{err}</p>}
    </div>
  );
}

export function DiscoverPanel() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<DiscoveredCandidate[] | null>(null);
  const [mock, setMock] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function search() {
    setErr(null);
    startTransition(async () => {
      const res = await discoverConferencesAction(query);
      if ('error' in res) {
        setErr(res.error);
        setResults(null);
      } else {
        setResults(res.candidates);
        setMock(res.mock);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-accent/15 bg-accent/[0.04] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-accent" />
        <span className="text-sm font-semibold text-text1">Discover events with AI</span>
      </div>
      <p className="text-xs text-text3 leading-relaxed">
        Find ICP-fit conferences not yet in your database. Each result is auto-scored with the same engine.
      </p>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="e.g. payments & treasury events in APAC, H2"
          className="flex-1 bg-base border border-white/10 rounded-lg px-3 py-2 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 outline-none"
        />
        <button
          onClick={search}
          disabled={isPending}
          className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg bg-accent text-[#07090F] hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </div>

      {err && <p className="text-xs text-red-400">{err}</p>}

      {results && (
        <div className="space-y-2.5">
          {mock && (
            <p className="text-[11px] text-amber-400/80">
              Demo results (no Anthropic key set) — add a key in Settings for live AI discovery.
            </p>
          )}
          {results.length === 0 ? (
            <p className="text-xs text-text3">No new events found — they may already be in your database.</p>
          ) : (
            results.map((c) => <CandidateCard key={c.name} c={c} />)
          )}
        </div>
      )}
    </div>
  );
}
