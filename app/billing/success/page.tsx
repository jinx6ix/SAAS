'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
export default function BillingSuccessPage() {
  const router = useRouter();
  const [count, setCount] = useState(5);
  useEffect(() => {
    const t = setInterval(() => setCount(c => { if (c <= 1) { clearInterval(t); router.push('/dashboard'); } return c - 1; }), 1000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✅</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Account activated!</h1>
        <p className="text-gray-600 mb-8">Your subscription is now active. Welcome to SafariOps!</p>
        <div className="bg-white rounded-2xl border border-green-200 p-6 mb-6">
          <p className="text-sm text-gray-500">Redirecting in {count} second{count !== 1 ? 's' : ''}…</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors">
          Go to dashboard →
        </button>
      </div>
    </div>
  );
}
