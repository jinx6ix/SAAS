'use client';
// app/admin/page.tsx — Full Owner Admin Dashboard
import { useEffect, useState, useCallback } from 'react';
export const dynamic = 'force-dynamic';   // ✅ add this line
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Plan = { id: string; name: string; priceKES: number; priceUSD: number };
type PayReq = { id: string; method: string; reference: string; amount: number; currency: string; createdAt: string; proofNote: string | null; plan: { name: string; priceKES: number } };
type Tenant = {
  id: string; name: string; slug: string; email: string; phone: string | null;
  subscriptionStatus: string; createdAt: string; currentPeriodEnd: string | null; trialEndsAt: string | null;
  plan: Plan | null; planId: string | null;
  _count: { users: number; bookings: number; clients: number; invoices: number; vouchers: number };
  paymentRequests: PayReq[];
};

type AuditEntry = { id: string; action: string; tenantId: string | null; actorId: string | null; details: Record<string, any>; timestamp: string };

const SC: Record<string, string> = {
  active: 'bg-green-100 text-green-700', trial: 'bg-blue-100 text-blue-700',
  pending_payment: 'bg-yellow-100 text-yellow-800', past_due: 'bg-red-100 text-red-700',
  suspended: 'bg-gray-100 text-gray-600', canceled: 'bg-gray-100 text-gray-500',
};

const METHOD_LABEL: Record<string, string> = { mpesa: '📱 M-Pesa', bank: '🏦 Co-op Bank', paypal: '💳 PayPal' };

type Tab = 'overview' | 'tenants' | 'logs';

