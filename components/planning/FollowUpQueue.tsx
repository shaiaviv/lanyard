'use client';
import { useState, useTransition } from 'react';
import { ExternalLink, Loader2, Check, AlertCircle, Send } from 'lucide-react';
import { pushToHubSpot } from '@/app/actions/planning';
import { TemperatureChip } from '@/components/field/TemperaturePicker';
import type { FollowUpRow } from '@/lib/db/queries';
import type { Temperature } from '@/lib/types';

function HubSpotButton({ row }: { row: FollowUpRow }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { type: 'ok'; url: string } | { type: 'err'; msg: string } | null
  >(null);

  function push() {
    startTransition(async () => {
      const res = await pushToHubSpot({
        encounterId: row.encounterId,
        name: row.contactName,
        company: row.company,
        email: row.email,
        linkedinUrl: row.linkedinUrl,
        note: row.note,
      });
      if ('error' in res) {
        setResult({ type: 'err', msg: res.error });
      } else {
        setResult({ type: 'ok', url: res.contactUrl });
      }
    });
  }

  if (result?.type === 'ok') {
    return (
      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-success font-semibold hover:underline"
      >
        <Check size={12} /> In HubSpot
        <ExternalLink size={11} />
      </a>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={push}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs text-text2 hover:text-accent font-semibold rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-40"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
        Push to HubSpot
      </button>
      {result?.type === 'err' && (
        <p className="text-[10px] text-red-400 flex items-center gap-1">
          <AlertCircle size={10} /> {result.msg}
        </p>
      )}
    </div>
  );
}

export function FollowUpQueue({ followUps, repId }: { followUps: FollowUpRow[]; repId: string }) {
  const [sortBy, setSortBy] = useState<'date' | 'temp'>('date');
  const [scope, setScope] = useState<'all' | 'mine'>('all');

  const mineCount = followUps.filter((f) => f.repId === repId).length;

  const scoped = scope === 'mine' ? followUps.filter((f) => f.repId === repId) : followUps;
  const sorted = [...scoped].sort((a, b) => {
    if (sortBy === 'temp') {
      const order = ['hot', 'warm', 'lukewarm', 'cool', 'cold'];
      return order.indexOf(a.temperature ?? 'cold') - order.indexOf(b.temperature ?? 'cold');
    }
    return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
  });

  if (followUps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl bg-elevated flex items-center justify-center"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Send size={22} className="text-text3" />
        </div>
        <div>
          <h3 className="font-semibold text-text2">No follow-ups pending</h3>
          <p className="text-sm text-text3 mt-1 max-w-xs leading-relaxed">
            Flag contacts for follow-up during capture and they&apos;ll queue here for HubSpot push.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Scope: whole team vs just mine */}
        <div className="flex gap-1">
          {([
            { key: 'all', label: `Team (${followUps.length})` },
            { key: 'mine', label: `Mine (${mineCount})` },
          ] as const).map((o) => (
            <button
              key={o.key}
              onClick={() => setScope(o.key)}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                scope === o.key ? 'bg-elevated text-text1' : 'text-text3 hover:text-text2'
              }`}
              style={
                scope === o.key
                  ? { border: '1px solid rgba(255,255,255,0.12)' }
                  : { border: '1px solid rgba(255,255,255,0.06)' }
              }
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['date', 'temp'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                sortBy === s ? 'bg-elevated text-text1' : 'text-text3 hover:text-text2'
              }`}
              style={
                sortBy === s
                  ? { border: '1px solid rgba(255,255,255,0.12)' }
                  : { border: '1px solid rgba(255,255,255,0.06)' }
              }
            >
              {s === 'date' ? 'By date' : 'By heat'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((row) => (
          <div
            key={row.encounterId}
            className="bg-card rounded-2xl p-4 space-y-3"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-text1 truncate">{row.contactName}</p>
                  {row.temperature && (
                    <TemperatureChip value={row.temperature as Temperature} />
                  )}
                </div>
                {row.company && (
                  <p className="text-sm text-text2 truncate mt-0.5">{row.company}</p>
                )}
                <p className="text-xs text-text3 mt-1">
                  <span className="font-medium text-text2">
                    {row.repId === repId ? 'You' : row.repName}
                  </span>
                  {row.conferenceName && (
                    <>
                      {' · met at '}
                      <span className="font-medium text-text2">{row.conferenceName}</span>
                    </>
                  )}
                  {' · '}
                  {new Date(row.occurredAt).toLocaleDateString('en-GB', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                {row.note && (
                  <p className="text-xs text-text3 mt-1.5 italic line-clamp-2 leading-relaxed">
                    &ldquo;{row.note}&rdquo;
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {row.linkedinUrl && (
                  <a
                    href={row.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-info hover:text-info/80 transition-colors"
                  >
                    LinkedIn <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>

            <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <HubSpotButton row={row} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
