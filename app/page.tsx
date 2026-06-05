import { redirect } from 'next/navigation';

// Root → field capture (primary experience)
export default function RootPage() {
  redirect('/capture');
}
