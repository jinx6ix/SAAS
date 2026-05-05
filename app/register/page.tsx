'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,50); }
export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ companyName:'', companySlug:'', companyEmail:'', companyPhone:'', adminName:'', adminEmail:'', adminPassword:'' });
  const [slugOk, setSlugOk] = useState<boolean|null>(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (form.companyName) setForm(f => ({...f, companySlug: slugify(f.companyName)})); }, [form.companyName]);
  useEffect(() => {
    if (!form.companySlug) return; setChecking(true); setSlugOk(null);
    const t = setTimeout(async () => { const r = await fetch(`/api/tenant/register?slug=${form.companySlug}`); setSlugOk((await r.json()).available); setChecking(false); }, 500);
    return () => clearTimeout(t);
  }, [form.companySlug]);
  function change(e: React.ChangeEvent<HTMLInputElement>) { setForm(f => ({...f, [e.target.name]: e.target.value})); setError(''); }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (slugOk === false) return; setLoading(true); setError('');
    const r = await fetch('/api/tenant/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
    const d = await r.json();
    if (!r.ok) { setError(d.error||'Registration failed'); setLoading(false); return; }
    router.push('/login?registered=1');
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-white text-2xl">🦁</div>
          <h1 className="text-3xl font-bold text-gray-900">Start your free trial</h1>
          <p className="text-gray-500 mt-2">14 days free · No payment required to sign up</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center mb-8">
            {[1,2].map(s => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step>=s?'bg-orange-500 text-white':'bg-gray-100 text-gray-400'}`}>{s}</div>
                <p className={`ml-2 text-sm font-medium ${step>=s?'text-gray-900':'text-gray-400'}`}>{s===1?'Company Info':'Admin Account'}</p>
                {s<2&&<div className={`flex-1 h-0.5 mx-4 ${step>s?'bg-orange-300':'bg-gray-100'}`}/>}
              </div>
            ))}
          </div>
          <form onSubmit={submit}>
            {step===1&&(
              <div className="space-y-5">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input type="text" name="companyName" value={form.companyName} onChange={change} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">URL slug <span className="text-gray-400 font-normal">(app.com/<strong>{form.companySlug||'slug'}</strong>)</span></label>
                  <div className="relative"><input type="text" name="companySlug" value={form.companySlug} onChange={change} required pattern="[a-z0-9-]+" className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${slugOk===false?'border-red-400':slugOk===true?'border-green-400':'border-gray-300'}`}/>
                    <span className="absolute right-3 top-2.5">{checking?'⏳':slugOk===true?'✅':slugOk===false?'❌':''}</span></div>
                  {slugOk===false&&<p className="text-red-500 text-xs mt-1">Already taken.</p>}</div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Company Email *</label>
                  <input type="email" name="companyEmail" value={form.companyEmail} onChange={change} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                  <input type="tel" name="companyPhone" value={form.companyPhone} onChange={change} placeholder="+254 757 662 968" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/></div>
                <button type="button" onClick={()=>setStep(2)} disabled={!form.companyName||!form.companySlug||!form.companyEmail||slugOk===false}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-lg">Continue →</button>
              </div>
            )}
            {step===2&&(
              <div className="space-y-5">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                  <input type="text" name="adminName" value={form.adminName} onChange={change} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Your Email *</label>
                  <input type="email" name="adminEmail" value={form.adminEmail} onChange={change} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input type="password" name="adminPassword" value={form.adminPassword} onChange={change} required minLength={8} placeholder="At least 8 characters" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/></div>
                {error&&<div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
                <div className="flex gap-3">
                  <button type="button" onClick={()=>setStep(1)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50">← Back</button>
                  <button type="submit" disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 rounded-lg">{loading?'Creating…':'Start free trial →'}</button>
                </div>
              </div>
            )}
          </form>
        </div>
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account? <Link href="/login" className="text-orange-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
