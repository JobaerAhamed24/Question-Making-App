import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { BREADCRUMB_LABELS_BN } from '../../lib/bn';

export interface SidebarNavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
  group?: string;
}

function DashboardCrest() {
  return (
    <svg width="24" height="24" viewBox="0 0 36 36" fill="none" aria-hidden="true" className="h-6 w-6 shrink-0">
      <path
        d="M18 2.5L31.5 8.5V18.2C31.5 26.1 25.6 31.8 18 34C10.4 31.8 4.5 26.1 4.5 18.2V8.5L18 2.5Z"
        fill="#12161F"
        stroke="#D4A853"
        strokeWidth="2"
      />
      <path d="M12.5 12.5H23.5V16H19.75V24.5H16.25V16H12.5V12.5Z" fill="#EAC779" />
    </svg>
  );
}

export function DashboardLayout({
  portalLabel,
  navItems,
  homePath,
  variant = 'admin',
}: {
  portalLabel: string;
  navItems: SidebarNavItem[];
  homePath: string;
  variant?: 'student' | 'admin';
}) {
  const { user, logout, quickDemoLogin } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isStudentTheme = variant === 'student';

  const handleLogout = async () => {
    await logout();
    pushToast({ title: 'লগআউট সম্পন্ন হয়েছে', description: 'আপনার সেশন সফলভাবে বন্ধ হয়েছে।', variant: 'info' });
    navigate('/login');
  };

  const segments = location.pathname.split('/').filter(Boolean);

  const groupedItems = navItems.reduce<Array<{ group: string; items: SidebarNavItem[] }>>((acc, item) => {
    const groupName = item.group || 'নেভিগেশন';
    const existing = acc.find((g) => g.group === groupName);
    if (existing) {
      existing.items.push(item);
    } else {
      acc.push({ group: groupName, items: [item] });
    }
    return acc;
  }, []);

  const userInitial = (user?.fullName || 'প').trim().charAt(0).toUpperCase();

  const renderNavContent = (isMobile = false) => (
    <div className="flex h-full flex-col">
      {/* Brand header */}
      <div className="flex items-center justify-between border-b border-[#D4A853]/20 px-4 py-3.5">
        {(!collapsed || isMobile) && (
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-display text-lg font-bold tracking-tight gold-text-gradient whitespace-nowrap"
          >
            <DashboardCrest />
            <span>প্রশ্নব্যাংক</span>
          </Link>
        )}
        {!isMobile ? (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'সাইডবার বড় করুন' : 'সাইডবার ছোট করুন'}
            className="rounded-lg border border-[#D4A853]/25 bg-[#121620] p-1.5 text-[#EAC779] hover:border-[#EAC779] transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="সাইডবার বন্ধ করুন"
            className="rounded-lg border border-[#D4A853]/25 p-1.5 text-[#EAC779] hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {(!collapsed || isMobile) && (
        <div className="border-b border-[#D4A853]/15 bg-[#0D1017] px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-[#D4A853]">{portalLabel}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-[#F5EFE2]">{user?.fullName}</p>
        </div>
      )}

      {/* Grouped Navigation */}
      <nav aria-label={`${portalLabel} নেভিগেশন`} className="flex-1 overflow-y-auto px-2.5 py-3.5 space-y-4">
        {groupedItems.map((grp) => (
          <div key={grp.group}>
            {(!collapsed || isMobile) && groupedItems.length > 1 && (
              <p className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-wider text-[#8C95A4]">
                {grp.group}
              </p>
            )}
            <ul className="space-y-1">
              {grp.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => isMobile && setMobileOpen(false)}
                    title={collapsed && !isMobile ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap border ${
                        isActive
                          ? 'border-[#D4A853]/45 bg-[#D4A853]/15 text-[#EAC779] font-semibold shadow-sm'
                          : 'border-transparent text-[#B8C0CE] hover:bg-white/5 hover:text-[#F5EFE2]'
                      } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`
                    }
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Demo Persona Switcher & Sign Out */}
      <div className="border-t border-[#D4A853]/20 p-3 space-y-2.5 bg-[#07090D]">
        {(!collapsed || isMobile) && (
          <div className="rounded-lg border border-[#D4A853]/25 bg-[#0E121A] p-2.5">
            <label
              htmlFor={isMobile ? 'demo-switch-mobile' : 'demo-switch-desktop'}
              className="block text-xs font-medium text-[#D4A853]"
            >
              ডেমো অ্যাকাউন্ট পরিবর্তন
            </label>
            <select
              id={isMobile ? 'demo-switch-mobile' : 'demo-switch-desktop'}
              value={user?.id || ''}
              onChange={async (e) => {
                const targetId = e.target.value;
                if (!targetId) return;
                const switched = await quickDemoLogin(targetId);
                pushToast({
                  title: `${switched.fullName} অ্যাকাউন্টে প্রবেশ করেছেন`,
                  description: switched.role === 'admin' ? 'অ্যাডমিন ড্যাশবোর্ড' : 'শিক্ষার্থী ড্যাশবোর্ড',
                  variant: 'info',
                });
                navigate(switched.role === 'admin' ? '/admin' : '/dashboard');
                if (isMobile) setMobileOpen(false);
              }}
              className="mt-1.5 w-full rounded border border-[#D4A853]/30 bg-[#07090C] px-2 py-1.5 text-sm text-[#F3EEE3] focus:border-[#EAC779] focus:outline-none"
            >
              <option value="u-student-active">নাদিয়া (সক্রিয় — ৬ষ্ঠ ও ৮ম শ্রেণি)</option>
              <option value="u-student-unsub">তানভীর (সাবস্ক্রিপশন নেই / অপেক্ষমাণ)</option>
              <option value="u-student-expired">ফারহানা (মেয়াদোত্তীর্ণ — ৬ষ্ঠ শ্রেণি)</option>
              <option value="u-admin">ড. মাহবুব আলম (অ্যাডমিন)</option>
            </select>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className={`flex w-full items-center gap-2 rounded-lg border border-rose-500/25 bg-rose-950/30 px-3 py-2 text-sm font-medium text-rose-300 hover:bg-rose-950/60 hover:text-rose-200 transition-colors cursor-pointer ${
            collapsed && !isMobile ? 'justify-center' : ''
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {(!collapsed || isMobile) && <span>লগআউট</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex font-bangla bg-[#07090C] text-[#F3EEE3]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-[#090C11] text-[#F3EEE3] border-r border-[#D4A853]/25 transition-all duration-150 no-print ${
          collapsed ? 'w-[68px]' : 'w-[264px]'
        }`}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden no-print">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 w-72 max-w-[85vw] flex flex-col bg-[#090C11] text-[#F3EEE3] border-r border-[#D4A853]/30">
            {renderNavContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[#D4A853]/20 bg-[#0A0D12]/95 backdrop-blur-md px-4 py-2.5 sm:px-6 no-print">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="মেনু খুলুন"
              className="lg:hidden rounded-lg border border-[#D4A853]/30 bg-[#12161F] p-2 text-[#EAC779] hover:border-[#EAC779]"
            >
              <Menu className="h-4 w-4" />
            </button>

            <nav aria-label="ব্রেডক্রাম্ব" className="flex min-w-0 items-center gap-1.5 text-sm">
              <Link to={homePath} className="font-semibold text-[#D4A853] hover:text-[#EAC779] whitespace-nowrap">
                {portalLabel}
              </Link>
              {segments
                .slice(1)
                .filter((seg) => !/^(paper|q)-[a-z0-9-]+$/i.test(seg))
                .map((seg, idx) => (
                  <React.Fragment key={`${seg}-${idx}`}>
                    <ChevronRight className="h-3.5 w-3.5 text-[#6E7787] shrink-0" />
                    <span className="truncate font-medium text-[#F3EEE3]">
                      {BREADCRUMB_LABELS_BN[seg] || seg.replace(/-/g, ' ')}
                    </span>
                  </React.Fragment>
                ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/"
              className="text-sm font-medium text-[#B8C0CE] hover:text-[#EAC779] transition-colors whitespace-nowrap"
            >
              মূল ওয়েবসাইট
            </Link>
            {user?.role === 'admin' && (
              <Link
                to={location.pathname.startsWith('/admin') ? '/dashboard' : '/admin'}
                className="rounded-lg border border-[#D4A853]/35 bg-[#12161F] px-3 py-1.5 text-sm font-medium text-[#EAC779] hover:border-[#EAC779] transition-colors whitespace-nowrap"
              >
                {location.pathname.startsWith('/admin') ? 'শিক্ষার্থী পোর্টাল' : 'অ্যাডমিন প্যানেল'}
              </Link>
            )}
            <Link
              to={location.pathname.startsWith('/admin') ? '/admin/settings' : '/dashboard/profile'}
              title={user?.fullName || 'প্রোফাইল'}
              aria-label={`প্রোফাইল — ${user?.fullName || 'ব্যবহারকারী'}`}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold transition-colors shrink-0 ${
                isStudentTheme
                  ? 'border-[#D4A853]/45 bg-[#1D170B] text-[#EAC779] hover:border-[#EAC779]'
                  : 'border-[#D4A853]/60 bg-[#D4A853] text-[#090B0E] hover:brightness-110'
              }`}
            >
              {userInitial}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
