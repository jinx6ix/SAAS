import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminBillingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const role = (session.user as any).role;
  const tenantId = (session.user as any).tenantId as string;
  if (role !== 'ADMIN') redirect('/dashboard');

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      plan: true,
      paymentRequests: { orderBy: { createdAt: 'desc' }, take: 10, include: { plan: { select: { name: true } } } },
      _count: { select: { users: true, bookings: true, clients: true } },
    },
  });
  if (!tenant) redirect('/login');

  let trialDaysRemaining: number | null = null;
  if (tenant.subscriptionStatus === 'trial' && tenant.trialEndsAt) {
    const ms = new Date(tenant.trialEndsAt).getTime() - Date.now();
    trialDaysRemaining = Math.max(0, Math.ceil(ms / 86400000));
  }

  const sc: Record<string, string> = {
    active:'bg-green-100 text-green-800', trial:'bg-blue-100 text-blue-800',
    pending_payment:'bg-yellow-100 text-yellow-800', past_due:'bg-red-100 text-red-800',
    suspended:'bg-gray-100 text-gray-700',
  };

  const methodLabel = (m: string) => m==='mpesa'?'📱 M-Pesa':m==='bank'?'🏦 Co-op Bank':'💳 PayPal';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Billing &amp; Subscription</h1><p className="text-gray-500 text-sm mt-1">Manage your plan and payment history</p></div>
        <Link href="/billing" className="btn-primary">Subscribe / Renew</Link>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Current Plan</h2>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-2xl font-bold text-gray-900">{tenant.plan?.name ?? 'Free Trial'}</p>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${sc[tenant.subscriptionStatus]||'bg-gray-100 text-gray-700'}`}>
                {tenant.subscriptionStatus==='active'?'✓ Active':tenant.subscriptionStatus==='trial'?'⏳ Trial':tenant.subscriptionStatus==='pending_payment'?'🕐 Pending':tenant.subscriptionStatus}
              </span>
            </div>
            {tenant.plan && <p className="text-gray-500 mt-1">KES {tenant.plan.priceKES.toLocaleString()}/month</p>}
            {trialDaysRemaining !== null && <p className={`text-sm font-medium mt-2 ${trialDaysRemaining<=3?'text-red-600':'text-amber-600'}`}>⏳ {trialDaysRemaining} day{trialDaysRemaining!==1?'s':''} left in free trial</p>}
            {tenant.currentPeriodEnd && tenant.subscriptionStatus==='active' && <p className="text-sm text-gray-500 mt-2">Next renewal: {new Date(tenant.currentPeriodEnd).toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric'})}</p>}
            {tenant.subscriptionStatus==='pending_payment' && <p className="text-sm text-blue-600 mt-2">🕐 Payment is being verified. You&apos;ll receive an email once activated.</p>}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[{label:'Users',used:tenant._count.users,max:tenant.plan?.maxUsers??1},{label:'Bookings',used:tenant._count.bookings,max:tenant.plan?.maxBookings??50},{label:'Clients',used:tenant._count.clients,max:-1}].map(({label,used,max})=>{
              const pct = max===-1?0:Math.min(100,Math.round((used/max)*100));
              const over = max!==-1&&used>=max;
              return (
                <div key={label} className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{used}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                  {max!==-1&&<><div className="w-full bg-gray-100 rounded-full h-1.5 mt-1"><div className={`h-1.5 rounded-full ${over?'bg-red-500':'bg-orange-400'}`} style={{width:`${pct}%`}}/></div><p className={`text-xs mt-0.5 ${over?'text-red-500 font-medium':'text-gray-400'}`}>{over?'Limit reached':`of ${max}`}</p></>}
                  {max===-1&&<p className="text-xs text-gray-400 mt-0.5">Unlimited</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {tenant.paymentRequests.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Payment History</h2>
          <div className="divide-y divide-gray-100">
            {tenant.paymentRequests.map(pr => (
              <div key={pr.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-800">{pr.plan.name} Plan</p>
                  <p className="text-gray-400 text-xs">{methodLabel(pr.method)} · Ref: <span className="font-mono">{pr.reference}</span></p>
                  <p className="text-gray-400 text-xs">{new Date(pr.createdAt).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">KES {pr.amount.toLocaleString()}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${pr.status==='approved'?'bg-green-100 text-green-700':pr.status==='pending'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{pr.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {['trial','pending_payment'].includes(tenant.subscriptionStatus) && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white">
          <h3 className="font-bold text-lg">{tenant.subscriptionStatus==='pending_payment'?'Payment submitted — awaiting verification':'Ready to subscribe?'}</h3>
          <p className="text-orange-100 text-sm mt-1 mb-4">{tenant.subscriptionStatus==='pending_payment'?"If you haven't heard back within 24 hours, contact the owner directly.":'Pay via M-Pesa, bank transfer, or PayPal.'}</p>
          {tenant.subscriptionStatus!=='pending_payment'&&<Link href="/billing" className="bg-white text-orange-600 font-semibold px-6 py-2.5 rounded-xl hover:bg-orange-50 transition-colors inline-block">Subscribe Now →</Link>}
        </div>
      )}
    </div>
  );
}
