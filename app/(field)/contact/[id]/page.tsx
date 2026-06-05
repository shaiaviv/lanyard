import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Mail, Star, Clock, Building2, User } from 'lucide-react';
import { getContactWithEncounters } from '@/lib/db/queries';
import { getBriefing } from '@/app/actions/field';
import { TemperatureChip } from '@/components/field/TemperaturePicker';

interface Props {
  params: Promise<{ id: string }>;
}

const VERDICT_LABELS: Record<string, { label: string; color: string }> = {
  warming:    { label: '📈 Warming',    color: 'text-green-700 bg-green-50 border-green-200' },
  nurturing:  { label: '🌱 Nurturing',  color: 'text-blue-700 bg-blue-50 border-blue-200' },
  tirekicker: { label: '🚗 Tire-kicker', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  cooling:    { label: '🌡️ Cooling',    color: 'text-red-700 bg-red-50 border-red-200' },
  tooearly:   { label: '⏳ Too early',  color: 'text-zinc-700 bg-zinc-50 border-zinc-200' },
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
      <header className="px-4 pt-12 pb-4 border-b border-zinc-100">
        <Link href="/leads" className="flex items-center gap-1 text-sm text-zinc-500 mb-4 hover:text-zinc-700">
          <ArrowLeft size={14} /> Leads
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">{contact.canonicalName}</h1>
            {contact.currentTitle && (
              <p className="text-sm text-zinc-600 flex items-center gap-1 mt-0.5">
                <User size={12} className="text-zinc-400" />
                {contact.currentTitle}
              </p>
            )}
            {contact.currentCompany && (
              <p className="text-sm text-zinc-500 flex items-center gap-1">
                <Building2 size={12} className="text-zinc-400" />
                {contact.currentCompany}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {contact.linkedinUrl && (
              <a
                href={contact.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <ExternalLink size={12} /> LinkedIn
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:underline"
              >
                <Mail size={12} /> Email
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 py-5 space-y-5">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: totalMeetings, label: 'meetings' },
            { value: conferences, label: 'events' },
            { value: arc ? `${arc.glance.spanMonths}mo` : '—', label: 'span' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-zinc-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-zinc-900">{value}</p>
              <p className="text-xs text-zinc-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Relationship verdict */}
        {verdictMeta && (
          <div className={`rounded-xl border px-4 py-3 ${verdictMeta.color}`}>
            <p className="text-sm font-semibold">{verdictMeta.label}</p>
            {arc?.howToApproach && (
              <p className="text-xs mt-1 opacity-80">{arc.howToApproach}</p>
            )}
          </div>
        )}

        {/* AI briefing */}
        {arc && (
          <div className="space-y-3">
            {arc.openThreads.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Open threads</h3>
                <ul className="space-y-1">
                  {arc.openThreads.map((t, i) => (
                    <li key={i} className="text-sm text-zinc-700 flex items-start gap-2">
                      <span className="text-orange-400 mt-0.5">•</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {arc.suggestedMove && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-orange-700 mb-1">Suggested next move</p>
                <p className="text-sm text-orange-900">{arc.suggestedMove}</p>
              </div>
            )}
          </div>
        )}

        {/* Encounter timeline */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Meeting history</h3>
          <div className="space-y-3">
            {encounters.map((enc) => (
              <div key={enc.id} className="border border-zinc-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <Clock size={11} />
                    {new Date(enc.occurredAt).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                  <TemperatureChip value={enc.temperature} />
                </div>
                {enc.note && <p className="text-sm text-zinc-700">{enc.note}</p>}
                {enc.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {enc.topics.map((t) => (
                      <span key={t} className="text-[11px] bg-zinc-100 text-zinc-600 rounded-full px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                )}
                {enc.followUp && (
                  <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
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
