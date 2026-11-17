import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { PLAN_TRANSLATIONS_BN, toBanglaDigits } from '../../lib/bn';
import { useAuth } from '../../contexts/AuthContext';
import { questionBankService } from '../../services/questionBankService';

export function PricingPage() {
  const { revision } = useAuth();
  const { plans, classes, siteSettings } = React.useMemo(
    () => questionBankService.getPublicSiteData(),
    [revision]
  );
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  const filteredPlans =
    selectedClassFilter === 'all'
      ? plans
      : plans.filter((p) => p.includedClassIds.includes(selectedClassFilter));

  const getClassName = (id: string) => classes.find((c) => c.id === id)?.nameBn || id;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 font-bangla">
      <div className="max-w-2xl">
        <p className="text-xs font-bold tracking-widest text-[#D4A853]">
          স্বচ্ছ প্যাকেজ ও মূল্য তালিকা
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold gold-text-gradient sm:text-4xl">
          শ্রেণি-ভিত্তিক সাবস্ক্রিপশন প্ল্যানসমূহ
        </h1>
        <p className="mt-3 text-base text-[#B8C0CE] leading-relaxed">
          আপনার প্রয়োজনীয় একক শ্রেণি অথবা একাধিক শ্রেণির বান্ডেল প্ল্যান বেছে নিন। নিচে প্রদর্শিত মূল্যসমূহ নমুনা মূল্য, যা অ্যাডমিন ড্যাশবোর্ড থেকে পরিবর্তনযোগ্য।
        </p>
      </div>

      {/* শ্রেণি অনুযায়ী ফিল্টার */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-[#A5AEBD] mr-1">শ্রেণি অনুযায়ী বাছাই:</span>
        <button
          type="button"
          onClick={() => setSelectedClassFilter('all')}
          className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-all cursor-pointer ${
            selectedClassFilter === 'all'
              ? 'gold-btn'
              : 'border border-[#D4A853]/30 bg-[#0E1117] text-[#C2C8D3] hover:border-[#EAC779]'
          }`}
        >
          সকল প্ল্যান
        </button>
        {classes.map((cls) => (
          <button
            key={cls.id}
            type="button"
            onClick={() => setSelectedClassFilter(cls.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-all cursor-pointer ${
              selectedClassFilter === cls.id
                ? 'gold-btn'
                : 'border border-[#D4A853]/30 bg-[#0E1117] text-[#C2C8D3] hover:border-[#EAC779]'
            }`}
          >
            {cls.nameBn}
          </button>
        ))}
      </div>

      {/* প্ল্যান কার্ড গ্রিড */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {filteredPlans.map((plan) => {
          const bn = PLAN_TRANSLATIONS_BN[plan.id];
          const displayAudience = plan.audienceLabel || bn?.audience || 'সাবস্ক্রিপশন প্যাকেজ';
          const displayDesc = plan.description || bn?.desc;
          const displayFeatures = plan.features.length > 0 ? plan.features : bn?.features || [];

          return (
            <div
              key={plan.id}
              className="obsidian-card-interactive flex flex-col justify-between rounded-xl p-6"
            >
              <div>
                <p className="text-xs font-semibold text-[#D4A853]">{displayAudience}</p>
                <h2 className="mt-1 font-display text-xl font-bold text-[#F5EFE2]">{plan.nameBn || plan.name}</h2>

                <div className="mt-4 flex items-baseline gap-2 tabular-nums">
                  <span className="font-display text-3xl font-bold gold-text-gradient">
                    ৳{toBanglaDigits(plan.priceBdt.toLocaleString())}
                  </span>
                  {plan.originalPriceBdt && plan.originalPriceBdt > plan.priceBdt && (
                    <span className="text-sm text-[#7D8696] line-through">
                      ৳{toBanglaDigits(plan.originalPriceBdt.toLocaleString())}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-medium text-[#A5AEBD] tabular-nums">
                  মেয়াদ: {toBanglaDigits(plan.durationDays)} দিন
                </p>

                <div className="mt-4 border-y border-[#D4A853]/15 py-3">
                  <p className="text-sm font-semibold text-[#EAC779]">অন্তর্ভুক্ত শ্রেণিসমূহ</p>
                  <p className="mt-1 text-sm text-[#C2C8D3]">
                    {plan.includedClassIds.map(getClassName).join(' · ')}
                  </p>
                </div>

                <p className="mt-3 text-sm text-[#B8C0CE] leading-relaxed">{displayDesc}</p>

                <ul className="mt-4 space-y-2 text-sm text-[#E5E0D5]">
                  {displayFeatures.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-[#EAC779] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to={`/dashboard/payments/new?planId=${plan.id}`}
                className="mt-6 block rounded-lg gold-btn px-4 py-2.5 text-center text-base font-bold"
              >
                সাবস্ক্রাইব করুন
              </Link>
            </div>
          );
        })}
      </div>

      {/* গুরুত্বপূর্ণ নীতিমালা */}
      <div className="mt-12 obsidian-chamfer rounded-xl p-6">
        <h3 className="font-display text-lg font-bold gold-text-gradient">
          সাবস্ক্রিপশন ও নবায়ন নীতিমালা
        </h3>
        <ul className="mt-3 grid grid-cols-1 gap-3 text-sm sm:text-base text-[#C2C8D3] md:grid-cols-2">
          <li>• সক্রিয় সাবস্ক্রিপশনে উল্লিখিত শ্রেণিগুলোর প্রশ্নব্যাংকেই কেবল প্রবেশাধিকার থাকবে।</li>
          <li>• ম্যানুয়াল পেমেন্ট জমা দেওয়ার পর অ্যাডমিন যাচাই ও অনুমোদন না করা পর্যন্ত অবস্থা অপেক্ষমাণ থাকবে।</li>
          <li>• {siteSettings.renewalRuleNotice}</li>
          <li>• মেয়াদ শেষ হওয়ার পরও পূর্বের সংরক্ষিত প্রশ্নপত্র দেখা ও ডাউনলোড করা যাবে।</li>
        </ul>
      </div>
    </div>
  );
}
