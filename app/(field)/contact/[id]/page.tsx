import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Mail, Star, Clock, Building2, User } from 'lucide-react';
import { getContactWithEncounters } from '@/lib/db/queries';
import { getBriefing } from '@/app/actions/field';
import { TemperatureChip } from '@/components/field/TemperaturePicker';

interface Props {
  params: Promise<{ id: string }>;
}

const VERDICT_LABELS: Record<string, { label: string; bg: string; border: string; text: string }> = {
  warming:    { label: '↑ Warming',     bg: 'rgba(16,185,129,0.07)',  border: 'rgba(16,185,129,0.2)',  text: 'text-green-400' },
  nurturing:  { label: '◎ Nurturing',   bg: 'rgba(96,165,250,0.07)',  border: 'rgba(96,165,250,0.2)',  text: 'text-blue-400' },
  tirekicker: { label: '— Tire-kicker', bg: 'rgba(245,158,11,0.07)',  border: 'rgba(245,158,11,0.2)',  text: 'text-amber-400' },
  cooling:    { label: '↓ Cooling',     bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.2)',   text: 'text-red-400' },
  tooearly:   { label: '○ Too early',   bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', text: 'text-text2' },
};

export default async function ContactPage({ params }: Props) {
  const { id } = await params;
  const data = await getContactWithEncounters(id);
  if (!data) notFound();

  const { contact, encounters } = data;
  const arc = await getBriefing(id).catch(() => null);

  const totalMeetings = encounters.length;
  const conferences = [...new Set(encounters.map((e) => e.conferenceId).filter(Boolean))].length;
  const verdict = arc?.glance.verdict;
  const verdictMeta = verdict ? VERDICT_LABELS[verdict] : null;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="px-4 pt-12 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link
          href="/leads"
          className="flex items-center gap-1 text-sm text-text3 mb-4 hover:text-text2 transition-colors"
        >
          <ArrowLeft size={14} /> Leads
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-text1">{contact.canonicalName}</h1>
            {contact.currentTitle && (
              <p className="text-sm text-text2 flex items-center gap-1 mt-0.5">
                <User size={12} className="text-text3 flex-shrink-0" />
                {contact.currentTitle}
              </p>
            )}
            {contact.currentCompany && (
              <p className="text-sm text-text3 flex items-center gap-1">
                <Building2 size={12} className="text-text3 flex-shrink-0" />
                {contact.currentCompany}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {contact.linkedinUrl ? (
              <a
                href={contact.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-info hover:text-info/80 transition-colors"
              >
                <ExternalLink size={12} /> LinkedIn
              </a>
            ) : (
              <a
                href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent([contact.canonicalName, contact.currentCompany].filter(Boolean).join(' '))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-text3 hover:text-text2 transition-colors"
              >
                <ExternalLink size={12} /> Search LinkedIn
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-1 text-xs text-text3 hover:text-text2 transition-colors"
              >
                <Mail size={12} /> Email
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 py-5 space-y-5">
        {/* Compact stats row */}
        <div
          className="flex items-center gap-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span className="text-text1 font-semibold tabular-nums">{totalMeetings}</span>
          <span className="text-text3">meeting{totalMeetings !== 1 ? 's' : ''}</span>
          <span className="text-text3/30">·</span>
          <span className="text-text1 font-semibold tabular-nums">{conferences}</span>
          <span className="text-text3">event{conferences !== 1 ? 's' : ''}</span>
          {arc && (
            <>
              <span className="text-text3/30">·</span>
              <span className="text-text1 font-semibold tabular-nums">{arc.glance.spanMonths}mo</span>
              <span className="text-text3">span</span>
            </>
          )}
        </div>

        {/* Relationship verdict */}
        {verdictMeta && (
          <div
            className={`rounded-xl px-4 py-3 ${verdictMeta.text}`}
            style={{ background: verdictMeta.bg, border: `1px solid ${verdictMeta.border}` }}
          >
            <p className="text-sm font-semibold">{verdictMeta.label}</p>
            {arc?.howToApproach && (
              <p className="text-xs mt-1 opacity-75 leading-relaxed">{arc.howToApproach}</p>
            )}
          </div>
        )}

        {/* AI briefing */}
        {arc && (
          <div className="space-y-3">
            {arc.openThreads.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text3 mb-2">Open threads</p>
                <ul className="space-y-1.5">
                  {arc.openThreads.map((t, i) => (
                    <li key={i} className="text-sm text-text2 flex items-start gap-2 leading-relaxed">
                      <span className="text-accent mt-0.5 flex-shrink-0">·</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {arc.suggestedMove && (
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: 'rgba(244,168,37,0.06)', border: '1px solid rgba(244,168,37,0.15)' }}
              >
                <p className="text-xs font-semibold text-accent mb-1">Suggested next move</p>
                <p className="text-sm text-text1 leading-relaxed">{arc.suggestedMove}</p>
              </div>
            )}
          </div>
        )}

        {/* Encounter timeline */}
        <div>
          <p className="text-xs font-medium text-text3 mb-3">Meeting history</p>
          <div className="space-y-3">
            {encounters.map((enc) => (
              <div
                key={enc.id}
                className="rounded-xl p-4 space-y-2"
                style={{ border: '1px solid rgba(255,255,255,0.07)', background: '#161E2E' }}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-text3">
                    <Clock size={11} />
                    {new Date(enc.occurredAt).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                  <TemperatureChip value={enc.temperature} />
                </div>
                {enc.note && <p className="text-sm text-text2 leading-relaxed">{enc.note}</p>}
                {enc.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {enc.topics.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] text-text2 rounded-full px-2 py-0.5"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {enc.followUp && (
                  <span className="flex items-center gap-1 text-xs text-accent font-semibold">
                    <Star size={11} fill="currentColor" /> Follow up
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
