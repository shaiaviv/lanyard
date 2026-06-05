// Server-only Supabase client with the SERVICE ROLE key — bypasses RLS.
// Use ONLY in trusted server code (AI pipeline, getServiceKey, privileged writes). NEVER import
// into client components. See plans/tech/00-tech-foundation.md §3.
import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error('Missing Supabase infra env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}
