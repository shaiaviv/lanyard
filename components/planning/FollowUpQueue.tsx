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
        className="flex items-center gap-1.5 text-xs text-green-700 font-medium hover:underline"
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
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-600 font-medium border border-zinc-200 rounded-lg px-2.5 py-1.5 hover:border-orange-300 transition-colors disabled:opacity-40"
      >
        {isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Send size={12} />
        )}
        Push to HubSpot
      </button>
      {result?.type === 'err' && (
        <p className="text-[10px] text-red-500 flex items-center gap-1">
          <AlertCircle size={10} /> {result.msg}
        </p>
      )}
    </div>
  );
}

export function FollowUpQueue({ followUps }: { followUps: FollowUpRow[] }) {
  const [sortBy, setSortBy] = useState<'date' | 'temp'>('date');

  const sorted = [...followUps].sort((a, b) => {
    if (sortBy === 'temp') {
      const order = ['hot', 'warm', 'lukewarm', 'cool', 'cold'];
      return order.indexOf(a.temperature ?? 'cold') - order.indexOf(b.temperature ?? 'cold');
    }
    return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
  });

  if (followUps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="text-4xl">📬</div>
        <h3 className="font-semibold text-zinc-700">No follow-ups pending</h3>
        <p className="text-sm text-zinc-400 max-w-xs">
          Flag contacts for follow-up during capture and they&apos;ll queue here for HubSpot push.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {followUps.length} contact{followUps.length !== 1 ? 's' : ''} flagged for follow-up
        </p>
        <div className="flex gap-1">
          {(['date', 'temp'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                sortBy === s
                  ? 'bg-zinc-800 text-white border-zinc-800'
                  : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
              }`}
            >
              {s === 'date' ? 'By date' : 'By heat'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((row) => (
          <div key={row.encounterId} className="border border-zinc-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-zinc-900 truncate">{row.contactName}</p>
                  {row.temperature && (
                    <TemperatureChip value={row.temperature as Temperature} />
                  )}
                </div>
                {row.company && (
                  <p className="text-sm text-zinc-500 truncate mt-0.5">{row.company}</p>
                )}
                {row.conferenceName && (
                  <p className="text-xs text-zinc-400 mt-1">
                    met at <span className="font-medium">{row.conferenceName}</span>
                    {' · '}
                    {new Date(row.occurredAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                  </p>
                )}
                {row.note && (
                  <p className="text-xs text-zinc-400 mt-1.5 italic line-clamp-2">&ldquo;{row.note}&rdquo;</p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {row.linkedinUrl && (
                  <a
                    href={row.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    LinkedIn <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-3">
              <HubSpotButton row={row} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
