import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  FileSpreadsheet,
  FileText,
  Filter,
  Gamepad2,
  GraduationCap,
  Library,
  Presentation,
  Radio,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import {
  FAQ_TRANSLATIONS_BN,
  NOTICE_TRANSLATIONS_BN,
  toBanglaDigits,
} from '../../lib/bn';
import { useAuth } from '../../contexts/AuthContext';
import { examService, type ExamSummary } from '../../services/examService';
import { profileService } from '../../services/profileService';
import { questionBankService } from '../../services/questionBankService';
import type { LeaderboardEntry } from '../../types/domain';

function SectionDivider({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center max-w-3xl mx-auto">
      <div className="flex items-center justify-center gap-4">
        <span className="hidden sm:block h-px flex-1 max-w-[140px] section-divider-line" />
        <h2 className="font-bangla text-2xl sm:text-3xl font-bold tracking-tight gold-text-gradient">
          {title}
        </h2>
        <span className="hidden sm:block h-px flex-1 max-w-[140px] section-divider-line" />
      </div>
      {subtitle && (
        <p className="mt-2.5 text-base text-[#B8C0CE] leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

export function HomePage() {
  const { user, revision } = useAuth();
  const { classes, subjects, faqs, notices, siteSettings } = React.useMemo(
    () => questionBankService.getPublicSiteData(),
    [revision]
  );

  const [liveExams, setLiveExams] = useState<ExamSummary[]>([]);
  const [topStudents, setTopStudents] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      examService.listExams({ status: 'live' }),
      profileService.getLeaderboard(),
    ]).then(([exRes, lbRes]) => {
      if (!active) return;
      setLiveExams(exRes.exams.slice(0, 2));
      setTopStudents(lbRes.entries.slice(0, 3));
    });
    return () => {
      active = false;
    };
  }, [revision]);

  const paperTarget = '/academic';

  const coreFeatures = [
    {
      id: 'paper-maker',
      label: '০১ • প্রশ্নপত্র স্টুডিও',
      title: 'প্রশ্নপত্র তৈরি',
      subtitle: 'Academic & Admission Builder',
      description:
        'কেন্দ্রীয় প্রশ্নব্যাংক থেকে শ্রেণি ১–১২ বা ভর্তি পরীক্ষার অধ্যায়, টপিক, বোর্ড ও সাল অনুযায়ী প্রশ্ন বাছাই করে প্রিন্ট-উপযোগী A4 প্রশ্নপত্র, OMR শিট ও .DOCX তৈরি করুন।',
      highlights: [
        'একাডেমিক (১–১২) ও বিশ্ববিদ্যালয়/বুয়েট/মেডিকেল ভর্তি প্রশ্নব্যাংক',
        'বোর্ড (২০১০–২০২৬), কঠিনতা ও ৯ ধরনের প্রশ্ন ফিল্টার',
        'সম্পাদনাযোগ্য ডকুমেন্ট এডিটর, OMR শিট, PDF ও .DOCX এক্সপোর্ট',
      ],
      ctaLabel: 'একাডেমিক প্রশ্নপত্র তৈরি করুন',
      ctaTo: paperTarget,
      icon: <FileText className="h-6 w-6" />,
      featured: false,
    },
    {
      id: 'slide-maker',
      label: '০২ • অটো প্রেজেন্টেশন',
      title: 'স্লাইড তৈরি',
      subtitle: 'Auto Slide Maker',
      description:
        '১০ থেকে ১০০টি MCQ পেস্ট করে বা প্রশ্নব্যাংক থেকে এনে কয়েক সেকেন্ডে প্রশ্ন ও আলাদা উত্তর-রিভিল স্লাইড তৈরি করুন ও .PPTX হিসেবে ডাউনলোড করুন।',
      highlights: [
        '৫টি প্রফেশনাল টেমপ্লেট ও কাস্টম কালার/ফন্ট',
        '16:9, 16:10, 4:3 লাইভ প্রিভিউ ও স্লাইড এডিটর',
        'সম্পাদনাযোগ্য PowerPoint (.pptx) ও PDF এক্সপোর্ট',
      ],
      ctaLabel: 'স্লাইড মেকার খুলুন',
      ctaTo: '/slides',
      icon: <Presentation className="h-6 w-6" />,
      featured: true,
    },
    {
      id: 'live-exam',
      label: '০৩ • রিয়েল-টাইম মূল্যায়ন',
      title: 'লাইভ পরীক্ষা',
      subtitle: 'Live Exam System',
      description:
        'প্রশ্নব্যাংক থেকে ১০–১০০টি র‍্যান্ডম বা বাছাইকৃত MCQ নিয়ে চর্চা-স্টাইল টাইমড লাইভ পরীক্ষা তৈরি করুন, ফলাফল দেখুন ও লিডারবোর্ডে অংশ নিন।',
      highlights: [
        'লাইভ কাউন্টডাউন টাইমার ও রিভিউ ফ্ল্যাগিং',
        'ঐচ্ছিক নেগেটিভ মার্কিং ও প্রাইভেট অ্যাক্সেস কোড',
        'তাৎক্ষণিক উত্তর বিশ্লেষণ ও পাবলিক প্রোফাইল',
      ],
      ctaLabel: 'লাইভ পরীক্ষায় অংশ নিন',
      ctaTo: '/exams',
      icon: <Radio className="h-6 w-6" />,
      featured: false,
    },
  ];

  return (
    <div className="font-bangla bg-[#07090C] text-[#F3EEE3]">
      {/* Hero & Three Core Feature Pillars */}
      <section className="hero-theme-surface relative border-b border-[#D4A853]/20">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-18 sm:px-6 space-y-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <p className="hero-kicker text-xs font-mono font-bold tracking-[0.22em] text-[#D4A853] uppercase">
              ALL-IN-ONE ACADEMIC WORKSPACE
            </p>
            <h1 className="hero-headline font-display text-3xl sm:text-5xl font-bold tracking-tight text-balance gold-text-gradient leading-[1.18]">
              {siteSettings.heroHeadline || 'প্রশ্নপত্র তৈরি, স্লাইড তৈরি ও লাইভ পরীক্ষা — এক প্ল্যাটফর্মে'}
            </h1>
            <p className="hero-subheadline text-base sm:text-lg text-[#C2C8D3] leading-relaxed max-w-2xl mx-auto">
              {siteSettings.heroSubheadline ||
                'একটি কেন্দ্রীয় প্রশ্নব্যাংক থেকে নিমেষেই তৈরি করুন প্রিন্ট-রেডি প্রশ্নপত্র, আকর্ষণীয় MCQ প্রেজেন্টেশন স্লাইড এবং সময়সীমা-ভিত্তিক লাইভ অনলাইন পরীক্ষা।'}
            </p>
          </div>

          {/* 3 Main Feature Cards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {coreFeatures.map((feat) => (
              <div
                key={feat.id}
                className={`rounded-xl p-6 flex flex-col justify-between space-y-6 transition-all ${
                  feat.featured
                    ? 'obsidian-chamfer'
                    : 'obsidian-card-interactive'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-mono font-bold text-[#D4A853]">
                      {feat.label}
                    </span>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D4A853]/40 bg-[#141822] text-[#EAC779] shrink-0">
                      {feat.icon}
                    </div>
                  </div>

                  <div>
                    <h2 className="font-display text-2xl font-bold text-[#F5EFE2]">
                      {feat.title}
                    </h2>
                    <p className="text-xs font-mono text-[#9DA6B5] mt-0.5">{feat.subtitle}</p>
                  </div>

                  <p className="text-sm text-[#C2C8D3] leading-relaxed">{feat.description}</p>

                  <ul className="space-y-2 border-t border-[#D4A853]/15 pt-4 text-sm text-[#E5E0D5]">
                    {feat.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-[#EAC779] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  to={feat.ctaTo}
                  className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
                    feat.featured ? 'gold-btn' : 'gold-outline-btn hover:border-[#EAC779]'
                  }`}
                >
                  <span>{feat.ctaLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
          {/* 4-Pillar Platform Navigation Strip */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2">
            {[
              {
                to: '/academic',
                icon: <BookOpen className="h-5 w-5" />,
                title: 'একাডেমিক (শ্রেণি ১–১২)',
                desc: 'অধ্যায় ও টপিকভিত্তিক বোর্ড প্রশ্নপত্র বিল্ডার ও OMR শিট।',
              },
              {
                to: '/admission',
                icon: <GraduationCap className="h-5 w-5" />,
                title: 'ভর্তি পরীক্ষা বিল্ডার',
                desc: 'বিশ্ববিদ্যালয়, প্রকৌশল (BUET) ও মেডিকেল ভর্তি প্রশ্নপত্র।',
              },
              {
                to: '/learning',
                icon: <Library className="h-5 w-5" />,
                title: 'ফ্রি লার্নিং হাব',
                desc: 'গণিত, উচ্চতর গণিত, পদার্থবিজ্ঞান ও রসায়নের ধাপে ধাপে সমাধান ও ভিডিও।',
              },
              {
                to: '/kids-game',
                icon: <Gamepad2 className="h-5 w-5" />,
                title: 'কিডস ম্যাথ গেম',
                desc: 'ছোটদের জন্য মজার যোগ, বিয়োগ, গুণ ও ভাগের পাঠ ও খেলা।',
              },
            ].map((mod) => (
              <Link
                key={mod.to}
                to={mod.to}
                className="obsidian-card-interactive rounded-xl p-4 flex flex-col justify-between gap-3 group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D4A853]/35 bg-[#141822] text-[#EAC779] shrink-0">
                    {mod.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[#F5EFE2] group-hover:text-[#EAC779] transition-colors">
                      {mod.title}
                    </h3>
                    <p className="mt-1 text-xs text-[#9DA6B5] leading-relaxed">{mod.desc}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#D4A853]">
                  প্রবেশ করুন <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Live Exam & Top Leaderboard Highlight Strip */}
      {(liveExams.length > 0 || topStudents.length > 0) && (
        <section className="border-b border-[#D4A853]/20 bg-[#0A0D12] py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Active Live Exams */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-mono font-bold text-[#D4A853]">LIVE SESSIONS</p>
                  <h2 className="font-display text-2xl font-bold text-[#F5EFE2]">
                    চলমান লাইভ পরীক্ষাসমূহ
                  </h2>
                </div>
                <Link
                  to="/exams"
                  className="text-sm font-semibold text-[#EAC779] hover:underline whitespace-nowrap"
                >
                  সব পরীক্ষা দেখুন →
                </Link>
              </div>

              <div className="space-y-3">
                {liveExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="obsidian-card-interactive rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-base font-bold text-[#F5EFE2] truncate">{exam.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#9DA6B5] tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5 text-[#D4A853]" />
                          {toBanglaDigits(exam.questionIds.length)}টি MCQ
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-[#D4A853]" />
                          {toBanglaDigits(exam.durationMinutes)} মিনিট
                        </span>
                        <span>অংশগ্রহণ: {toBanglaDigits(exam.participantCount)} জন</span>
                      </div>
                    </div>

                    <Link
                      to={exam.accessMode === 'private' ? '/exams' : `/exams/${exam.id}/take`}
                      className="rounded-lg gold-btn px-4 py-2 text-xs font-bold whitespace-nowrap shrink-0 text-center"
                    >
                      {exam.accessMode === 'private' ? 'কোড দিয়ে প্রবেশ' : 'অংশ নিন'}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 3 Leaderboard Snapshot */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-mono font-bold text-[#D4A853]">TOP PERFORMERS</p>
                  <h2 className="font-display text-2xl font-bold text-[#F5EFE2]">
                    শীর্ষ ৩ শিক্ষার্থী
                  </h2>
                </div>
                <Link
                  to="/leaderboard"
                  className="text-sm font-semibold text-[#EAC779] hover:underline whitespace-nowrap"
                >
                  পূর্ণ তালিকা →
                </Link>
              </div>

              <div className="obsidian-card rounded-xl divide-y divide-[#D4A853]/15">
                {topStudents.map((st) => (
                  <Link
                    key={st.userId}
                    to={`/students/${st.userId}`}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-8 w-8 rounded-lg border border-[#D4A853]/40 bg-[#141822] text-sm font-mono font-bold text-[#EAC779] flex items-center justify-center shrink-0 tabular-nums">
                        #{toBanglaDigits(st.rank)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#F5EFE2] truncate">{st.fullName}</p>
                        <p className="text-xs text-[#9DA6B5] truncate">
                          {st.institution || st.className || 'শিক্ষার্থী'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <p className="text-sm font-bold text-[#EAC779]">
                        {toBanglaDigits(st.totalScore)} নম্বর
                      </p>
                      <p className="text-xs text-emerald-400">
                        {toBanglaDigits(st.averagePercent)}% গড়
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ৩-কলাম অ্যানালিটিক্যাল শোকেস */}
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
                  <p className="text-2xl font-bold gold-text-gradient tabular-nums">{toBanglaDigits(classes.length)} শ্রেণি</p>
                  <p className="text-xs text-[#9DA6B5]">প্রথম থেকে দ্বাদশ (১–১২)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold gold-text-gradient tabular-nums">{toBanglaDigits(subjects.length)} বিষয়</p>
                  <p className="text-xs text-[#9DA6B5]">NCTB পাঠ্যক্রম অনুযায়ী</p>
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

          {/* কার্ড ২: কভারেজ ও গতিবেগ প্রোগ্রেস বার */}
          <div className="obsidian-chamfer rounded-xl p-5 flex flex-col justify-between space-y-5">
            <div>
              <p className="text-center text-sm font-bold tracking-wide text-[#EAC779]">
                প্রশ্নপত্র ও স্লাইড দক্ষতা
              </p>
              <div className="mx-auto mt-5 flex h-36 w-36 flex-col items-center justify-center rounded-full border-2 border-[#D4A853]/65 bg-[#0A0D12] shadow-[inset_0_0_24px_rgba(212,168,83,0.18)]">
                <span className="text-3xl font-bold gold-text-gradient tabular-nums">১০০%</span>
                <span className="mt-0.5 text-xs font-semibold text-[#C2C8D3]">কেন্দ্রীয় প্রশ্নব্যাংক</span>
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
                    <span>স্লাইড ও লাইভ পরীক্ষা ইন্টিগ্রেশন</span>
                    <span className="font-mono text-[#EAC779] tabular-nums">৯৫%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#171C26] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#B88632] to-[#EAC779] w-[95%]" />
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
                  <span className="text-sm font-semibold text-[#F5EFE2]">এক উৎস, তিন আউটপুট</span>
                </div>
                <p className="text-sm text-[#B8C0CE] leading-relaxed">
                  একই প্রশ্নব্যাংক থেকে বাছাইকৃত প্রশ্ন দিয়ে প্রশ্নপত্র, ক্লাস স্লাইড ও লাইভ পরীক্ষা তৈরি করুন।
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 text-center">
                <div className="rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-3">
                  <p className="text-xl font-bold text-[#F5EFE2] tabular-nums">A4 প্রিন্ট</p>
                  <p className="mt-0.5 text-xs text-[#9DA6B5]">প্রশ্নপত্র ও উত্তর</p>
                </div>
                <div className="rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-3">
                  <p className="text-xl font-bold text-[#F5EFE2] tabular-nums">.DOCX</p>
                  <p className="mt-0.5 text-xs text-[#9DA6B5]">ওয়ার্ড ডকুমেন্ট</p>
                </div>
                <div className="rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-3">
                  <p className="text-xl font-bold text-[#EAC779] tabular-nums">.PPTX</p>
                  <p className="mt-0.5 text-xs text-[#9DA6B5]">সম্পাদনাযোগ্য স্লাইড</p>
                </div>
                <div className="rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-3">
                  <p className="text-xl font-bold text-[#EAC779] tabular-nums">লাইভ র‍্যাংক</p>
                  <p className="mt-0.5 text-xs text-[#9DA6B5]">লিডারবোর্ড ও প্রোফাইল</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* যেভাবে কাজ করে */}
      <section className="border-t border-[#D4A853]/20 mx-auto max-w-6xl px-4 py-16 sm:px-6 space-y-10">
        <SectionDivider
          title="প্রশ্নব্যাংক যেভাবে কাজ করে"
          subtitle="অ্যাকাউন্ট খোলা থেকে শুরু করে প্রশ্নপত্র, স্লাইড ও লাইভ পরীক্ষা পরিচালনা পর্যন্ত সুবিন্যস্ত কর্মপ্রবাহ।"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              num: '০১',
              title: 'প্ল্যান বাছাই ও অ্যাক্সেস',
              desc: 'আপনার পাঠ্যক্রম অনুযায়ী একক শ্রেণি বা একাধিক শ্রেণির বান্ডেল সাবস্ক্রিপশন নির্বাচন করুন।',
            },
            {
              num: '০২',
              title: 'প্রশ্নপত্র ও স্লাইড তৈরি',
              desc: 'প্রশ্নব্যাংক থেকে বাছাই করে প্রিন্ট-রেডি প্রশ্নপত্র কিংবা ১০–১০০টি MCQ দিয়ে .PPTX স্লাইড বানান।',
            },
            {
              num: '০৩',
              title: 'লাইভ পরীক্ষা পরিচালনা',
              desc: 'সময়সীমা, নেগেটিভ মার্কিং ও পাবলিক/প্রাইভেট অ্যাক্সেসসহ অনলাইন পরীক্ষা প্রকাশ করুন।',
            },
            {
              num: '০৪',
              title: 'ফলাফল ও লিডারবোর্ড',
              desc: 'স্বয়ংক্রিয় মূল্যায়নের পর উত্তর বিশ্লেষণ, অর্জন ও মেধা তালিকায় নিজের অবস্থান দেখুন।',
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
            { icon: <BookOpen className="h-5 w-5" />, title: 'কেন্দ্রীয় প্রশ্নব্যাংক', sub: 'এক উৎস থেকে সব' },
            { icon: <Presentation className="h-5 w-5" />, title: 'অটো স্লাইড মেকার', sub: '.PPTX ও PDF' },
            { icon: <Radio className="h-5 w-5" />, title: 'লাইভ পরীক্ষা', sub: 'কাউন্টডাউন টাইমার' },
            { icon: <Trophy className="h-5 w-5" />, title: 'লিডারবোর্ড', sub: 'বিষয়ভিত্তিক র‍্যাংক' },
            { icon: <FileSpreadsheet className="h-5 w-5" />, title: '৭ ধরনের ফরম্যাট', sub: 'সৃজনশীল ও MCQ' },
            { icon: <ShieldCheck className="h-5 w-5" />, title: 'প্রাইভেসি কন্ট্রোল', sub: 'সুরক্ষিত প্রোফাইল' },
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

      {/* নোটিশ ও সচরাচর জিজ্ঞাসা */}
      <section className="border-t border-[#D4A853]/20 mx-auto max-w-6xl px-4 py-16 sm:px-6">
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
      <section className="hero-theme-surface border-t border-[#D4A853]/25 py-14">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="hero-headline font-bangla text-2xl font-bold sm:text-3xl gold-text-gradient">
              প্রশ্নপত্র, স্লাইড তৈরি ও লাইভ পরীক্ষা শুরু করতে প্রস্তুত?
            </h2>
            <p className="hero-subheadline mt-2 text-base text-[#C2C8D3]">
              এক ক্লিকে সরাসরি একাডেমিক ও অ্যাডমিশন প্রশ্নপত্র, স্লাইড তৈরি অথবা লাইভ পরীক্ষা ব্যবহার শুরু করুন।
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              to="/slides"
              className="rounded-lg gold-btn px-6 py-3 text-base font-bold"
            >
              স্লাইড তৈরি করুন
            </Link>
            <Link
              to="/exams"
              className="rounded-lg gold-outline-btn px-6 py-3 text-base font-semibold"
            >
              লাইভ পরীক্ষা দেখুন
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
