'use client';
import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { TemperaturePicker } from '@/components/field/TemperaturePicker';
import { MetBeforeHint } from '@/components/field/MetBeforeHint';
import { commitEncounter, runMatch } from '@/app/actions/field';
import type { Temperature, MatchCandidate } from '@/lib/types';

interface CaptureFormProps {
  conferenceId: string | null;
  repId: string;
  /** Pre-filled fields from a voice parse (empty on manual path) */
  prefill?: {
    name?: string; company?: string; title?: string;
    email?: string; note?: string; topics?: string[];
    temperature?: Temperature;
  };
}

export function CaptureForm({ conferenceId, repId, prefill = {} }: CaptureFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form fields
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

  // Match resolution state (F3)
  const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[]>([]);
  const [resolvedContactId, setResolvedContactId] = useState<string | null | undefined>(undefined);
  // undefined = not resolved yet; null = explicitly "new contact"; string = linked to existing

  // Debounced live matching — fires 800ms after the rep stops typing name/company/email
  useEffect(() => {
    if (name.trim().length < 3) {
      setMatchCandidates([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const result = await runMatch({
          name: name.trim(),
          company: company.trim() || null,
          title: null,
          email: email.trim() || null,
          linkedin: null,
        });
        setMatchCandidates(result.candidates);
        if (result.resolution === 'auto-match' && result.candidates[0]) {
          setResolvedContactId(result.candidates[0].contactId);
        } else if (result.candidates.length > 0 && resolvedContactId === undefined) {
          // leave resolvedContactId as undefined so MetBeforeHint prompts the rep
        }
      } catch {
        // Matching unavailable (e.g., no Anthropic key yet) — degrade gracefully
      }
    }, 800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, company, email]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function addTopic() {
    const t = topicInput.trim();
    if (t && !topics.includes(t)) setTopics([...topics, t]);
    setTopicInput('');
  }

  function removeTopic(t: string) {
    setTopics(topics.filter((x) => x !== t));
  }

  function handleTopicKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTopic();
    }
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
        // If user chose "decide later", save as pending
        state: resolvedContactId === undefined && matchCandidates.length > 0 ? 'pending' : 'confirmed',
        matchCandidates: matchCandidates.length > 0 ? matchCandidates : undefined,
      });

      if ('error' in result) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          const dest = conferenceId ? `/leads?conf=${conferenceId}` : '/leads';
          router.push(dest);
          router.refresh();
        }, 600);
      }
    });
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">✓</div>
        <p className="font-semibold text-zinc-900">Captured!</p>
        <p className="text-sm text-zinc-500">Heading to your leads…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Met before hint (F3) */}
      {matchCandidates.length > 0 && resolvedContactId === undefined && (
        <MetBeforeHint
          candidates={matchCandidates}
          onConfirm={(id) => setResolvedContactId(id)}
          onAddNew={() => setResolvedContactId(null)}
          onSaveLater={() => {
            // pending state — resolvedContactId stays undefined; submit will set state='pending'
            void handleSubmit(new Event('submit') as unknown as React.FormEvent);
          }}
        />
      )}

      {/* Core identity */}
      <div className="space-y-3">
        <Field label="Name *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Company">
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Stripe"
              className={inputClass}
            />
          </Field>
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Head of Payments"
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      {/* Temperature */}
      <Field label="Interest level">
        <TemperaturePicker value={temperature} onChange={setTemperature} />
      </Field>

      {/* Note */}
      <Field label="Notes">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you discuss? What was their reaction?"
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </Field>

      {/* Topics */}
      <Field label="Topics discussed">
        <div className="flex gap-2">
          <input
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={handleTopicKeyDown}
            placeholder="FX hedging, travel merchants…"
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={addTopic}
            className="flex-shrink-0 w-10 h-10 rounded-lg border border-zinc-300 flex items-center justify-center text-zinc-500 hover:border-zinc-400"
          >
            <Plus size={16} />
          </button>
        </div>
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {topics.map((t) => (
              <span key={t} className="flex items-center gap-1 text-xs bg-zinc-100 text-zinc-700 rounded-full pl-2.5 pr-1.5 py-1">
                {t}
                <button type="button" onClick={() => removeTopic(t)}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </Field>

      {/* Optional fields toggle */}
      <button
        type="button"
        onClick={() => setShowOptional(!showOptional)}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
      >
        {showOptional ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showOptional ? 'Hide' : 'Show'} optional fields
      </button>

      {showOptional && (
        <div className="space-y-3 p-4 bg-zinc-50 rounded-xl">
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@stripe.com"
              className={inputClass}
            />
          </Field>
          <Field label="LinkedIn URL">
            <input
              type="url"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/…"
              className={inputClass}
            />
          </Field>
        </div>
      )}

      {/* Follow-up */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={followUp}
          onChange={(e) => setFollowUp(e.target.checked)}
          className="w-5 h-5 rounded border-zinc-300 text-orange-500 accent-orange-500"
        />
        <span className="text-sm font-medium text-zinc-700">Flag for follow-up</span>
      </label>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="w-full h-12 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Saving…' : 'Save contact'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full h-10 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white';
