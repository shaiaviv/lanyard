import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ReconcileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-[640px] mx-auto min-h-screen bg-white">
        <header className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-zinc-100">
          <Link href="/leads" className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-zinc-900">Reconcile</h1>
            <p className="text-xs text-zinc-500">Confirm pending contact matches</p>
          </div>
        </header>
        <main className="px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
