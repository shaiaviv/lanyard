'use client';
import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Plus, X, CheckCircle2 } from 'lucide-react';
import { TemperaturePicker } from '@/components/field/TemperaturePicker';
import { MetBeforeHint } from '@/components/field/MetBeforeHint';
import { commitEncounter, runMatch } from '@/app/actions/field';
import type { Temperature, MatchCandidate } from '@/lib/types';

interface CaptureFormProps {
  conferenceId: string | null;
  repId: string;
  prefill?: {
    name?: string; company?: string; title?: string;
    email?: string; note?: string; topics?: string[];
    temperature?: Temperature;
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold text-text3 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

export function CaptureForm({ conferenceId, repId, prefill = {} }: CaptureFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(prefill.name ?? '');
  const [company, setCompany] = useState(prefill.company ?? '');
  const [title, setTitle] = useState(prefill.title ?? '');
  const [email, setEmail] = useState(prefill.email ?? '');
  const [linkedin, setLinkedin] = useState('');
  const [note, setNote] = useState(prefill.note ?? '');
  const [temperature, setTemperature] = useState<Temperature>(prefill.temperature ?? 'warm');
  const [topics, setTopics] = useState<string[]>(prefill.topics ?? []);
  const [topicInput, setTopicInput] = useState('');
  const [followUp, setFollowUp] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[]>([]);
  const [resolvedContactId, setResolvedContactId] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (name.trim().length < 3) { setMatchCandidates([]); return; }
    const t = setTimeout(async () => {
      try {
        const result = await runMatch({
          name: name.trim(),
          company: company.trim() || null,
          title: title.trim() || null,
          email: email.trim() || null,
          linkedin: null,
        });
        setMatchCandidates(result.candidates);
        if (result.resolution === 'auto-match' && result.candidates[0]) {
          setResolvedContactId(result.candidates[0].contactId);
        }
      } catch {
        // degrade gracefully
      }
    }, 800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, company, email]);

  function addTopic() {
    const t = topicInput.trim();
    if (t && !topics.includes(t)) setTopics([...topics, t]);
    setTopicInput('');
  }

  function handleTopicKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTopic(); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setError(null);
    startTransition(async () => {
      const result = await commitEncounter({
        conferenceId,
        name: name.trim(),
        company: company.trim() || null,
        title: title.trim() || null,
        email: email.trim() || null,
        linkedin: linkedin.trim() || null,
        note: note.trim() || null,
        temperature,
        topics,
        followUp,
        reminder: null,
        resolvedContactId: resolvedContactId ?? undefined,
        state: resolvedContactId === undefined && matchCandidates.length > 0 ? 'pending' : 'confirmed',
        matchCandidates: matchCandidates.length > 0 ? matchCandidates : undefined,
      });
      if ('error' in result) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push(conferenceId ? `/leads?conf=${conferenceId}` : '/leads');
          router.refresh();
        }, 600);
      }
    });
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <CheckCircle2 size={24} className="text-success" />
        </div>
        <p className="font-semibold text-text1">Captured!</p>
        <p className="text-sm text-text2">Heading to your leads…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-4">
      {matchCandidates.length > 0 && resolvedContactId === undefined && (
        <MetBeforeHint
          candidates={matchCandidates}
          onConfirm={(id) => setResolvedContactId(id)}
          onAddNew={() => setResolvedContactId(null)}
          onSaveLater={() => { void handleSubmit(new Event('submit') as unknown as React.FormEvent); }}
        />
      )}

      <div className="space-y-3">
        <Field label="Name *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className="input-dark"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company">
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Stripe"
              className="input-dark"
            />
          </Field>
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Head of Payments"
              className="input-dark"
            />
          </Field>
        </div>
      </div>

      <Field label="Interest level">
        <TemperaturePicker value={temperature} onChange={setTemperature} />
      </Field>

      <Field label="Notes">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you discuss? What was their reaction?"
          rows={3}
          className="input-dark h-auto py-2.5 resize-none"
        />
      </Field>

      <Field label="Topics discussed">
        <div className="flex gap-2">
          <input
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={handleTopicKeyDown}
            placeholder="FX hedging, travel merchants…"
            className="input-dark flex-1"
          />
          <button
            type="button"
            onClick={addTopic}
            className="flex-shrink-0 w-10 h-[42px] rounded-xl bg-elevated flex items-center justify-center text-text3 hover:text-text2 transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Plus size={16} />
          </button>
        </div>
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {topics.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 text-xs text-accent rounded-full pl-2.5 pr-1.5 py-1"
                style={{
                  background: 'rgba(244,168,37,0.07)',
                  border: '1px solid rgba(244,168,37,0.15)',
                }}
              >
                {t}
                <button
                  type="button"
                  onClick={() => setTopics(topics.filter((x) => x !== t))}
                  className="hover:text-white transition-colors"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </Field>

      <button
        type="button"
        onClick={() => setShowOptional(!showOptional)}
        className="flex items-center gap-1.5 text-xs text-text3 hover:text-text2 transition-colors"
      >
        {showOptional ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {showOptional ? 'Hide' : 'Show'} optional fields
      </button>

      {showOptional && (
        <div
          className="space-y-3 p-4 bg-elevated rounded-xl"
          style={{ border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@stripe.com"
              className="input-dark"
            />
          </Field>
          <Field label="LinkedIn URL">
            <input
              type="url"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/…"
              className="input-dark"
            />
          </Field>
        </div>
      )}

      {/* Follow-up toggle */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
            followUp ? 'bg-accent border-accent' : 'bg-elevated group-hover:border-[rgba(255,255,255,0.2)]'
          }`}
          style={{ border: followUp ? 'none' : '1.5px solid rgba(255,255,255,0.15)' }}
          onClick={() => setFollowUp(!followUp)}
        >
          {followUp && <span className="text-[#07090F] text-xs font-bold leading-none">✓</span>}
        </div>
        <input
          type="checkbox"
          checked={followUp}
          onChange={(e) => setFollowUp(e.target.checked)}
          className="sr-only"
        />
        <span className="text-sm font-medium text-text2">Flag for follow-up</span>
      </label>

      {error && (
        <div
          className="rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="w-full h-12 rounded-xl bg-accent text-[#07090F] font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        style={{
          boxShadow:
            isPending || !name.trim() ? 'none' : '0 4px 20px rgba(244,168,37,0.22)',
        }}
      >
        {isPending ? 'Saving…' : 'Save contact'}
      </button>
    </form>
  );
}
