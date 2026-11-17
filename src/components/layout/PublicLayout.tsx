import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
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
      <path
        d="M18 2.5L31.5 8.5V18.2C31.5 26.1 25.6 31.8 18 34C10.4 31.8 4.5 26.1 4.5 18.2V8.5L18 2.5Z"
        fill="#10141D"
        stroke="url(#qb-gold-stroke)"
        strokeWidth="1.75"
      />
      <path
        d="M12.5 12.5H23.5V16H19.75V24.5H16.25V16H12.5V12.5Z"
        fill="url(#qb-gold-fill)"
      />
      <path
        d="M10.5 26.5H25.5"
        stroke="#D4A853"
        strokeOpacity="0.45"
        strokeWidth="1.2"
      />
      <defs>
        <linearGradient id="qb-gold-stroke" x1="4.5" y1="2.5" x2="31.5" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5DC9B" />
          <stop offset="0.55" stopColor="#D4A853" />
          <stop offset="1" stopColor="#8F6722" />
        </linearGradient>
        <linearGradient id="qb-gold-fill" x1="12.5" y1="12.5" x2="23.5" y2="24.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FAE5B0" />
          <stop offset="1" stopColor="#C9963B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function PublicLayout() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { siteSettings } = questionBankService.getPublicSiteData();

  const navItems = [
    { to: '/about', label: 'আমাদের সম্পর্কে' },
    { to: '/how-it-works', label: 'যেভাবে কাজ করে' },
    { to: '/pricing', label: 'মূল্য তালিকা' },
    { to: '/faq', label: 'জিজ্ঞাসা' },
    { to: '/contact', label: 'যোগাযোগ' },
  ];

  const primaryCtaTarget = user
    ? user.role === 'admin'
      ? '/admin'
      : '/dashboard'
    : '/login';
  const primaryCtaLabel = user ? 'ড্যাশবোর্ড' : 'লগইন করুন';

  return (
    <div className="min-h-screen flex flex-col bg-[#07090C] text-[#F3EEE3] font-bangla">
      {/* Top Bar Contract: Obsidian glass navbar with brushed gold accents */}
      <header className="sticky top-0 z-40 border-b border-[#D4A853]/25 bg-[#07090C]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          {/* Zone 1: Custom geometric gold crest + crisp wordmark */}
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 group"
          >
            <BrandCrest />
            <span className="font-display text-xl font-bold tracking-tight gold-text-gradient">
              {siteSettings.brandName || 'প্রশ্নব্যাংক'}
            </span>
          </Link>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav
            aria-label="প্রধান নেভিগেশন"
            className="hidden md:flex items-center gap-7 text-[15px] font-medium text-[#B8C0CE]"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative py-1 whitespace-nowrap shrink-0 transition-colors hover:text-[#F5EFE2] ${
                    isActive
                      ? 'text-[#EAC779] font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#D4A853]'
                      : ''
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Zone 3: Primary action + mobile menu trigger */}
          <div className="flex items-center gap-3 shrink-0">
            {!user && (
              <Link
                to="/register"
                className="hidden lg:inline-flex items-center justify-center rounded-lg border border-[#D4A853]/35 bg-[#0E1117] px-4 py-2 text-sm font-semibold text-[#F3EEE3] hover:border-[#EAC779] transition-colors whitespace-nowrap shrink-0"
              >
                নিবন্ধন
              </Link>
            )}
            <Link
              to={primaryCtaTarget}
              className="hidden sm:inline-flex items-center justify-center rounded-lg gold-btn px-5 py-2 text-sm font-bold whitespace-nowrap shrink-0"
            >
              {primaryCtaLabel}
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'মেনু বন্ধ করুন' : 'মেনু খুলুন'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden inline-flex items-center justify-center rounded-lg border border-[#D4A853]/30 bg-[#0E1117] p-2 text-[#F3EEE3] hover:border-[#EAC779] min-h-[40px] min-w-[40px]"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#D4A853]/20 bg-[#0B0E14] px-4 py-4 space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-3.5 py-2.5 text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-[#D4A853]/15 text-[#EAC779] border border-[#D4A853]/35'
                      : 'text-[#C2C8D3] hover:bg-white/5 hover:text-[#F5EFE2]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="pt-3 mt-2 border-t border-[#D4A853]/20 flex flex-col gap-2.5">
              <Link
                to={primaryCtaTarget}
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg gold-btn px-4 py-2.5 text-center text-base font-bold"
              >
                {primaryCtaLabel}
              </Link>
              {!user && (
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg gold-outline-btn px-4 py-2.5 text-center text-base font-medium"
                >
                  নতুন অ্যাকাউন্ট তৈরি করুন
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[#D4A853]/25 bg-[#05070A]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="md:col-span-1">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <BrandCrest />
                <span className="font-display text-xl font-bold gold-text-gradient">
                  {siteSettings.brandName || 'প্রশ্নব্যাংক'}
                </span>
              </Link>
              <p className="mt-3 text-sm text-[#9DA6B5] leading-relaxed">
                বাংলা ও ইংরেজি মাধ্যমের শিক্ষার্থীদের জন্য শ্রেণি-ভিত্তিক প্রশ্নব্যাংক ও প্রশ্নপত্র তৈরির প্রিমিয়াম প্ল্যাটফর্ম।
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide text-[#EAC779]">প্ল্যাটফর্ম</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#B8C0CE]">
                <li><Link to="/pricing" className="hover:text-[#F5EFE2] transition-colors">সাবস্ক্রিপশন প্ল্যান</Link></li>
                <li><Link to="/how-it-works" className="hover:text-[#F5EFE2] transition-colors">যেভাবে কাজ করে</Link></li>
                <li><Link to="/payment-instructions" className="hover:text-[#F5EFE2] transition-colors">পেমেন্ট নির্দেশনা</Link></li>
                <li><Link to="/faq" className="hover:text-[#F5EFE2] transition-colors">সচরাচর জিজ্ঞাসা</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide text-[#EAC779]">অ্যাকাউন্ট</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#B8C0CE]">
                <li><Link to="/login" className="hover:text-[#F5EFE2] transition-colors">লগইন</Link></li>
                <li><Link to="/register" className="hover:text-[#F5EFE2] transition-colors">শিক্ষার্থী নিবন্ধন</Link></li>
                <li><Link to="/forgot-password" className="hover:text-[#F5EFE2] transition-colors">পাসওয়ার্ড পুনরুদ্ধার</Link></li>
                <li><Link to="/about" className="hover:text-[#F5EFE2] transition-colors">আমাদের সম্পর্কে</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide text-[#EAC779]">যোগাযোগ</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#B8C0CE]">
                <li>{siteSettings.supportEmail}</li>
                <li>{siteSettings.supportPhone}</li>
                <li>{siteSettings.officeAddress}</li>
                <li><Link to="/contact" className="text-[#EAC779] hover:underline">বার্তা পাঠান</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-[#D4A853]/15 pt-6 text-xs text-[#7D8696] sm:flex-row sm:items-center sm:justify-between">
            <p>© ২০২৬ {siteSettings.brandName || 'প্রশ্নব্যাংক'}। প্রোটোটাইপ প্রদর্শনী সংস্করণ।</p>
            <p>{siteSettings.demoDisclaimer}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
