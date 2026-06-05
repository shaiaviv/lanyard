import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getKeyStatuses } from '@/app/actions/settings';
import { SettingsClient } from '@/components/field/SettingsClient';

export default async function SettingsPage() {
  const statuses = await getKeyStatuses();

  return (
    <div className="flex flex-col">
      <header className="px-4 pt-12 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link
          href="/capture"
          className="flex items-center gap-1 text-sm text-text3 mb-4 hover:text-text2 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 className="text-xl font-bold text-text1">Settings</h1>
        <p className="text-sm text-text3 mt-0.5">API keys and configuration</p>
      </header>

      <div className="px-4 py-6">
        <SettingsClient statuses={statuses} />
      </div>
    </div>
  );
}
