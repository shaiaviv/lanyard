'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Plus, RotateCcw, X, ExternalLink, CheckCircle2 } from 'lucide-react';
import { TemperaturePicker } from '@/components/field/TemperaturePicker';
import { MetBeforeHint } from '@/components/field/MetBeforeHint';
import { commitEncounter } from '@/app/actions/field';
import type { CaptureDraft, Temperature, MatchCandidate } from '@/lib/types';

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

function inputClass(field: string, conf: Record<string, number>) {
  return confidence(field, conf) < LOW ? 'input-dark input-dark-warn' : 'input-dark';
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-text3 uppercase tracking-wide">{text}</p>
      {children}
    </div>
  );
}

function FitChip({ tier }: { tier: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    strong:  { bg: 'rgba(16,185,129,0.1)',  text: 'text-green-400' },
    moderate:{ bg: 'rgba(96,165,250,0.1)',  text: 'text-blue-400' },
    weak:    { bg: 'rgba(255,255,255,0.05)', text: 'text-text3' },
    unclear: { bg: 'rgba(255,255,255,0.05)', text: 'text-text3' },
  };
  const s = styles[tier] ?? styles.unclear;
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.text}`}
      style={{ background: s.bg }}
    >
      {tier}
    </span>
  );
}

export function ReviewDraft({ draft, conferenceId, repId, onRetry }: ReviewDraftProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { parsed, transcript, matchCandidates: initCandidates, resolution, bestMatchId } = draft;
  const conf = parsed.confidencePerField ?? {};

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
  const [matchCandidates] = useState<MatchCandidate[]>(initCandidates);
  const [resolvedContactId, setResolvedContactId] = useState<string | null | undefined>(
    resolution === 'auto-match' && bestMatchId ? bestMatchId : undefined,
  );
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
        localStorage.removeItem('lanyard:pending_draft');
        setSuccess(true);
        const dest = conferenceId ? `/leads?conf=${conferenceId}` : '/leads';
        setTimeout(() => { router.push(dest); router.refresh(); }, 600);
      }
    });
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
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

  const hasLowConfidence = Object.values(conf).some((v) => v < LOW);

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-text1">Review capture</h2>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 text-xs text-text3 hover:text-text2 transition-colors"
          >
            <RotateCcw size={13} /> Re-record
          </button>
        )}
      </div>

      {/* Confidence legend */}
      {hasLowConfidence && (
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{
            background: 'rgba(245,158,11,0.07)',
            border: '1px solid rgba(245,158,11,0.15)',
          }}
        >
          <span className="text-warn text-sm">⚠</span>
          <p className="text-xs text-warn/80">
            Highlighted fields were low-confidence — please double-check.
          </p>
        </div>
      )}

      {/* Match hint */}
      {matchCandidates.length > 0 && resolvedContactId === undefined && (
        <MetBeforeHint
          candidates={matchCandidates}
          onConfirm={(id) => setResolvedContactId(id)}
          onAddNew={() => setResolvedContactId(null)}
          onSaveLater={() => { void handleSubmit(); }}
        />
      )}

      {resolution === 'auto-match' && bestMatchId && (
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(244,168,37,0.06)', border: '1px solid rgba(244,168,37,0.14)' }}
        >
          <span className="text-accent">✓</span>
          <p className="text-xs text-accent/80 font-medium">
            Auto-linked to an existing contact (high confidence).
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
            className={inputClass('name', conf)}
          />
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Label text="Company">
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Stripe"
              className={inputClass('company', conf)}
            />
          </Label>
          <Label text="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Head of Payments"
              className={inputClass('title', conf)}
            />
          </Label>
        </div>
      </div>

      <Label text="Interest level (AI-estimated)">
        <TemperaturePicker value={temperature} onChange={setTemperature} />
      </Label>

      <Label text="Note (AI-cleaned)">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className={`${inputClass('note', conf)} h-auto py-2.5 resize-none`}
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
                style={{ background: 'rgba(244,168,37,0.07)', border: '1px solid rgba(244,168,37,0.15)' }}
              >
                {t}
                <button type="button" onClick={() => setTopics(topics.filter((x) => x !== t))}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </Label>

      {/* LinkedIn candidates */}
      {draft.linkedinCandidates.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-text3">Verify LinkedIn</p>
          {draft.linkedinCandidates.map((c) => (
            <button
              key={c.linkedinUrl}
              type="button"
              onClick={() => setSelectedLinkedin(selectedLinkedin === c.linkedinUrl ? null : c.linkedinUrl)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                selectedLinkedin === c.linkedinUrl
                  ? 'border-2 border-accent/40 bg-[rgba(244,168,37,0.05)]'
                  : 'border border-[rgba(255,255,255,0.07)] bg-elevated hover:border-[rgba(255,255,255,0.12)]'
              }`}
            >
              {c.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.photoUrl} alt={c.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text1 truncate">{c.name}</p>
                {c.title && c.company && (
                  <p className="text-xs text-text2 truncate">{c.title} · {c.company}</p>
                )}
              </div>
              <ExternalLink size={13} className="text-text3 flex-shrink-0" />
            </button>
          ))}
          {selectedLinkedin && (
            <p className="text-xs text-success font-medium">✓ LinkedIn confirmed</p>
          )}
        </div>
      )}

      {/* Optional fields */}
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
          <Label text="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@stripe.com"
              className={inputClass('email', conf)}
            />
          </Label>
          {!selectedLinkedin && (
            <Label text="LinkedIn URL">
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/…"
                className="input-dark"
              />
            </Label>
          )}
        </div>
      )}

      {/* Follow-up */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
            followUp ? 'bg-accent' : 'bg-elevated group-hover:border-[rgba(255,255,255,0.2)]'
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

      {/* Fit chip */}
      {parsed.fit && (
        <div className="flex items-center gap-2 text-xs text-text3">
          <span className="shrink-0 whitespace-nowrap">AI fit estimate:</span>
          <FitChip tier={parsed.fit.tier} />
          <span className="text-text3 truncate min-w-0">{parsed.fit.rationale}</span>
        </div>
      )}

      {/* Transcript toggle */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <button
          type="button"
          onClick={() => setShowTranscript(!showTranscript)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-text2 hover:bg-elevated transition-colors"
        >
          <span className="font-medium">Transcript</span>
          {showTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showTranscript && (
          <div
            className="px-4 pb-4 pt-3 text-xs text-text3 leading-relaxed"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            {transcript || '(no transcript)'}
          </div>
        )}
      </div>

      {error && (
        <div
          className="rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isPending || !name.trim()}
        className="w-full h-12 rounded-xl bg-accent text-[#07090F] font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        style={{ boxShadow: '0 4px 20px rgba(244,168,37,0.22)' }}
      >
        {isPending ? 'Saving…' : 'Confirm & save'}
      </button>
    </div>
  );
}
