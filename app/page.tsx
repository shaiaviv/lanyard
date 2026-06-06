import { redirect } from 'next/navigation';

// Root → planning hub (primary experience)
export default function RootPage() {
  redirect('/planning');
}
