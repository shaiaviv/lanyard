import { redirect } from 'next/navigation';
import { FieldNav } from '@/components/field/FieldNav';
import { getCurrentRep, getPendingCount } from '@/lib/db/queries';

export default async function FieldLayout({ children }: { children: React.ReactNode }) {
  const rep = await getCurrentRep();
  if (!rep) redirect('/auth/login');
  const pendingCount = await getPendingCount(rep.id);

  return (
    <div className="min-h-screen bg-base" style={{ background: '#07090F' }}>
      <div className="max-w-[430px] mx-auto min-h-screen flex flex-col bg-surface relative" style={{ background: '#0C1220' }}>
        <main className="flex-1 overflow-y-auto pb-28">{children}</main>
        <FieldNav pendingCount={pendingCount} />
      </div>
    </div>
  );
}
