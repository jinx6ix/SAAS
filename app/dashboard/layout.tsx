'use client';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const nav = [
  { label: 'Dashboard',      href: '/dashboard',                icon: '⊞',  adminOnly: false },
  { label: 'Agents',         href: '/dashboard/agents',         icon: '🤝', adminOnly: false },
  { label: 'Clients',        href: '/dashboard/clients',        icon: '👥', adminOnly: false },
  { label: 'Bookings',       href: '/dashboard/bookings',       icon: '📋', adminOnly: false },
  { label: 'Vouchers',       href: '/dashboard/vouchers',       icon: '🎫', adminOnly: false },
  { label: 'Invoices',       href: '/dashboard/invoices',       icon: '🧾', adminOnly: false },
  { label: 'Itineraries',    href: '/dashboard/itineraries',    icon: '🗺️', adminOnly: false },
  { label: 'Tours',          href: '/dashboard/tours',          icon: '🦁', adminOnly: false },
  { label: 'Costing',        href: '/dashboard/costing',        icon: '💰', adminOnly: false },
  { label: 'Cost Sheets',    href: '/dashboard/cost-sheets',    icon: '🧮', adminOnly: false },
  { label: 'Reports',        href: '/dashboard/reports',        icon: '📊', adminOnly: false },
  { label: 'Contract Rates', href: '/dashboard/safari-rates',   icon: '🏨', adminOnly: false },
  { label: 'Amend Voucher',  href: '/dashboard/vouchers/amend', icon: '✏️', adminOnly: false },
  { label: 'Users',          href: '/dashboard/admin/users',    icon: '🔑', adminOnly: true  },
  { label: 'Billing',        href: '/billing',                  icon: '💳', adminOnly: true  },
];

function TrialBanner({ tenant }: { tenant: any }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !tenant || tenant.subscriptionStatus !== 'trial') return null;
  let daysLeft: number | null = null;
  if (tenant.trialEndsAt) {
    const ms = new Date(tenant.trialEndsAt).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(ms / 86400000));
  }
  const urgent = daysLeft !== null && daysLeft <= 3;
  return (
    <div className={`px-6 py-2.5 flex items-center justify-between text-sm ${urgent ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-900'}`}>
      <span>
        {urgent ? '⚠️ ' : '⏳ '}
        <strong>{daysLeft === 0 ? 'Trial expires today!' : daysLeft === null ? 'Free trial active.' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in free trial.`}</strong>
        {' '}Subscribe to keep full access.
      </span>
      <div className="flex items-center gap-4">
        <Link href="/billing" className="font-semibold underline hover:no-underline">Choose a plan →</Link>
        <button onClick={() => setDismissed(true)} className="opacity-60 hover:opacity-100">✕</button>
      </div>
    </div>
  );
}

function PendingBanner({ tenant }: { tenant: any }) {
  if (!tenant || tenant.subscriptionStatus !== 'pending_payment') return null;
  return (
    <div className="bg-blue-500 text-white px-6 py-2.5 text-sm">
      🕐 <strong>Payment under review.</strong> Your account activates once the owner verifies your payment — usually within a few hours.
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  const isAdmin    = (session?.user as any)?.role === 'ADMIN';
  const isOwner    = session?.user?.email === process.env.NEXT_PUBLIC_OWNER_EMAIL;
  const userName   = session?.user?.name || 'User';
  const tenant     = (session?.user as any)?.tenant;
  const tenantName = tenant?.name || 'Dashboard';
  const initials   = tenantName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className={`${open ? 'w-60' : 'w-16'} bg-[#1a1a2e] text-white flex flex-col transition-all duration-300 flex-shrink-0`}>
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">{initials}</div>
          {open && (
            <div className="min-w-0">
              <p className="font-bold text-sm leading-none truncate">{tenantName}</p>
              <p className="text-orange-400 text-xs">Operations</p>
            </div>
          )}
        </div>
        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
          {nav.filter(n => !n.adminOnly || isAdmin).map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-orange-500 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
                <span className="text-base flex-shrink-0">{item.icon}</span>
                {open && <span>{item.label}</span>}
              </Link>
            );
          })}
          {isOwner && (
            <Link href="/admin"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mt-2 border border-orange-500/30 ${pathname.startsWith('/admin') ? 'bg-orange-500 text-white' : 'text-orange-400 hover:bg-orange-500/10'}`}>
              <span className="text-base flex-shrink-0">👑</span>
              {open && <span>Owner Admin</span>}
            </Link>
          )}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500/30 rounded-full flex items-center justify-center text-orange-400 font-bold text-xs flex-shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            {open && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{userName}</p>
                <p className="text-xs text-gray-400">{isAdmin ? 'Admin' : 'Employee'}{isOwner ? ' · Owner' : ''}</p>
              </div>
            )}
          </div>
          {open && (
            <button onClick={() => signOut({ callbackUrl: '/login' })}
              className="mt-2 w-full text-left text-xs text-gray-400 hover:text-red-400 px-2 py-1 rounded transition-colors">
              Sign out →
            </button>
          )}
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setOpen(!open)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">☰</button>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            {isAdmin && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">Admin</span>}
            {isOwner && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">Owner</span>}
          </div>
        </header>
        <TrialBanner tenant={tenant} />
        <PendingBanner tenant={tenant} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
