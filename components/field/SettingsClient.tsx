'use client';
import { useState, useTransition } from 'react';
import { Key, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { saveServiceKey } from '@/app/actions/settings';
import type { KeyStatus } from '@/app/actions/settings';

type ServiceName = 'anthropic' | 'enrichment' | 'hubspot';

const KEY_CONFIGS: {
  name: ServiceName;
  label: string;
  desc: string;
  placeholder: string;
  docsUrl: string;
}[] = [
  {
    name: 'anthropic',
    label: 'Anthropic (Claude)',
    desc: 'Voice parse, match adjudication, briefing, conference scoring. Voice transcription uses your browser — no extra key needed.',
    placeholder: 'sk-ant-api03-…',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    name: 'enrichment',
    label: 'Enrichment provider',
    desc: 'LinkedIn candidate lookup (Clay / Apollo / PDL — mock used without key)',
    placeholder: 'API key…',
    docsUrl: '#',
  },
  {
    name: 'hubspot',
    label: 'HubSpot',
    desc: 'Push qualified leads to CRM',
    placeholder: 'pat-na1-…',
    docsUrl: 'https://app.hubspot.com/private-apps',
  },
];

function KeyCard({
  config,
  initial,
}: {
  config: (typeof KEY_CONFIGS)[0];
  initial: KeyStatus;
}) {
  const [status, setStatus] = useState<KeyStatus>(initial);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [flashOk, setFlashOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasMasked = 'masked' in status;

  function handleSave() {
    setErr(null);
    startTransition(async () => {
      const result = await saveServiceKey(config.name, value);
      if ('error' in result) {
        setErr(result.error);
      } else {
        setStatus({ masked: result.masked });
        setEditing(false);
        setValue('');
        setShow(false);
        setFlashOk(true);
        setTimeout(() => setFlashOk(false), 2500);
      }
    });
  }

  return (
    <div
      className="bg-card rounded-2xl p-4 space-y-3"
      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg bg-elevated flex items-center justify-center flex-shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Key size={13} className="text-text3" />
          </div>
          <p className="text-sm font-semibold text-text1">{config.label}</p>
        </div>
        <div className="flex-shrink-0">
          {flashOk && (
            <span className="flex items-center gap-1 text-xs text-success font-medium">
              <Check size={12} /> Saved
            </span>
          )}
          {hasMasked && !flashOk && (
            <span className="text-[11px] text-text3 font-mono">
              {(status as { masked: string }).masked}
            </span>
          )}
          {!hasMasked && !editing && !flashOk && (
            <span className="flex items-center gap-1 text-xs text-warn/80">
              <AlertCircle size={11} /> Not set
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-text3 leading-relaxed">{config.desc}</p>

      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-accent font-semibold hover:text-accent-dim transition-colors"
        >
          {hasMasked ? 'Update key' : '+ Add key'}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && value.trim() && handleSave()}
              placeholder={config.placeholder}
              className="input-dark pr-10 font-mono text-xs"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-text2 transition-colors"
              tabIndex={-1}
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {err && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle size={11} /> {err}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending || !value.trim()}
              className="flex-1 h-9 rounded-xl bg-accent text-[#07090F] text-xs font-bold disabled:opacity-40 transition-opacity"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setValue(''); setErr(null); setShow(false); }}
              className="h-9 px-4 rounded-xl text-text2 text-xs hover:text-text1 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsClient({ statuses }: { statuses: Record<ServiceName, KeyStatus> }) {
  return (
    <div className="space-y-3">
      {KEY_CONFIGS.map((config) => (
        <KeyCard key={config.name} config={config} initial={statuses[config.name]} />
      ))}

      <div
        className="rounded-2xl p-4 space-y-1.5 text-xs"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="font-semibold text-text2">Env var fallback (dev)</p>
        <p className="text-text3 leading-relaxed">
          Keys saved here take priority. In local dev, you can also set{' '}
          <code
            className="rounded px-1 font-mono"
            style={{ background: 'rgba(255,255,255,0.07)', color: '#EEF2FF' }}
          >
            ANTHROPIC_API_KEY
          </code>{' '}
          in{' '}
          <code
            className="rounded px-1 font-mono"
            style={{ background: 'rgba(255,255,255,0.07)', color: '#EEF2FF' }}
          >
            .env
          </code>{' '}
          as a shortcut.
        </p>
        <p className="text-text3">Keys are AES-256-GCM encrypted at rest and never sent to the browser.</p>
      </div>
    </div>
  );
}
