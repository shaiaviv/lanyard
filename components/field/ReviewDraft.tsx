'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Plus, RotateCcw, X, ExternalLink } from 'lucide-react';
import { TemperaturePicker } from '@/components/field/TemperaturePicker';
import { MetBeforeHint } from '@/components/field/MetBeforeHint';
import { commitEncounter } from '@/app/actions/field';
import type { CaptureDraft } from '@/lib/types';
import type { Temperature, MatchCandidate } from '@/lib/types';

interface ReviewDraftProps {
  draft: CaptureDraft;
  conferenceId: string | null;
  repId: string;
  onRetry?: () => void;
}

const LOW = 0.7;

function confidence(field: string, conf: Record<string, number>): number {
  return conf[field] ?? 1;
}

function fieldClass(field: string, conf: Record<string, number>) {
  return confidence(field, conf) < LOW
    ? 'border-amber-400 bg-amber-50 focus:ring-amber-400'
    : 'border-zinc-300 bg-white focus:ring-orange-500';
}

const base =
  'w-full h-10 rounded-lg border px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors';

export function ReviewDraft({ draft, conferenceId, repId, onRetry }: ReviewDraftProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { parsed, transcript, matchCandidates: initCandidates, resolution, bestMatchId } = draft;
  const conf = parsed.confidencePerField ?? {};

  // Editable fields pre-filled from AI parse
  const [name, setName] = useState(parsed.name ?? '');
  const [company, setCompany] = useState(parsed.company ?? '');
  const [title, setTitle] = useState(parsed.title ?? '');
  const [email, setEmail] = useState(parsed.email ?? '');
  const [note, setNote] = useState(parsed.note ?? '');
  const [temperature, setTemperature] = useState<Temperature>(parsed.suggestedTemperature ?? 'warm');
  const [topics, setTopics] = useState<string[]>(parsed.topics ?? []);
  const [topicInput, setTopicInput] = useState('');
  const [followUp, setFollowUp] = useState(parsed.followUp ?? false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showOptional, setShowOptional] = useState(!!email);

  // Match resolution
  const [matchCandidates] = useState<MatchCandidate[]>(initCandidates);
  const [resolvedContactId, setResolvedContactId] = useState<string | null | undefined>(
    resolution === 'auto-match' && bestMatchId ? bestMatchId : undefined,
  );

  // LinkedIn candidates
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [selectedLinkedin, setSelectedLinkedin] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function addTopic() {
    const t = topicInput.trim();
    if (t && !topics.includes(t)) setTopics([...topics, t]);
    setTopicInput('');
  }

  async function handleSubmit() {
    if (!name.trim()) { setError('Name is required'); return; }
    setError(null);
    startTransition(async () => {
      const result = await commitEncounter({
        conferenceId,
        name: name.trim(),
        company: company.trim() || null,
        title: title.trim() || null,
        email: email.trim() || null,
        linkedin: selectedLinkedin ?? (linkedinUrl.trim() || null),
        note: note.trim() || null,
        temperature,
        topics,
        followUp,
        reminder: parsed.reminder ?? null,
        fit: parsed.fit,
        transcript,
        resolvedContactId: resolvedContactId ?? undefined,
        matchCandidates: matchCandidates.length > 0 ? matchCandidates : undefined,
        state: resolvedContactId === undefined && matchCandidates.length > 0 ? 'pending' : 'confirmed',
      });

      if ('error' in result) {
        setError(result.error);
      } else {
        setSuccess(true);
        const dest = conferenceId ? `/leads?conf=${conferenceId}` : '/leads';
        setTimeout(() => { router.push(dest); router.refresh(); }, 600);
      }
    });
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">✓</div>
        <p className="font-semibold text-zinc-900">Captured!</p>
        <p className="text-sm text-zinc-500">Heading to your leads…</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-zinc-900">Review capture</h2>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            <RotateCcw size={13} /> Re-record
          </button>
        )}
      </div>

      {/* Confidence legend */}
      {Object.values(conf).some((v) => v < LOW) && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-amber-500 text-sm">⚠</span>
          <p className="text-xs text-amber-700">
            Amber fields were low-confidence — please double-check them.
          </p>
        </div>
      )}

      {/* Met before (F3) */}
      {matchCandidates.length > 0 && resolvedContactId === undefined && (
        <MetBeforeHint
          candidates={matchCandidates}
          onConfirm={(id) => setResolvedContactId(id)}
          onAddNew={() => setResolvedContactId(null)}
          onSaveLater={() => { void handleSubmit(); }}
        />
      )}
      {resolution === 'auto-match' && bestMatchId && (
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
          <span className="text-orange-500">✓</span>
          <p className="text-xs text-orange-700 font-medium">
            Auto-linked to an existing contact (high confidence match).
          </p>
        </div>
      )}

      {/* Identity */}
      <div className="space-y-3">
        <Label text="Name *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className={`${base} ${fieldClass('name', conf)}`}
          />
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Label text="Company">
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Stripe"
              className={`${base} ${fieldClass('company', conf)}`}
            />
          </Label>
          <Label text="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Head of Payments"
              className={`${base} ${fieldClass('title', conf)}`}
            />
          </Label>
        </div>
      </div>

      {/* Temperature */}
      <Label text="Interest level (AI-estimated)">
        <TemperaturePicker value={temperature} onChange={setTemperature} />
      </Label>

      {/* Note */}
      <Label text="Note (AI-cleaned)">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className={`${base} h-auto py-2 resize-none ${fieldClass('note', conf)}`}
        />
      </Label>

      {/* Topics */}
      <Label text="Topics discussed">
        <div className="flex gap-2">
          <input
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTopic(); } }}
            placeholder="add topic…"
            className={`${base} flex-1`}
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
                <button type="button" onClick={() => setTopics(topics.filter((x) => x !== t))}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </Label>

      {/* LinkedIn candidates from enrichment */}
      {draft.linkedinCandidates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Verify LinkedIn</p>
          {draft.linkedinCandidates.map((c) => (
            <button
              key={c.linkedinUrl}
              type="button"
              onClick={() => setSelectedLinkedin(selectedLinkedin === c.linkedinUrl ? null : c.linkedinUrl)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                selectedLinkedin === c.linkedinUrl
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {c.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.photoUrl} alt={c.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 truncate">{c.name}</p>
                {c.title && c.company && (
                  <p className="text-xs text-zinc-500 truncate">{c.title} · {c.company}</p>
                )}
              </div>
              <ExternalLink size={13} className="text-zinc-400 flex-shrink-0" />
            </button>
          ))}
          {selectedLinkedin && (
            <p className="text-xs text-green-700 font-medium">✓ LinkedIn confirmed</p>
          )}
        </div>
      )}

      {/* Optional fields */}
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
          <Label text="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@stripe.com"
              className={`${base} ${fieldClass('email', conf)}`}
            />
          </Label>
          {!selectedLinkedin && (
            <Label text="LinkedIn URL">
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/…"
                className={base + ' border-zinc-300 bg-white focus:ring-orange-500'}
              />
            </Label>
          )}
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

      {/* Fit chip */}
      {parsed.fit && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>AI fit estimate:</span>
          <FitChip tier={parsed.fit.tier} />
          <span className="text-zinc-400 truncate">{parsed.fit.rationale}</span>
        </div>
      )}

      {/* Transcript toggle */}
      <div className="border border-zinc-100 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTranscript(!showTranscript)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          <span className="font-medium">Transcript</span>
          {showTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showTranscript && (
          <div className="px-4 pb-4 text-xs text-zinc-500 leading-relaxed border-t border-zinc-100 pt-3">
            {transcript || '(no transcript)'}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={isPending || !name.trim()}
        className="w-full h-12 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Saving…' : 'Confirm & save'}
      </button>
    </div>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{text}</p>
      {children}
    </div>
  );
}

function FitChip({ tier }: { tier: string }) {
  const map: Record<string, string> = {
    strong: 'bg-green-100 text-green-700',
    moderate: 'bg-blue-100 text-blue-700',
    weak: 'bg-zinc-100 text-zinc-500',
    unclear: 'bg-zinc-100 text-zinc-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full font-semibold ${map[tier] ?? map.unclear}`}>
      {tier}
    </span>
  );
}
