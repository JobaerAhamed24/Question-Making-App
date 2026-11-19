import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, Moon, ShieldCheck, Sun, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { questionBankService } from '../../services/questionBankService';

function BrandCrest() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
      className="h-8 w-8 shrink-0"
    >
      <rect
        x="2.5"
        y="2.5"
        width="31"
        height="31"
        rx="8"
        fill="#0B1A33"
        stroke="var(--theme-accent)"
        strokeWidth="1.75"
      />
      <path
        d="M12.5 11.5H23.5V15H19.75V24.5H16.25V15H12.5V11.5Z"
        fill="var(--theme-accent)"
      />
      <path
        d="M11 26.5H25"
        stroke="var(--theme-accent-bright)"
        strokeOpacity="0.55"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PublicLayout() {
  const { user, enterQuickAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [enteringAdmin, setEnteringAdmin] = useState(false);
  const { siteSettings } = questionBankService.getPublicSiteData();

  const handleQuickAdminAccess = async () => {
    if (enteringAdmin) return;
    setEnteringAdmin(true);
    try {
      await enterQuickAdmin();
      setMobileMenuOpen(false);
      navigate('/admin');
    } finally {
      setEnteringAdmin(false);
    }
  };

  const accountTarget = user
    ? user.role === 'admin'
      ? '/admin'
      : '/dashboard'
    : '/login';

  // Main Navigation Items
  const navItems = [
    { to: '/', label: 'হোম', end: true },
    { to: '/academic', label: 'একাডেমিক' },
    { to: '/admission', label: 'অ্যাডমিশন পরীক্ষা' },
    { to: '/slides', label: 'স্লাইড তৈরি' },
    { to: '/exams', label: 'লাইভ পরীক্ষা' },
    { to: '/learning', label: 'লার্নিং হাব' },
    { to: '/kids-game', label: 'কিডস গেম' },
    { to: accountTarget, label: user ? (user.role === 'admin' ? 'অ্যাডমিন প্যানেল' : 'আমার অ্যাকাউন্ট') : 'আমার অ্যাকাউন্ট' },
  ];

  const isLight = theme === 'light';

  return (
    <div
      className={`min-h-screen flex flex-col font-bangla transition-colors ${
        isLight ? 'bg-[#F8F6F1] text-[#0B1A33]' : 'bg-[#07090C] text-[#F3EEE3]'
      }`}
    >
      {/* Top Bar */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md no-print ${
          isLight
            ? 'border-slate-200 bg-[#FFFFFF]/95 shadow-[0_1px_8px_rgba(11,26,51,0.04)]'
            : 'border-[#D4A853]/25 bg-[#07090C]/92'
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Brand */}
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 group"
          >
            <BrandCrest />
            <span className="font-display text-lg sm:text-xl font-bold tracking-tight gold-text-gradient">
              {siteSettings.brandName || 'প্রশ্নব্যাংক'}
            </span>
          </Link>

          {/* Main Navigation Items */}
          <nav
            aria-label="প্রধান নেভিগেশন"
            className={`hidden xl:flex items-center gap-4 2xl:gap-6 text-sm font-medium ${
              isLight ? 'text-[#1E293B]' : 'text-[#CBD5E1]'
            }`}
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative py-1 whitespace-nowrap shrink-0 transition-colors ${
                    isLight ? 'hover:text-[#0B1A33]' : 'hover:text-[#FFFFFF]'
                  } ${
                    isActive
                      ? `${isLight ? 'text-[var(--theme-accent-light-ink)]' : 'text-[#EAC779]'} font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[var(--theme-accent)]`
                      : ''
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right controls: Theme Toggle + Admin + Auth + Mobile Menu */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isLight ? 'ডার্ক মোড চালু করুন' : 'লাইট মোড চালু করুন'}
              title={isLight ? 'ডার্ক মোড' : 'লাইট মোড'}
              className={`inline-flex items-center justify-center rounded-lg border p-2 transition-colors cursor-pointer min-h-[38px] min-w-[38px] ${
                isLight
                  ? 'border-slate-200 bg-slate-50 text-[#0B1A33] hover:bg-slate-100'
                  : 'border-[#D4A853]/30 bg-[#0E1117] text-[#EAC779] hover:border-[#EAC779]'
              }`}
            >
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            {/* Direct Quick Admin Access (No login required) */}
            <button
              type="button"
              onClick={handleQuickAdminAccess}
              disabled={enteringAdmin}
              title="লগইন ছাড়াই সরাসরি অ্যাডমিন প্যানেলে প্রবেশ করুন"
              className="inline-flex items-center gap-1.5 rounded-lg gold-outline-btn px-3 py-2 text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4 text-[#EAC779]" />
              <span>{enteringAdmin ? 'প্রবেশ হচ্ছে...' : 'অ্যাডমিন'}</span>
            </button>

            {!user ? (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center justify-center rounded-lg gold-btn px-4 py-2 text-sm font-bold whitespace-nowrap shrink-0"
              >
                লগইন
              </Link>
            ) : (
              <Link
                to={accountTarget}
                className="hidden sm:inline-flex items-center justify-center rounded-lg gold-btn px-4 py-2 text-sm font-bold whitespace-nowrap shrink-0"
              >
                {user.role === 'admin' ? 'অ্যাডমিন কনসোল' : 'ড্যাশবোর্ড'}
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'মেনু বন্ধ করুন' : 'মেনু খুলুন'}
              aria-expanded={mobileMenuOpen}
              className={`xl:hidden inline-flex items-center justify-center rounded-lg border p-2 min-h-[40px] min-w-[40px] cursor-pointer ${
                isLight
                  ? 'border-[#9A7229]/35 bg-[#FFFFFF] text-[#161B26]'
                  : 'border-[#D4A853]/30 bg-[#0E1117] text-[#F3EEE3] hover:border-[#EAC779]'
              }`}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet navigation drawer */}
        {mobileMenuOpen && (
          <div
            className={`xl:hidden border-t px-4 py-4 space-y-1.5 ${
              isLight
                ? 'border-[#9A7229]/20 bg-[#FFFFFF]'
                : 'border-[#D4A853]/20 bg-[#0B0E14]'
            }`}
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-3.5 py-2.5 text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-[#D4A853]/15 text-[#9A7229] dark:text-[#EAC779] border border-[#D4A853]/35'
                      : isLight
                        ? 'text-[#374151] hover:bg-[#F5F1E8]'
                        : 'text-[#C2C8D3] hover:bg-white/5 hover:text-[#F5EFE2]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="pt-3 mt-2 border-t border-[#D4A853]/20 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleQuickAdminAccess}
                className="inline-flex items-center gap-1.5 rounded-lg gold-btn px-3.5 py-2 text-sm font-bold cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>অ্যাডমিন প্যানেল (লগইন ছাড়াই)</span>
              </button>
              <Link
                to="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg gold-outline-btn px-3 py-1.5 text-sm font-medium"
              >
                মূল্য তালিকা
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer
        className={`site-footer border-t no-print ${
          isLight
            ? 'border-slate-200 bg-[#EFECE4] text-[#374151]'
            : 'border-[#D4A853]/25 bg-[#05070A] text-[#B8C0CE]'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="md:col-span-1">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <BrandCrest />
                <span className="font-display text-xl font-bold gold-text-gradient">
                  {siteSettings.brandName || 'প্রশ্নব্যাংক'}
                </span>
              </Link>
              <p className={`mt-3 text-sm leading-relaxed ${isLight ? 'text-[#4B5563]' : 'text-[#9DA6B5]'}`}>
                একাডেমিক (শ্রেণি ১–১২), ভর্তি পরীক্ষা, ফ্রি লার্নিং হাব, কিডস গেম, স্লাইড তৈরি ও লাইভ পরীক্ষার সমন্বিত শিক্ষামূলক প্ল্যাটফর্ম।
              </p>
            </div>
            <div>
              <h3 className={`text-sm font-bold tracking-wide ${isLight ? 'text-[#7C5616]' : 'text-[#EAC779]'}`}>
                প্ল্যাটফর্ম মডিউল
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link to="/academic" className="hover:underline">একাডেমিক প্রশ্নপত্র তৈরি (১–১২)</Link></li>
                <li><Link to="/admission" className="hover:underline">অ্যাডমিশন পরীক্ষা প্রশ্নপত্র তৈরি</Link></li>
                <li><Link to="/learning" className="hover:underline">লার্নিং হাব (ফ্রি সমাধান)</Link></li>
                <li><Link to="/kids-game" className="hover:underline">কিডস ম্যাথ গেম</Link></li>
                <li><Link to="/curriculum" className="hover:underline">পাঠ্যক্রম ও বিষয়সমূহ (১–১২)</Link></li>
              </ul>
            </div>
            <div>
              <h3 className={`text-sm font-bold tracking-wide ${isLight ? 'text-[#7C5616]' : 'text-[#EAC779]'}`}>
                টুলস ও অ্যাকাউন্ট
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link to="/slides" className="hover:underline">অটো স্লাইড তৈরি (.PPTX)</Link></li>
                <li><Link to="/exams" className="hover:underline">লাইভ পরীক্ষা ও লিডারবোর্ড</Link></li>
                <li><Link to="/pricing" className="hover:underline">মূল্য তালিকা ও সাবস্ক্রিপশন</Link></li>
                <li><Link to="/how-it-works" className="hover:underline">যেভাবে কাজ করে</Link></li>
                <li><Link to="/faq" className="hover:underline">সচরাচর জিজ্ঞাসা</Link></li>
              </ul>
            </div>
            <div>
              <h3 className={`text-sm font-bold tracking-wide ${isLight ? 'text-[#7C5616]' : 'text-[#EAC779]'}`}>
                যোগাযোগ
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>{siteSettings.supportEmail}</li>
                <li>{siteSettings.supportPhone}</li>
                <li>{siteSettings.officeAddress}</li>
                <li><Link to="/contact" className="font-semibold text-[#9A7229] dark:text-[#EAC779] hover:underline">বার্তা পাঠান</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-[#D4A853]/20 pt-6 text-xs opacity-80 sm:flex-row sm:items-center sm:justify-between">
            <p>© ২০২৬ {siteSettings.brandName || 'প্রশ্নব্যাংক'}। প্রোটোটাইপ প্রদর্শনী সংস্করণ।</p>
            <p>{siteSettings.demoDisclaimer}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
