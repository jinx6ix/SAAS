'use client';
import { useState } from 'react';
export const dynamic = 'force-dynamic';   // ✅ add this line
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
export default function LoginPage() {
  const router = useRouter(); const sp = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setError('Invalid email or password.');
    else router.push('/dashboard');
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500 mb-4 text-2xl">🦁</div>
          <h1 className="text-white text-2xl font-bold">SafariOps</h1>
          <p className="text-gray-400 text-sm mt-1">Travel Operations Platform</p>
        </div>
        <div className="px-8 py-8">
          {sp.get('registered') === '1' && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">
              ✅ Account created! Your 14-day free trial has started. Sign in below.
            </div>
          )}
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign in to your account</h2>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 rounded-lg transition-colors">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-orange-600 font-semibold hover:underline">Start free trial →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
