'use client';
import { useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/db/browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supa = createSupabaseBrowserClient();
    const { error } = await supa.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/capture');
      router.refresh();
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% -5%, rgba(244,168,37,0.14) 0%, transparent 65%), #07090F',
      }}
    >
      <div className="w-full max-w-[360px]">
        {/* Wordmark */}
        <div className="mb-10 text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent mb-5"
            style={{ boxShadow: '0 0 50px rgba(244,168,37,0.35), 0 4px 20px rgba(0,0,0,0.5)' }}
          >
            <Fingerprint size={30} className="text-[#07090F]" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-text1">Lanyard</h1>
          <p className="mt-2 text-sm text-text2">Conference intelligence for sales teams</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-2xl p-6 space-y-4"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}
        >
          <div>
            <label className="block text-[11px] font-semibold text-text3 uppercase tracking-wide mb-2">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-dark"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-text3 uppercase tracking-wide mb-2">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-dark"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              className="rounded-xl px-3 py-2.5"
              style={{
                background: 'rgba(239,68,68,0.07)',
                border: '1px solid rgba(239,68,68,0.18)',
              }}
            >
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-accent text-base font-bold text-[#07090F] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity mt-2"
            style={{ boxShadow: '0 4px 24px rgba(244,168,37,0.28)' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-text3">
          Account created by your admin via Supabase
        </p>
      </div>
    </div>
  );
}
