import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  Printer,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  FAQ_TRANSLATIONS_BN,
  NOTICE_TRANSLATIONS_BN,
  PLAN_TRANSLATIONS_BN,
  toBanglaDigits,
} from '../../lib/bn';
import { useAuth } from '../../contexts/AuthContext';
import { questionBankService } from '../../services/questionBankService';

function SectionDivider({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center max-w-3xl mx-auto">
      <div className="flex items-center justify-center gap-4">
        <span className="hidden sm:block h-px flex-1 max-w-[140px] bg-gradient-to-r from-transparent to-[#D4A853]/65" />
        <h2 className="font-bangla text-2xl sm:text-3xl font-bold tracking-tight gold-text-gradient">
          {title}
        </h2>
        <span className="hidden sm:block h-px flex-1 max-w-[140px] bg-gradient-to-l from-transparent to-[#D4A853]/65" />
      </div>
      {subtitle && (
        <p className="mt-2.5 text-base text-[#B8C0CE] leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

export function HomePage() {
  const { revision } = useAuth();
  const { classes, subjects, plans, faqs, notices, questionTypes } = React.useMemo(
    () => questionBankService.getPublicSiteData(),
    [revision]
  );

  const featuredPlan = plans[plans.length - 1] || plans[0];
  const featuredBn = featuredPlan ? PLAN_TRANSLATIONS_BN[featuredPlan.id] : undefined;

  return (
    <div className="font-bangla bg-[#07090C] text-[#F3EEE3]">
      {/* হিরো সেকশন — Obsidian & Brushed Gold Architectural Showcase */}
      <section className="relative overflow-hidden border-b border-[#D4A853]/20 bg-[radial-gradient(ellipse_80%_60%_at_75%_25%,rgba(212,168,83,0.12),transparent_70%)]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            {/* বাম কলাম: শিরোনাম, বিবরণ, ৩টি ফিচার এবং CTA */}
            <div className="flex flex-col justify-center lg:col-span-6">
              <div className="inline-flex w-fit items-center gap-2 rounded-sm border border-[#D4A853]/45 bg-[#12161F] px-3 py-1 text-xs font-semibold tracking-wider text-[#EAC779]">
                <Sparkles className="h-3.5 w-3.5 text-[#D4A853]" />
                <span>এক্সক্লুসিভ এডুকেশন স্যুট · বাংলা ও ইংরেজি মাধ্যম</span>
              </div>

              <h1 className="mt-4 font-bangla text-4xl font-bold tracking-tight sm:text-5xl text-balance leading-[1.22] gold-text-gradient">
                ১ ক্লিকে প্রশ্ন তৈরীর সফটওয়্যার ও প্রশ্নব্যাংক
              </h1>

              <p className="mt-2 text-lg font-semibold text-[#F5EFE2]">
                নির্ভুল প্রশ্ন সংকলন। স্বয়ংক্রিয় ফরম্যাটিং। তাৎক্ষণিক ডাউনলোড।
              </p>

              <p className="mt-4 max-w-xl text-base sm:text-lg text-[#C2C8D3] leading-relaxed">
                সফটওয়্যার ব্যবহার করে মূল্যবান সময় বাঁচান! আপনার শ্রেণির সাবস্ক্রিপশন নিয়ে যাচাইকৃত বাংলা ও ইংরেজি প্রশ্ন ব্রাউজ করুন, স্বয়ংক্রিয় নম্বর হিসাবসহ কাস্টম প্রশ্নপত্র সাজান এবং প্রিন্ট-উপযোগী পিডিএফ বা ওয়ার্ড ফাইল ডাউনলোড করুন।
              </p>

              {/* ৩টি প্রিসিশন আইকন বৈশিষ্ট্য (রেফারেন্স লেআউট অনুযায়ী) */}
              <div className="mt-7 grid grid-cols-3 gap-3 border-y border-[#D4A853]/20 py-4">
                <div className="flex flex-col items-start gap-1.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D4A853]/40 bg-[#12161F] text-[#EAC779]">
                    <Layers className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold text-[#F5EFE2]">৭ ধরন প্রশ্ন</p>
                  <p className="text-xs text-[#9DA6B5]">এমসিকিউ ও সৃজনশীল</p>
                </div>
                <div className="flex flex-col items-start gap-1.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D4A853]/40 bg-[#12161F] text-[#EAC779]">
                    <Printer className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold text-[#F5EFE2]">তাৎক্ষণিক এক্সপোর্ট</p>
                  <p className="text-xs text-[#9DA6B5]">প্রিন্ট পিডিএফ ও ওয়ার্ড</p>
                </div>
                <div className="flex flex-col items-start gap-1.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D4A853]/40 bg-[#12161F] text-[#EAC779]">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold text-[#F5EFE2]">স্থায়ী স্ন্যাপশট</p>
                  <p className="text-xs text-[#9DA6B5]">আজীবন সংরক্ষিত প্রশ্নপত্র</p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Link
                  to="/pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-lg gold-btn px-6 py-3 text-base font-bold whitespace-nowrap"
                >
                  <span>প্ল্যান দেখুন</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center justify-center gap-2 rounded-lg gold-outline-btn px-6 py-3 text-base font-semibold whitespace-nowrap"
                >
                  <span>বিস্তারিত জানুন</span>
                  <ArrowRight className="h-4 w-4 text-[#D4A853]" />
                </Link>
              </div>
            </div>

            {/* ডান কলাম: জেনারেটেড হিরো ওয়ার্কস্টেশন ভিজ্যুয়াল + নমুনা প্রশ্নপত্র কার্ড */}
            <div className="lg:col-span-6 space-y-4">
              <div className="obsidian-chamfer overflow-hidden rounded-xl p-2">
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-[#D4A853]/25 bg-[#090B0E]">
                  <img
                    src="/src/assets/images/hero_obsidian_workstation_1794901360477.jpg"
                    alt="আধুনিক অবসিডিয়ান ও গোল্ড প্রশ্নপত্র ওয়ার্কস্টেশন"
                    className="h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07090C]/90 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 rounded-lg border border-[#D4A853]/35 bg-[#0A0D12]/90 px-4 py-2.5 backdrop-blur-sm">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#EAC779]">নমুনা প্রশ্নপত্র স্টুডিও</p>
                      <p className="truncate text-sm font-medium text-[#F5EFE2]">
                        ষষ্ঠ শ্রেণি · গণিত ও বাংলা · ৬০ মিনিট
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-bold text-[#EAC779] tabular-nums">
                      পূর্ণমান: ২০
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="obsidian-card rounded-lg p-3.5">
                  <div className="flex justify-between gap-2 text-sm">
                    <p className="font-medium text-[#F5EFE2]">১. ১২, ১৮ এবং ২৪-এর ল.সা.গু. কত?</p>
                    <span className="text-xs font-semibold text-[#D4A853] tabular-nums shrink-0">[১]</span>
                  </div>
                  <p className="mt-1.5 text-xs text-[#B8C0CE]">(ক) ৩৬ &nbsp; (খ) ৪৮ &nbsp; (গ) ৭২ &nbsp; (ঘ) ১৪৪</p>
                </div>
                <div className="obsidian-card rounded-lg p-3.5">
                  <div className="flex justify-between gap-2 text-sm">
                    <p className="font-medium text-[#F5EFE2]">২. ‘সততার পুরস্কার’ কোন ধরনের রচনা?</p>
                    <span className="text-xs font-semibold text-[#D4A853] tabular-nums shrink-0">[১]</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-[#B8C0CE]">
                    <span>(খ) নীতিকথা</span>
                    <Link to="/login" className="font-semibold text-[#EAC779] hover:underline">
                      ডেমো দেখুন →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ৫-কলাম স্পেক বার (রেফারেন্স আর্কিটেকচার অনুযায়ী) */}
          <div className="mt-12 obsidian-chamfer rounded-xl p-5">
            <p className="mb-4 text-center text-xs font-bold tracking-widest text-[#D4A853]">
              সীমাহীন দক্ষতা · প্ল্যাটফর্মের মূল সক্ষমতা
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-[#D4A853]/20">
              <div className="pt-2 sm:pt-0 lg:pr-4">
                <p className="text-xs font-semibold text-[#D4A853]">এক্সেস কন্ট্রোল</p>
                <p className="mt-1 text-base font-bold text-[#F5EFE2]">শ্রেণি-ভিত্তিক প্রবেশাধিকার</p>
                <p className="mt-1 text-sm text-[#A5AEBD]">শুধুমাত্র আপনার প্রয়োজনীয় এক বা একাধিক শ্রেণির প্যাকেজ।</p>
              </div>
              <div className="pt-3 sm:pt-0 lg:px-4">
                <p className="text-xs font-semibold text-[#D4A853]">প্রশ্ন ফরম্যাট</p>
                <p className="mt-1 text-base font-bold text-[#F5EFE2]">{toBanglaDigits(questionTypes.length)} ধরনের প্রশ্ন কাঠামো</p>
                <p className="mt-1 text-sm text-[#A5AEBD]">এমসিকিউ, সৃজনশীল, গণিত ও চিত্রভিত্তিক প্রশ্নসহ পূর্ণাঙ্গ ভাণ্ডার।</p>
              </div>
              <div className="pt-3 sm:pt-0 lg:px-4">
                <p className="text-xs font-semibold text-[#D4A853]">স্থায়ী ডাটা সুরক্ষা</p>
                <p className="mt-1 text-base font-bold text-[#F5EFE2]">অপরিবর্তনীয় স্ন্যাপশট</p>
                <p className="mt-1 text-sm text-[#A5AEBD]">সংরক্ষিত প্রশ্নপত্র মেয়াদ শেষ হওয়ার পরও দেখা ও এক্সপোর্টযোগ্য।</p>
              </div>
              <div className="pt-3 sm:pt-0 lg:pl-4">
                <p className="text-xs font-semibold text-[#D4A853]">স্বচ্ছ অনুমোদন</p>
                <p className="mt-1 text-base font-bold text-[#F5EFE2]">যাচাইকৃত ম্যানুয়াল পেমেন্ট</p>
                <p className="mt-1 text-sm text-[#A5AEBD]">বিকাশ, নগদ ও ব্যাংক যাচাই ও সুস্পষ্ট মেয়াদ নীতিমালা।</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ৩-কলাম অ্যানালিটিক্যাল শোকেস (রেফারেন্স Bento কার্ড স্টাইল অনুযায়ী) */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 space-y-10">
        <SectionDivider
          title="নির্ভুল অধ্যয়ন ও প্রশ্নপত্র স্টুডিও"
          subtitle="অ্যাডমিন সম্পাদনা পর্ষদ কর্তৃক যাচাইকৃত প্রশ্নব্যাংক, স্বয়ংক্রিয় নম্বর হিসাব এবং প্রিন্ট-উপযোগী ওয়ার্ড ও পিডিএফ এক্সপোর্ট।"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* কার্ড ১: প্রিসিশন ইমেজ + মেট্রিক্স */}
          <div className="obsidian-chamfer rounded-xl p-5 flex flex-col justify-between space-y-5">
            <div>
              <p className="text-center text-sm font-bold tracking-wide text-[#EAC779]">
                একাডেমিক মান নিয়ন্ত্রণ
              </p>
              <div className="mt-4 overflow-hidden rounded-lg border border-[#D4A853]/30">
                <img
                  src="/src/assets/images/showcase_gold_precision_1794901361688.jpg"
                  alt="জ্যামিতিক ও একাডেমিক মান নির্ণয় যন্ত্রপাতি"
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#D4A853]/15 pt-4">
                <div>
                  <p className="text-2xl font-bold gold-text-gradient tabular-nums">{toBanglaDigits(classes.length)} স্তর</p>
                  <p className="text-xs text-[#9DA6B5]">ষষ্ঠ থেকে এসএসসি</p>
                </div>
                <div>
                  <p className="text-2xl font-bold gold-text-gradient tabular-nums">{toBanglaDigits(subjects.length)} বিষয়</p>
                  <p className="text-xs text-[#9DA6B5]">বাংলা ও ইংরেজি মাধ্যম</p>
                </div>
              </div>
            </div>
            <Link
              to="/about"
              className="flex items-center justify-center gap-2 rounded-lg gold-outline-btn px-4 py-2.5 text-sm font-semibold"
            >
              <span>আরও বিস্তারিত</span>
              <ArrowRight className="h-4 w-4 text-[#D4A853]" />
            </Link>
          </div>

          {/* কার্ড ২: কভারেজ ও গতিবেগ প্রোগ্রেস বার (রেফারেন্স মধ্যম অ্যানালিটিক কার্ড অনুযায়ী) */}
          <div className="obsidian-chamfer rounded-xl p-5 flex flex-col justify-between space-y-5">
            <div>
              <p className="text-center text-sm font-bold tracking-wide text-[#EAC779]">
                প্রশ্নপত্র জেনারেটর দক্ষতা
              </p>
              <div className="mx-auto mt-5 flex h-36 w-36 flex-col items-center justify-center rounded-full border-2 border-[#D4A853]/65 bg-[#0A0D12] shadow-[inset_0_0_24px_rgba(212,168,83,0.18)]">
                <span className="text-3xl font-bold gold-text-gradient tabular-nums">১০০%</span>
                <span className="mt-0.5 text-xs font-semibold text-[#C2C8D3]">স্বয়ংক্রিয় নম্বর</span>
              </div>

              <div className="mt-6 space-y-3.5 text-sm">
                <div>
                  <div className="flex justify-between text-xs text-[#C2C8D3] mb-1.5">
                    <span>বোর্ড ও স্কুল ফরম্যাট নির্ভুলতা</span>
                    <span className="font-mono text-[#EAC779] tabular-nums">৯৮%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#171C26] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#B88632] to-[#EAC779] w-[98%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-[#C2C8D3] mb-1.5">
                    <span>অধ্যায় ও টপিক কভারেজ</span>
                    <span className="font-mono text-[#EAC779] tabular-nums">৯২%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#171C26] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#B88632] to-[#EAC779] w-[92%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-[#C2C8D3] mb-1.5">
                    <span>প্রস্তুত করতে সময় সাশ্রয়</span>
                    <span className="font-mono text-[#EAC779] tabular-nums">৮৯%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#171C26] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#B88632] to-[#EAC779] w-[89%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* কার্ড ৩: গভীর ফিল্টারিং ও এক্সপোর্ট স্পেকস */}
          <div className="obsidian-chamfer rounded-xl p-5 flex flex-col justify-between space-y-5">
            <div>
              <p className="text-center text-sm font-bold tracking-wide text-[#EAC779]">
                উন্নত ফিল্টারিং ও এক্সপোর্ট
              </p>
              <div className="mt-4 rounded-lg border border-[#D4A853]/25 bg-[#090B10] p-4 space-y-3">
                <div className="flex items-center gap-2.5 text-[#EAC779]">
                  <Filter className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-semibold text-[#F5EFE2]">তাৎক্ষণিক বহু-স্তর ফিল্টার</span>
                </div>
                <p className="text-sm text-[#B8C0CE] leading-relaxed">
                  শ্রেণি, বিভাগ, বিষয়, অধ্যায়, টপিক, প্রশ্নের ধরন, কঠিনতা এবং নম্বর অনুযায়ী মুহূর্তেই প্রশ্ন বাছাই।
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 text-center">
                <div className="rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-3">
                  <p className="text-xl font-bold text-[#F5EFE2] tabular-nums">A4 প্রিন্ট</p>
                  <p className="mt-0.5 text-xs text-[#9DA6B5]">পিডিএফ ও প্রিন্ট</p>
                </div>
                <div className="rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-3">
                  <p className="text-xl font-bold text-[#F5EFE2] tabular-nums">.DOCX</p>
                  <p className="mt-0.5 text-xs text-[#9DA6B5]">ওয়ার্ড ডকুমেন্ট</p>
                </div>
                <div className="rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-3">
                  <p className="text-xl font-bold text-[#EAC779] tabular-nums">উত্তরপত্র</p>
                  <p className="mt-0.5 text-xs text-[#9DA6B5]">ব্যাখ্যাসহ ঐচ্ছিক</p>
                </div>
                <div className="rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-3">
                  <p className="text-xl font-bold text-[#EAC779] tabular-nums">স্ন্যাপশট</p>
                  <p className="mt-0.5 text-xs text-[#9DA6B5]">অপরিবর্তনীয় রেকর্ড</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* অন্তর্ভুক্ত শ্রেণি ও বিষয়সমূহ */}
      <section className="border-y border-[#D4A853]/20 bg-[#0A0D12] py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
          <SectionDivider
            title="অন্তর্ভুক্ত শ্রেণি ও বিষয়সমূহ"
            subtitle="একাডেমিক সম্পাদনা পর্ষদ কর্তৃক বাংলা ও ইংরেজি উভয় মাধ্যমে কেন্দ্রীয়ভাবে সংকলিত।"
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {classes.map((cls) => {
              const clsSubjects = subjects.filter((s) => s.classId === cls.id);
              return (
                <div key={cls.id} className="obsidian-card-interactive rounded-xl p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-bangla text-xl font-bold gold-text-gradient">{cls.nameBn}</h3>
                    <span className="text-xs font-mono text-[#D4A853] tabular-nums">
                      {toBanglaDigits(clsSubjects.length)} বিষয়
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2 border-t border-[#D4A853]/15 pt-3 text-sm text-[#C2C8D3]">
                    {clsSubjects.map((sub) => (
                      <li key={sub.id} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#D4A853]" />
                        <span>{sub.nameBn}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* যেভাবে কাজ করে — ৬/৪ ক্যাপাবিলিটি গ্রিড */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 space-y-10">
        <SectionDivider
          title="প্রশ্নব্যাংক যেভাবে কাজ করে"
          subtitle="অ্যাকাউন্ট খোলা থেকে শুরু করে প্রিন্ট-উপযোগী প্রশ্নপত্র তৈরি পর্যন্ত চারটি সুবিন্যস্ত ধাপ।"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              num: '০১',
              title: 'শ্রেণি-ভিত্তিক প্ল্যান বাছাই করুন',
              desc: 'আপনার পাঠ্যক্রম অনুযায়ী একক শ্রেণি বা একাধিক শ্রেণির বান্ডেল সাবস্ক্রিপশন নির্বাচন করুন।',
            },
            {
              num: '০২',
              title: 'ম্যানুয়াল পেমেন্ট জমা দিন',
              desc: 'বিকাশ, নগদ বা ব্যাংক ট্রান্সফারের মাধ্যমে পেমেন্ট করে ট্রানজেকশন নম্বর জমা দিন।',
            },
            {
              num: '০৩',
              title: 'অনুমোদিত প্রশ্ন ব্রাউজ করুন',
              desc: 'অ্যাডমিন যাচাইয়ের পর বিষয়, অধ্যায়, টপিক, কঠিনতা ও নম্বর অনুযায়ী প্রশ্ন ফিল্টার করুন।',
            },
            {
              num: '০৪',
              title: 'প্রশ্নপত্র সাজান ও ডাউনলোড করুন',
              desc: 'প্রশ্ন যুক্ত করে নম্বর ও ক্রম ঠিক করুন, লাইভ প্রিভিউ দেখুন এবং পিডিএফ বা ওয়ার্ড ডাউনলোড করুন।',
            },
          ].map((item) => (
            <div key={item.num} className="obsidian-card rounded-xl p-5 space-y-2.5">
              <span className="inline-block font-mono text-sm font-bold text-[#EAC779] border-b border-[#D4A853]/45 pb-1 tabular-nums">
                ধাপ {item.num}
              </span>
              <h3 className="font-bangla text-lg font-bold text-[#F5EFE2]">{item.title}</h3>
              <p className="text-sm text-[#B8C0CE] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* ৬-আইকন প্ল্যাটফর্ম সুবিধা স্ট্রিপ */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 pt-2">
          {[
            { icon: <BookOpen className="h-5 w-5" />, title: 'পছন্দ ও বুকমার্ক', sub: 'দ্রুত পুনর্ব্যবহার' },
            { icon: <FileSpreadsheet className="h-5 w-5" />, title: '৭ ধরনের ফরম্যাট', sub: 'সৃজনশীল ও গণিত' },
            { icon: <GraduationCap className="h-5 w-5" />, title: 'দুই মাধ্যম', sub: 'বাংলা ও ইংরেজি' },
            { icon: <FileText className="h-5 w-5" />, title: 'প্রতিষ্ঠানের লোগো', sub: 'কাস্টম হেডার' },
            { icon: <Layers className="h-5 w-5" />, title: 'ড্র্যাগ ক্রমবিন্যাস', sub: 'সহজ প্রশ্ন সাজানো' },
            { icon: <ShieldCheck className="h-5 w-5" />, title: 'রোল নিয়ন্ত্রিত', sub: 'সুরক্ষিত ওয়ার্কস্পেস' },
          ].map((cap) => (
            <div
              key={cap.title}
              className="obsidian-card rounded-xl p-4 text-center flex flex-col items-center justify-center gap-2"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D4A853]/35 bg-[#141822] text-[#EAC779]">
                {cap.icon}
              </div>
              <p className="text-sm font-semibold text-[#F5EFE2]">{cap.title}</p>
              <p className="text-xs text-[#8C95A4]">{cap.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* সাবস্ক্রিপশন প্ল্যান প্রিভিউ */}
      <section className="border-y border-[#D4A853]/20 bg-[#0A0D12] py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
          <SectionDivider
            title="সাবস্ক্রিপশন প্ল্যানসমূহ (নমুনা মূল্য)"
            subtitle="সকল প্ল্যানের মূল্য ও মেয়াদ অ্যাডমিন ড্যাশবোর্ড থেকে পরিবর্তনযোগ্য। এখানে নমুনা মূল্য প্রদর্শিত হয়েছে।"
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const bn = PLAN_TRANSLATIONS_BN[plan.id];
              const displayAudience = bn?.audience || 'সাবস্ক্রিপশন প্যাকেজ';
              const displayDesc = bn?.desc || plan.description;
              const displayFeatures = bn?.features || plan.features.slice(0, 3);

              return (
                <div
                  key={plan.id}
                  className="obsidian-card-interactive flex flex-col justify-between rounded-xl p-5"
                >
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-[#D4A853]">{displayAudience}</p>
                    <h3 className="mt-1 font-bangla text-xl font-bold text-[#F5EFE2]">{plan.nameBn}</h3>
                    <div className="mt-3 flex items-baseline gap-2 tabular-nums">
                      <span className="font-bangla text-3xl font-bold gold-text-gradient">
                        ৳{toBanglaDigits(plan.priceBdt.toLocaleString())}
                      </span>
                      <span className="text-sm text-[#8C95A4]">/ {toBanglaDigits(plan.durationDays)} দিন</span>
                    </div>
                    <p className="mt-3 text-sm text-[#B8C0CE] leading-relaxed">{displayDesc}</p>
                    <ul className="mt-4 space-y-2 border-t border-[#D4A853]/15 pt-3 text-sm text-[#E5E0D5]">
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
                    className="mt-5 block rounded-lg gold-outline-btn px-4 py-2.5 text-center text-sm font-semibold"
                  >
                    প্ল্যান নির্বাচন করুন
                  </Link>
                </div>
              );
            })}
          </div>

          {/* হাইলাইটেড প্ল্যান কমপ্যারিসন কার্ড (রেফারেন্স বটম শোকেস অনুযায়ী) */}
          {featuredPlan && (
            <div className="obsidian-chamfer rounded-xl p-6 lg:p-8">
              <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
                <div className="lg:col-span-5 space-y-2">
                  <p className="text-xs font-bold tracking-widest text-[#D4A853]">
                    সর্বাধিক জনপ্রিয় প্যাকেজ
                  </p>
                  <h3 className="font-bangla text-2xl font-bold gold-text-gradient">
                    {featuredPlan.nameBn}
                  </h3>
                  <p className="text-sm text-[#B8C0CE] leading-relaxed">
                    {featuredBn?.desc || featuredPlan.description}
                  </p>
                </div>

                <div className="lg:col-span-4 space-y-2 text-sm text-[#E5E0D5]">
                  {(featuredBn?.features || featuredPlan.features).slice(0, 4).map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#EAC779] shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <div className="lg:col-span-3 flex flex-col items-start lg:items-end justify-center gap-3">
                  <div className="tabular-nums lg:text-right">
                    <p className="text-3xl font-bold gold-text-gradient">
                      ৳{toBanglaDigits(featuredPlan.priceBdt.toLocaleString())}
                    </p>
                    <p className="text-xs text-[#9DA6B5]">
                      মেয়াদ {toBanglaDigits(featuredPlan.durationDays)} দিন
                    </p>
                  </div>
                  <Link
                    to={`/dashboard/payments/new?planId=${featuredPlan.id}`}
                    className="inline-flex w-full lg:w-auto items-center justify-center gap-2 rounded-lg gold-btn px-6 py-2.5 text-sm font-bold"
                  >
                    <span>এখনই শুরু করুন</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* নোটিশ ও সচরাচর জিজ্ঞাসা */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="font-bangla text-2xl font-bold gold-text-gradient">প্ল্যাটফর্ম নোটিশ</h2>
            <div className="mt-5 space-y-4">
              {notices.map((notice) => {
                const bnNotice = NOTICE_TRANSLATIONS_BN[notice.id];
                return (
                  <div key={notice.id} className="obsidian-card rounded-xl p-5">
                    <p className="text-xs font-mono text-[#D4A853] tabular-nums">
                      {toBanglaDigits(new Date(notice.createdAt).toLocaleDateString('en-GB'))}
                    </p>
                    <h3 className="mt-1.5 text-base font-semibold text-[#F5EFE2]">
                      {bnNotice?.title || notice.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-[#B8C0CE] leading-relaxed">
                      {bnNotice?.body || notice.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="flex items-center justify-between">
              <h2 className="font-bangla text-2xl font-bold gold-text-gradient">
                সচরাচর জিজ্ঞাসিত প্রশ্ন
              </h2>
              <Link to="/faq" className="text-sm font-semibold text-[#EAC779] hover:underline">
                সবগুলো প্রশ্ন →
              </Link>
            </div>
            <div className="mt-5 obsidian-card divide-y divide-[#D4A853]/15 rounded-xl">
              {faqs.slice(0, 4).map((faq) => {
                const bnFaq = FAQ_TRANSLATIONS_BN[faq.id];
                return (
                  <div key={faq.id} className="p-5">
                    <h3 className="text-base font-semibold text-[#F5EFE2]">
                      {bnFaq?.question || faq.question}
                    </h3>
                    <p className="mt-2 text-sm text-[#B8C0CE] leading-relaxed">
                      {bnFaq?.answer || faq.answer}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* চূড়ান্ত আহ্বান */}
      <section className="border-t border-[#D4A853]/25 bg-[radial-gradient(ellipse_at_center,rgba(212,168,83,0.14),transparent_70%)] py-14">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="font-bangla text-2xl font-bold sm:text-3xl gold-text-gradient">
              প্রশ্নব্যাংক ওয়ার্কস্পেস ব্যবহার করতে প্রস্তুত?
            </h2>
            <p className="mt-2 text-base text-[#C2C8D3]">
              এক ক্লিকে ডেমো শিক্ষার্থী বা অ্যাডমিন অ্যাকাউন্টে লগইন করুন অথবা নতুন শিক্ষার্থী অ্যাকাউন্ট তৈরি করুন।
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              to="/login"
              className="rounded-lg gold-btn px-6 py-3 text-base font-bold"
            >
              ডেমো লগইন করুন
            </Link>
            <Link
              to="/pricing"
              className="rounded-lg gold-outline-btn px-6 py-3 text-base font-semibold"
            >
              প্ল্যানসমূহ দেখুন
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
