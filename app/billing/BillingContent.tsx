'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// No hardcoded PLANS array – we’ll fetch from the API
const PAYMENT_DETAILS = {
  mpesa: { type:'M-Pesa Send Money', name:'Ian Iraya Wainaina', number:'+254 757 662 968', instruction:'Send money to the number above. Use your company name as the reference.' },
  bank:  { bank:'Co-operative Bank of Kenya', branch:'YOUR BRANCH', accountName:'Ian Iraya Wainaina', accountNo:'XXXXXXXXXX', swiftCode:'KCOOKENA', instruction:'Transfer the exact amount. Use your company name as the payment reference.' },
  paypal:{ email:'irayaian8@gmail.com', instruction:'Send as Friends & Family to avoid fees. Include your company name in the note.' },
};

const REASONS: Record<string,{title:string;msg:string;color:string}> = {
  trial_expired: { title:'Free trial ended',      msg:'Choose a plan to continue.', color:'bg-amber-50 border-amber-300 text-amber-900' },
  past_due:      { title:'Payment required',       msg:'Please renew your subscription.',  color:'bg-red-50 border-red-300 text-red-900' },
  expired:       { title:'Subscription expired',   msg:'Your subscription period has ended.', color:'bg-orange-50 border-orange-300 text-orange-900' },
  suspended:     { title:'Account suspended',      msg:'Please renew to regain access.', color:'bg-red-50 border-red-300 text-red-900' },
  pending:       { title:'Payment under review',   msg:"We received your payment proof and are verifying it. You'll be notified once approved.", color:'bg-blue-50 border-blue-300 text-blue-900' },
};

type Step = 'plan'|'method'|'instructions'|'submitted';

// Shape of a plan returned by the API
interface Plan {
  id: string;           // real cuid – e.g. "clxyz123..."
  name: string;
  priceKES: number;
  priceUSD?: number;
  maxUsers: number;
  maxBookings: number;
  description?: string;
  features?: string[];  // could be JSON string; we'll parse if needed
}

