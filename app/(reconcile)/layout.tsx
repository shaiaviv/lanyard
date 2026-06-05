import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ReconcileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-base" style={{ background: '#07090F' }}>
      <div className="max-w-[640px] mx-auto min-h-screen bg-surface" style={{ background: '#0C1220' }}>
        <header className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-[rgba(255,255,255,0.06)]">
          <Link
            href="/leads"
            className="p-2 rounded-full hover:bg-elevated text-text2 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-text1">Reconcile</h1>
            <p className="text-xs text-text3">Confirm pending contact matches</p>
          </div>
        </header>
        <main className="px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