export default function AdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab]                         = useState<Tab>('overview');
  const [data, setData]                       = useState<{ summary: any; tenants: Tenant[]; plans: Plan[] } | null>(null);
  const [logs, setLogs]                       = useState<AuditEntry[]>([]);
  const [logsTotal, setLogsTotal]             = useState(0);
  const [loading, setLoading]                 = useState(true);
  const [actionLoading, setActionLoading]     = useState<string | null>(null);
  const [toast, setToast]                     = useState('');
  const [toastError, setToastError]           = useState(false);
  const [filter, setFilter]                   = useState<string>('all');
  const [search, setSearch]                   = useState('');
  const [selectedTenant, setSelectedTenant]   = useState<Tenant | null>(null);
  const [modal, setModal]                     = useState<'plan' | 'delete' | 'suspend' | null>(null);
  const [modalPlanId, setModalPlanId]         = useState('');
  const [modalNote, setModalNote]             = useState('');
  const [deleteReason, setDeleteReason]       = useState('');

  const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL;

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') { router.push('/login'); return; }
    if (sessionStatus === 'authenticated') { loadData(); loadLogs(); }
  }, [sessionStatus]);

  useEffect(() => {
    const msg = searchParams.get('approved') || searchParams.get('rejected');
    if (msg) showToast(searchParams.get('approved') ? `✅ Approved: ${msg}` : `❌ Rejected: ${msg}`, !searchParams.get('approved'));
  }, [searchParams]);

  function showToast(msg: string, isError = false) {
    setToast(msg); setToastError(isError);
    setTimeout(() => setToast(''), 4000);
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tenants');
      if (res.status === 403) { router.push('/dashboard'); return; }
      setData(await res.json());
    } catch {}
    setLoading(false);
  }, [router]);

  const loadLogs = useCallback(async (tenantId?: string) => {
    try {
      const url = `/api/admin/logs?limit=50${tenantId ? `&tenantId=${tenantId}` : ''}`;
      const res = await fetch(url);
      const d   = await res.json();
      setLogs(d.logs || []);
      setLogsTotal(d.total || 0);
    } catch {}
  }, []);

  async function action(tenantId: string, act: string, extra?: Record<string, any>) {
    setActionLoading(`${tenantId}-${act}`);
    try {
      const res  = await fetch('/api/admin/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ tenantId, action: act, ...extra }),
      });
      const body = await res.json();
      if (body.success) {
        showToast(`✅ ${act} completed successfully`);
        loadData(); loadLogs();
      } else showToast(body.error || 'Error', true);
    } catch { showToast('Network error', true); }
    setActionLoading(null);
  }

  async function setPlan(tenantId: string, planId: string, status?: string, note?: string) {
    setActionLoading(`${tenantId}-setplan`);
    try {
      const res  = await fetch('/api/admin/tenant-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ tenantId, planId, status: status || 'active', note }),
      });
      const body = await res.json();
      if (body.success) { showToast('✅ Plan updated'); loadData(); loadLogs(); setModal(null); }
      else showToast(body.error || 'Error', true);
    } catch { showToast('Network error', true); }
    setActionLoading(null);
  }

  async function deleteTenant(tenantId: string, reason: string) {
    if (!reason.trim()) { showToast('Please enter a reason', true); return; }
    setActionLoading(`${tenantId}-delete`);
    try {
      const res  = await fetch('/api/admin/tenants', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ tenantId, reason }),
      });
      const body = await res.json();
      if (body.success) { showToast('✅ Tenant deleted'); loadData(); loadLogs(); setModal(null); setSelectedTenant(null); }
      else showToast(body.error || 'Error', true);
    } catch { showToast('Network error', true); }
    setActionLoading(null);
  }

  const pending  = data?.tenants.filter(t => t.paymentRequests.length > 0) ?? [];
  const filtered = (data?.tenants ?? []).filter(t => {
    const matchStatus = filter === 'all' || t.subscriptionStatus === filter;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (sessionStatus === 'loading' || loading) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="text-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/><p className="text-gray-400">Loading…</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium text-white ${toastError ? 'bg-red-600' : 'bg-gray-900'}`}>{toast}</div>}

      {/* Header */}
      <div className="bg-[#1a1a2e] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-lg">👑</div>
          <div>
            <p className="font-bold">SafariOps Owner Admin</p>
            <p className="text-xs text-gray-400">{session?.user?.email}</p>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 ml-6">
            {(['overview','tenants','logs'] as Tab[]).map(t => (
              <button key={t} onClick={() => { setTab(t); if (t === 'logs') loadLogs(); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-orange-500 text-white' : 'text-gray-300 hover:bg-white/10'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === 'overview' && pending.length > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pending.length}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="text-gray-300 hover:text-white text-sm border border-white/20 px-3 py-1.5 rounded-lg">↻ Refresh</button>
          <Link href="/dashboard" className="text-gray-300 hover:text-white text-sm border border-white/20 px-3 py-1.5 rounded-lg">← Dashboard</Link>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-red-400 text-sm border border-red-400/30 px-3 py-1.5 rounded-lg">Sign out</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Clients',   value: data?.summary.total ?? 0,                   color: 'bg-white'      },
                { label: 'Active',          value: data?.summary.active ?? 0,                  color: 'bg-green-50'   },
                { label: 'On Trial',        value: data?.summary.trial ?? 0,                   color: 'bg-blue-50'    },
                { label: 'Pending Payment', value: data?.summary.pending ?? 0,                 color: (data?.summary.pending ?? 0) > 0 ? 'bg-yellow-50' : 'bg-white' },
                { label: 'Monthly Revenue', value: `KES ${(data?.summary.mrr ?? 0).toLocaleString()}`, color: 'bg-orange-50' },
              ].map(s => (
                <div key={s.label} className={`${s.color} border border-gray-200 rounded-xl p-4 text-center`}>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Pending payments */}
            {pending.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-green-700 text-sm">✅ No pending payments</div>
            ) : (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
                <h2 className="font-bold text-yellow-900 text-lg mb-4">🕐 Pending Payment Verification ({pending.length})</h2>
                <div className="space-y-4">
                  {pending.map(tenant => tenant.paymentRequests.map(pr => (
                    <div key={pr.id} className="bg-white rounded-xl border border-yellow-200 p-5">
                      <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                          <p className="font-bold text-gray-900">{tenant.name}</p>
                          <p className="text-sm text-gray-500">{tenant.email}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm"><span className="text-gray-400 w-20 inline-block">Plan:</span> <strong>{pr.plan.name}</strong> — KES {pr.amount.toLocaleString()}</p>
                            <p className="text-sm"><span className="text-gray-400 w-20 inline-block">Method:</span> {METHOD_LABEL[pr.method] || pr.method}</p>
                            <p className="text-sm"><span className="text-gray-400 w-20 inline-block">Ref:</span> <span className="font-mono font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded">{pr.reference}</span></p>
                            {pr.proofNote && <p className="text-sm"><span className="text-gray-400 w-20 inline-block">Note:</span> {pr.proofNote}</p>}
                            <p className="text-xs text-gray-400">{new Date(pr.createdAt).toLocaleString('en-KE')}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => action(tenant.id, 'approve', { paymentRequestId: pr.id })} disabled={!!actionLoading}
                            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm min-w-[130px]">
                            {actionLoading === `${tenant.id}-approve` ? '…' : '✅ Approve'}
                          </button>
                          <button onClick={() => action(tenant.id, 'reject', { paymentRequestId: pr.id })} disabled={!!actionLoading}
                            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm min-w-[130px]">
                            {actionLoading === `${tenant.id}-reject` ? '…' : '❌ Reject'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TENANTS TAB ─────────────────────────────────────────────── */}
        {tab === 'tenants' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-64"/>
              <div className="flex gap-2 flex-wrap">
                {['all','pending_payment','active','trial','suspended'].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {f === 'all' ? `All (${data?.tenants.length ?? 0})` : f.replace('_', ' ')}
                    {f !== 'all' && ` (${data?.tenants.filter(t => t.subscriptionStatus === f).length ?? 0})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Tenant list */}
            <div className="space-y-3">
              {filtered.length === 0 && <div className="text-center py-12 text-gray-400">No clients found</div>}
              {filtered.map(t => (
                <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-bold text-gray-900">{t.name}</p>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${SC[t.subscriptionStatus] || 'bg-gray-100 text-gray-600'}`}>
                          {t.subscriptionStatus === 'pending_payment' ? '🕐 Pending' :
                           t.subscriptionStatus === 'active'   ? '✓ Active'  :
                           t.subscriptionStatus === 'trial'    ? '⏳ Trial'   :
                           t.subscriptionStatus}
                        </span>
                        {t.plan && <span className="text-xs text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">{t.plan.name} · KES {t.plan.priceKES.toLocaleString()}/mo</span>}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{t.email}{t.phone ? ` · ${t.phone}` : ''}</p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-400">
                        <span>👥 {t._count.users} users</span>
                        <span>📋 {t._count.bookings} bookings</span>
                        <span>🧑 {t._count.clients} clients</span>
                        <span>🧾 {t._count.invoices} invoices</span>
                        <span>🎫 {t._count.vouchers} vouchers</span>
                        <span>Joined {new Date(t.createdAt).toLocaleDateString('en-KE')}</span>
                        {t.currentPeriodEnd && t.subscriptionStatus === 'active' && (
                          <span>Renews {new Date(t.currentPeriodEnd).toLocaleDateString('en-KE')}</span>
                        )}
                        {t.trialEndsAt && t.subscriptionStatus === 'trial' && (
                          <span className="text-amber-500">Trial ends {new Date(t.trialEndsAt).toLocaleDateString('en-KE')}</span>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => { setSelectedTenant(t); setModalPlanId(t.planId || ''); setModal('plan'); }}
                        className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                        Change Plan
                      </button>
                      {t.subscriptionStatus !== 'active' && (
                        <button onClick={() => action(t.id, 'reactivate')} disabled={!!actionLoading}
                          className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                          {actionLoading === `${t.id}-reactivate` ? '…' : 'Activate'}
                        </button>
                      )}
                      {t.subscriptionStatus !== 'suspended' && (
                        <button onClick={() => action(t.id, 'suspend')} disabled={!!actionLoading}
                          className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                          Suspend
                        </button>
                      )}
                      <button onClick={() => action(t.id, 'extend_trial', { reviewNote: '7' })} disabled={!!actionLoading}
                        className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                        +7 Day Trial
                      </button>
                      <button onClick={() => { setSelectedTenant(t); setDeleteReason(''); setModal('delete'); }}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                        Delete
                      </button>
                      <button onClick={() => { setTab('logs'); loadLogs(t.id); }}
                        className="border border-gray-300 text-gray-600 hover:border-gray-400 text-xs font-semibold px-3 py-1.5 rounded-lg">
                        View Logs
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LOGS TAB ─────────────────────────────────────────────────── */}
        {tab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Audit Logs ({logsTotal})</h2>
              <button onClick={() => loadLogs()} className="text-sm text-orange-600 hover:underline">↻ Refresh</button>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              {logs.length === 0 && <div className="text-center py-12 text-gray-400">No audit logs yet</div>}
              <div className="divide-y divide-gray-50">
                {logs.map(l => {
                  const tenant = data?.tenants.find(t => t.id === l.tenantId);
                  return (
                    <div key={l.id} className="px-5 py-3 flex items-start gap-4">
                      <div className="flex-shrink-0 w-28 text-xs text-gray-400 mt-0.5">
                        {new Date(l.timestamp).toLocaleDateString('en-KE')}
                        <br/>
                        {new Date(l.timestamp).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                            l.action.includes('delete')  ? 'bg-red-100 text-red-700'    :
                            l.action.includes('approve') ? 'bg-green-100 text-green-700':
                            l.action.includes('reject')  ? 'bg-red-100 text-red-600'   :
                            l.action.includes('suspend') ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>{l.action}</span>
                          {tenant && <span className="text-sm font-medium text-gray-700">{tenant.name}</span>}
                        </div>
                        {Object.keys(l.details).length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">
                            {Object.entries(l.details).filter(([k]) => !['password'].includes(k)).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── CHANGE PLAN MODAL ──────────────────────────────────────────── */}
      {modal === 'plan' && selectedTenant && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900 mb-1">Change Plan</h3>
            <p className="text-sm text-gray-500 mb-5">{selectedTenant.name}</p>

            <div className="space-y-3 mb-4">
              {data?.plans.map(plan => (
                <label key={plan.id} className={`flex items-center gap-3 border-2 rounded-xl p-3 cursor-pointer transition-colors ${modalPlanId === plan.id ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="plan" value={plan.id} checked={modalPlanId === plan.id} onChange={e => setModalPlanId(e.target.value)} className="accent-orange-500"/>
                  <div>
                    <p className="font-semibold text-gray-900">{plan.name}</p>
                    <p className="text-sm text-gray-500">KES {plan.priceKES.toLocaleString()} / month</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
              <input type="text" value={modalNote} onChange={e => setModalNote(e.target.value)}
                placeholder="e.g. Upgraded after call"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium">Cancel</button>
              <button
                onClick={() => setPlan(selectedTenant.id, modalPlanId, 'active', modalNote)}
                disabled={!modalPlanId || !!actionLoading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl">
                {actionLoading === `${selectedTenant.id}-setplan` ? 'Updating…' : 'Apply Plan & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE TENANT MODAL ────────────────────────────────────────── */}
      {modal === 'delete' && selectedTenant && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🗑️</div>
            <h3 className="font-bold text-lg text-gray-900 text-center mb-1">Delete Tenant</h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              This will permanently delete <strong>{selectedTenant.name}</strong> and ALL their data — bookings, clients, invoices, vouchers, everything. This cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for deletion *</label>
              <input type="text" value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
                placeholder="e.g. Test account, client request, fraud"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium">Cancel</button>
              <button
                onClick={() => deleteTenant(selectedTenant.id, deleteReason)}
                disabled={!deleteReason.trim() || !!actionLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl">
                {actionLoading === `${selectedTenant.id}-delete` ? 'Deleting…' : 'Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