export default function BillingPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const reason       = searchParams.get('reason') ?? '';

  const [step, setStep]               = useState<Step>('plan');
  const [plans, setPlans]             = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [method, setMethod]           = useState<'mpesa'|'bank'|'paypal'|''>('');
  const [reference, setReference]     = useState('');
  const [proofNote, setProofNote]     = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [status, setStatus]           = useState<any>(null);
  const [plansLoading, setPlansLoading] = useState(true);

  // Fetch plans from the API
  useEffect(() => {
    fetch('/api/plans')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch plans');
        return res.json();
      })
      .then(data => {
        setPlans(data);
        setPlansLoading(false);
      })
      .catch(err => {
        console.error('Error fetching plans:', err);
        setError('Could not load plans. Please refresh the page.');
        setPlansLoading(false);
      });
  }, []);

  // Fetch current subscription status
  useEffect(() => {
    fetch('/api/billing/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  const tenantName = (session?.user as any)?.tenant?.name;
  const reasonInfo = reason ? REASONS[reason] : null;

  async function submitPayment() {
    if (!selectedPlan || !method || !reference.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/billing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,      // ← real database ID, not a hardcoded string
          method,
          reference: reference.trim(),
          proofNote: proofNote.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Submission failed');
        setLoading(false);
        return;
      }
      setStep('submitted');
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header – unchanged */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">🦁</div>
          <span className="font-bold text-gray-900">SafariOps</span>
          {tenantName && <span className="text-gray-400 text-sm">· {tenantName}</span>}
        </div>
        {step !== 'submitted' && (
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to dashboard
          </button>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Reason alert */}
        {reasonInfo && step !== 'submitted' && (
          <div className={`border rounded-xl p-4 mb-6 ${reasonInfo.color}`}>
            <p className="font-semibold">{reasonInfo.title}</p>
            <p className="text-sm mt-1">{reasonInfo.msg}</p>
          </div>
        )}

        {/* Submitted state (unchanged) */}
        {step === 'submitted' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Payment submitted!</h1>
            <p className="text-gray-600 max-w-md mx-auto mb-8">Your payment proof has been sent to the owner for verification. You&apos;ll receive an email once activated — usually within a few hours.</p>
            <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-sm mx-auto mb-8 text-left space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Plan</span><span className="font-semibold">{selectedPlan?.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Method</span><span className="font-semibold">{method==='mpesa'?'M-Pesa':method==='bank'?'Bank Transfer':'PayPal'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Reference</span><span className="font-semibold font-mono">{reference}</span></div>
            </div>
            <button onClick={() => router.push('/dashboard')} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-xl">
              Go to dashboard
            </button>
          </div>
        )}

        {/* Plan selection step */}
        {step === 'plan' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Choose your plan</h1>
              <p className="text-gray-500 mt-2">Pay via M-Pesa, bank transfer, or PayPal. Activates within hours of verification.</p>
            </div>

            {/* Current status card (unchanged) */}
            {status && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Current status</p>
                  <p className="font-bold text-gray-900">{status.plan?.name ?? 'Free Trial'}</p>
                  {status.trialDaysRemaining !== null && status.trialDaysRemaining !== undefined && (
                    <p className="text-sm text-amber-600 mt-0.5">{status.trialDaysRemaining} trial days remaining</p>
                  )}
                </div>
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  status.subscriptionStatus==='active' ? 'bg-green-100 text-green-700' :
                  status.subscriptionStatus==='trial' ? 'bg-blue-100 text-blue-700' :
                  status.subscriptionStatus==='pending_payment' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {status.subscriptionStatus==='active' ? '✓ Active' :
                   status.subscriptionStatus==='trial' ? '⏳ Trial' :
                   status.subscriptionStatus==='pending_payment' ? '🕐 Pending' :
                   status.subscriptionStatus}
                </span>
              </div>
            )}

            {/* Loading or error state */}
            {plansLoading && (
              <div className="text-center py-12 text-gray-500">Loading plans...</div>
            )}
            {error && !plansLoading && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-center">
                {error}
              </div>
            )}

            {/* Dynamic plan cards */}
            {!plansLoading && !error && (
              <div className="grid gap-4">
                {plans.map(plan => {
                  // Determine if this plan is "popular" – you can add logic, e.g. based on name/price
                  const isPopular = plan.name.toLowerCase().includes('professional') || plan.priceKES === 8000;
                  // Parse features if stored as JSON string, otherwise use empty array
                  let features: string[] = [];
                  if (plan.features) {
                    if (typeof plan.features === 'string') {
                      try { features = JSON.parse(plan.features); } catch { features = []; }
                    } else if (Array.isArray(plan.features)) features = plan.features;
                  }
                  // Fallback default features based on name if none provided
                  if (features.length === 0) {
                    if (plan.name.toLowerCase().includes('starter')) features = ['Bookings & Clients','Invoices','Vouchers','Itineraries','1 User'];
                    else if (plan.name.toLowerCase().includes('professional')) features = ['Everything in Starter','Cost Sheets','Reports','Safari Rates','Up to 5 Users'];
                    else if (plan.name.toLowerCase().includes('agency')) features = ['Everything in Professional','Unlimited Users','White-label','Priority Support'];
                    else features = ['Basic features'];
                  }

                  return (
                    <div
                      key={plan.id}
                      onClick={() => { setSelectedPlan(plan); setStep('method'); }}
                      className={`bg-white rounded-2xl border-2 p-6 cursor-pointer transition-all hover:border-orange-400 hover:shadow-md ${
                        isPopular ? 'border-orange-300' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                            {isPopular && (
                              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">POPULAR</span>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm mt-0.5">
                            {plan.maxUsers === -1 ? 'Unlimited users' : `Up to ${plan.maxUsers} user${plan.maxUsers > 1 ? 's' : ''}`} ·{' '}
                            {plan.maxBookings === -1 ? 'Unlimited bookings' : `${plan.maxBookings} bookings/mo`}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {features.map(f => (
                              <span key={f} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                ✓ {f}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right ml-6 flex-shrink-0">
                          <p className="text-2xl font-bold text-gray-900">KES {plan.priceKES.toLocaleString()}</p>
                          {plan.priceUSD && <p className="text-gray-400 text-xs">${plan.priceUSD} USD / month</p>}
                          <div className="mt-2 bg-orange-500 text-white text-sm font-semibold px-4 py-1.5 rounded-lg">Select →</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Payment method selection (unchanged – same UI) */}
        {step === 'method' && selectedPlan && (
          <div>
            <button onClick={() => setStep('plan')} className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1">
              ← Back to plans
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose payment method</h2>
            <p className="text-gray-500 mb-6">
              Selected: <strong>{selectedPlan.name}</strong> — KES {selectedPlan.priceKES.toLocaleString()}/month
            </p>
            <div className="grid gap-4">
              {[
                {id:'mpesa', icon:'📱', label:'M-Pesa Send Money', desc:'Send directly to a phone number. Instant.'},
                {id:'bank',  icon:'🏦', label:'Co-operative Bank Transfer', desc:'EFT or branch transfer. 1 business day.'},
                {id:'paypal',icon:'💳', label:'PayPal', desc:'Pay via PayPal. Verified within hours.'}
              ].map(m => (
                <div
                  key={m.id}
                  onClick={() => { setMethod(m.id as any); setStep('instructions'); }}
                  className="bg-white border-2 border-gray-200 hover:border-orange-400 rounded-2xl p-5 cursor-pointer flex items-center gap-4 transition-all hover:shadow-md"
                >
                  <span className="text-3xl">{m.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{m.label}</p>
                    <p className="text-sm text-gray-500">{m.desc}</p>
                  </div>
                  <span className="ml-auto text-gray-400">→</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions & submission (unchanged except dynamic plan amount) */}
        {step === 'instructions' && selectedPlan && method && (
          <div>
            <button onClick={() => setStep('method')} className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1">
              ← Back
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment instructions</h2>
            <p className="text-gray-500 mb-6">
              Pay <strong>KES {selectedPlan.priceKES.toLocaleString()}</strong> using the details below, then enter your reference.
            </p>
            <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 mb-6">
              {method === 'mpesa' && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">📱</span>
                    <div><p className="font-bold text-gray-900">M-Pesa Send Money</p><p className="text-sm text-gray-500">Safaricom → Send Money</p></div>
                  </div>
                  <div className="space-y-3">
                    {[
                      {label:'Send to', value:PAYMENT_DETAILS.mpesa.number},
                      {label:'Name', value:PAYMENT_DETAILS.mpesa.name},
                      {label:'Amount', value:`KES ${selectedPlan.priceKES.toLocaleString()}`}
                    ].map(({label,value}) => (
                      <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-500 text-sm">{label}</span>
                        <span className="font-bold text-gray-900 font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 bg-amber-50 rounded-lg p-3 text-sm text-amber-800">💡 {PAYMENT_DETAILS.mpesa.instruction}</div>
                </>
              )}
              {method === 'bank' && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">🏦</span>
                    <div><p className="font-bold text-gray-900">{PAYMENT_DETAILS.bank.bank}</p><p className="text-sm text-gray-500">EFT / Online Banking / Branch</p></div>
                  </div>
                  <div className="space-y-3">
                    {[
                      {label:'Account Name', value:PAYMENT_DETAILS.bank.accountName},
                      {label:'Account Number', value:PAYMENT_DETAILS.bank.accountNo},
                      {label:'Branch', value:PAYMENT_DETAILS.bank.branch},
                      {label:'SWIFT', value:PAYMENT_DETAILS.bank.swiftCode},
                      {label:'Amount', value:`KES ${selectedPlan.priceKES.toLocaleString()}`}
                    ].map(({label,value}) => (
                      <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-500 text-sm">{label}</span>
                        <span className="font-semibold text-gray-900 font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 bg-amber-50 rounded-lg p-3 text-sm text-amber-800">💡 {PAYMENT_DETAILS.bank.instruction}</div>
                </>
              )}
              {method === 'paypal' && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">💳</span>
                    <div><p className="font-bold text-gray-900">PayPal</p><p className="text-sm text-gray-500">Send to the email below</p></div>
                  </div>
                  <div className="space-y-3">
                    {[
                      {label:'PayPal email', value:PAYMENT_DETAILS.paypal.email},
                      {label:'Amount (USD)', value:`$${selectedPlan.priceUSD || (selectedPlan.priceKES / 130).toFixed(2)}`}
                    ].map(({label,value}) => (
                      <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-500 text-sm">{label}</span>
                        <span className="font-bold text-blue-600">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 bg-amber-50 rounded-lg p-3 text-sm text-amber-800">💡 {PAYMENT_DETAILS.paypal.instruction}</div>
                </>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">After paying, enter your reference</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {method==='mpesa'?'M-Pesa confirmation code (e.g. QAB1234XYZ)':
                    method==='bank'?'Bank transfer reference / transaction ID':'PayPal transaction ID'} *
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={e=>setReference(e.target.value.toUpperCase())}
                  placeholder={method==='mpesa'?'QAB1234XYZ':method==='bank'?'TXN12345678':'PAYPAL-TXN-ID'}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Optional note to owner</label>
                <input
                  type="text"
                  value={proofNote}
                  onChange={e=>setProofNote(e.target.value)}
                  placeholder="e.g. Paid on 3rd May at 2:34 PM"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
              <button
                onClick={submitPayment}
                disabled={!reference.trim() || loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Submitting…' : '✅ Submit payment for verification'}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Your account will be activated once the owner verifies your payment, usually within a few hours.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}