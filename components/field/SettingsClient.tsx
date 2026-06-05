'use client';
import { useState, useTransition } from 'react';
import { Key, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { saveServiceKey } from '@/app/actions/settings';
import type { KeyStatus } from '@/app/actions/settings';

// Mirror of ServiceName from lib/config/getServiceKey — defined here to avoid crossing the server-only boundary
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
    <div className="border border-zinc-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Key size={14} className="text-zinc-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-zinc-900">{config.label}</p>
        </div>
        {flashOk && (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <Check size={12} /> Saved
          </span>
        )}
        {hasMasked && !flashOk && (
          <span className="text-xs text-zinc-400 font-mono">
            {(status as { masked: string }).masked}
          </span>
        )}
        {!hasMasked && !editing && !flashOk && (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle size={11} /> Not set
          </span>
        )}
      </div>

      <p className="text-xs text-zinc-500">{config.desc}</p>

      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-orange-600 font-medium hover:text-orange-700 transition-colors"
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
              className="w-full h-9 rounded-lg border border-zinc-300 px-3 pr-9 text-sm font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600"
              tabIndex={-1}
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {err && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle size={11} /> {err}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending || !value.trim()}
              className="flex-1 h-8 rounded-lg bg-orange-500 text-white text-xs font-semibold disabled:opacity-40 transition-opacity"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setValue('');
                setErr(null);
                setShow(false);
              }}
              className="h-8 px-4 rounded-lg border border-zinc-200 text-zinc-600 text-xs hover:bg-zinc-50"
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

      <div className="bg-zinc-50 rounded-xl p-4 text-xs text-zinc-500 space-y-1.5">
        <p className="font-medium text-zinc-700">Env var fallback (dev)</p>
        <p>
          Keys saved here take priority. In local dev, you can also set{' '}
          <code className="bg-zinc-200 px-1 rounded font-mono">ANTHROPIC_API_KEY</code> in{' '}
          <code className="bg-zinc-200 px-1 rounded font-mono">.env</code> as a shortcut.
        </p>
        <p className="text-zinc-400">Keys are AES-256-GCM encrypted at rest and never sent to the browser.</p>
      </div>
    </div>
  );
}
