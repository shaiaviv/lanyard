import { redirect } from 'next/navigation';
import { FieldNav } from '@/components/field/FieldNav';
import { getCurrentRep, getPendingCount } from '@/lib/db/queries';

export default async function FieldLayout({ children }: { children: React.ReactNode }) {
  const rep = await getCurrentRep();

  // Middleware handles unauthenticated redirects, but if rep row is missing show a helpful error
  if (!rep) {
    redirect('/auth/login');
  }

  const pendingCount = await getPendingCount(rep.id);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Mobile frame — centered on desktop, full-width on mobile */}
      <div className="max-w-[430px] mx-auto min-h-screen flex flex-col bg-white relative">
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>
        <FieldNav pendingCount={pendingCount} />
      </div>
    </div>
  );
}
