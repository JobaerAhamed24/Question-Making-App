import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  ChevronRight,
  Compass,
  FlaskConical,
  GraduationCap,
  Layers,
  Scale,
  Search,
  Settings2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  buildClassDisplayCards,
  type ClassDisplayCard,
  EDUCATION_LEVEL_LABELS,
  getSubjectsForClassAndGroup,
  SUBJECT_CATEGORY_LABELS,
} from '../../data/curriculumData';
import { toBanglaDigits } from '../../lib/bn';
import { questionBankService } from '../../services/questionBankService';
import type {
  AcademicGroup,
  AcademicGroupCode,
  EducationLevel,
  Subject,
  SubjectCategory,
} from '../../types/domain';

const LEVEL_ORDER: EducationLevel[] = ['primary', 'secondary', 'higher_secondary'];

const CATEGORY_STYLES: Record<SubjectCategory, string> = {
  compulsory: 'border-[#D4A853]/45 bg-[#D4A853]/12 text-[#EAC779]',
  group: 'border-sky-400/40 bg-sky-950/50 text-sky-200',
  optional: 'border-emerald-400/40 bg-emerald-950/45 text-emerald-200',
  fourth: 'border-amber-400/40 bg-amber-950/45 text-amber-200',
};

function getGroupIcon(code?: AcademicGroupCode, name?: string) {
  const key = code || name?.toLowerCase() || '';
  if (key.includes('science')) return <FlaskConical className="h-5 w-5" />;
  if (key.includes('business') || key.includes('commerce')) return <Briefcase className="h-5 w-5" />;
  return <Scale className="h-5 w-5" />;
}

export function CurriculumExplorerPage({ inDashboard = false }: { inDashboard?: boolean }) {
  const { user, revision } = useAuth();
  const catalogue = useMemo(
    () => questionBankService.getAcademicCatalogue(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision]
  );

  const activeClasses = useMemo(
    () =>
      catalogue.classes
        .filter((c) => c.isActive)
        .slice()
        .sort((a, b) => a.levelOrder - b.levelOrder),
    [catalogue.classes]
  );

  const activeGroups = useMemo(
    () => catalogue.groups.filter((g) => g.isActive),
    [catalogue.groups]
  );

  const activeSubjects = useMemo(
    () => catalogue.subjects.filter((s) => s.isActive),
    [catalogue.subjects]
  );

  const [levelFilter, setLevelFilter] = useState<'all' | EducationLevel>('all');
  const [selectedCardId, setSelectedCardId] = useState<string>('card-9-10');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('grp-science');
  const [categoryFilter, setCategoryFilter] = useState<'all' | SubjectCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const classCards = useMemo(
    () => buildClassDisplayCards(activeClasses),
    [activeClasses]
  );

  const visibleCards = useMemo(() => {
    if (levelFilter === 'all') return classCards;
    return classCards.filter((card) => card.educationLevel === levelFilter);
  }, [classCards, levelFilter]);

  const groupedClasses = useMemo(() => {
    const levelsToShow = levelFilter === 'all' ? LEVEL_ORDER : [levelFilter];
    return levelsToShow
      .map((lvl) => ({
        level: lvl,
        meta: EDUCATION_LEVEL_LABELS[lvl],
        cards: classCards.filter((card) => card.educationLevel === lvl),
      }))
      .filter((section) => section.cards.length > 0);
  }, [classCards, levelFilter]);

  const selectedCard: ClassDisplayCard | undefined = useMemo(() => {
    return (
      classCards.find((card) => card.id === selectedCardId) ||
      visibleCards[0] ||
      classCards[0]
    );
  }, [classCards, selectedCardId, visibleCards]);

  const selectedClass = selectedCard?.primaryClass;

  const classGroups: AcademicGroup[] = useMemo(() => {
    if (!selectedClass || !selectedClass.hasGroups) return [];
    return activeGroups.filter((g) => g.classId === selectedClass.id);
  }, [activeGroups, selectedClass]);

  const effectiveGroupId = useMemo(() => {
    if (!selectedClass?.hasGroups || classGroups.length === 0) return null;
    if (classGroups.some((g) => g.id === selectedGroupId)) return selectedGroupId;
    return classGroups[0].id;
  }, [classGroups, selectedClass, selectedGroupId]);

  const selectedGroup = classGroups.find((g) => g.id === effectiveGroupId) || null;

  const classGroupSubjects: Subject[] = useMemo(() => {
    return getSubjectsForClassAndGroup(
      activeSubjects,
      selectedClass,
      effectiveGroupId,
      false
    );
  }, [activeSubjects, effectiveGroupId, selectedClass]);

  const categoryCounts = useMemo(() => {
    const counts: Record<'all' | SubjectCategory, number> = {
      all: classGroupSubjects.length,
      compulsory: 0,
      group: 0,
      optional: 0,
      fourth: 0,
    };
    for (const sub of classGroupSubjects) {
      const cat = sub.category || 'compulsory';
      counts[cat] += 1;
    }
    return counts;
  }, [classGroupSubjects]);

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return classGroupSubjects.filter((s) => {
      const cat = s.category || 'compulsory';
      if (categoryFilter !== 'all' && cat !== categoryFilter) return false;
      if (q) {
        const hay = `${s.nameBn} ${s.name} ${s.code}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [classGroupSubjects, categoryFilter, searchQuery]);

  const handleSelectCard = (card: ClassDisplayCard) => {
    setSelectedCardId(card.id);
    setCategoryFilter('all');
    setSearchQuery('');
    if (card.hasGroups) {
      const firstGrp = activeGroups.find((g) => g.classId === card.primaryClass.id);
      if (firstGrp) setSelectedGroupId(firstGrp.id);
    }
  };

  const getGroupDisplayLabel = (subject: Subject): string => {
    if (!selectedClass?.hasGroups) return 'সাধারণ পাঠ্যক্রম';
    const hasSpecific =
      (subject.groupIds && subject.groupIds.length > 0) || Boolean(subject.groupId);
    if (!hasSpecific) return 'সকল বিভাগ (সাধারণ)';
    const ids =
      subject.groupIds && subject.groupIds.length > 0
        ? subject.groupIds
        : subject.groupId
        ? [subject.groupId]
        : [];
    const names = ids
      .map((gid) => activeGroups.find((g) => g.id === gid)?.nameBn)
      .filter(Boolean);
    return names.length > 0 ? names.join(' / ') : selectedGroup?.nameBn || '';
  };

  const selectedLevel = selectedCard?.educationLevel || 'secondary';
  const selectedLevelMeta = EDUCATION_LEVEL_LABELS[selectedLevel];

  return (
    <div
      className={`font-bangla text-[#F3EEE3] ${
        inDashboard ? 'space-y-6' : 'min-h-screen bg-[#07090C]'
      }`}
    >
      <div className={inDashboard ? 'space-y-6' : 'mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-8'}>
        {/* Header Bar */}
        <section className="obsidian-chamfer rounded-xl p-6 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2 max-w-3xl">
              {!inDashboard && (
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4A853] hover:text-[#EAC779]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>হোম পেজে ফিরে যান</span>
                </Link>
              )}
              <h1 className="font-display text-2xl sm:text-3xl font-bold gold-text-gradient text-balance">
                শ্রেণি ১–১২ বাংলাদেশ শিক্ষা বোর্ড ও এনসিটিবি পাঠ্যক্রম
              </h1>
              <p className="text-sm sm:text-base text-[#B8C0CE] leading-relaxed">
                প্রাথমিক (শ্রেণি ১–৫), মাধ্যমিক (শ্রেণি ৬–১০) এবং উচ্চ মাধ্যমিক (শ্রেণি ১১–১২) স্তরের পূর্ণাঙ্গ বিষয় তালিকা।
                শ্রেণি ৯–১২ এর জন্য বিজ্ঞান, মানবিক ও ব্যবসায় শিক্ষা বিভাগ অনুযায়ী আবশ্যিক, বিভাগভিত্তিক, ঐচ্ছিক ও চতুর্থ বিষয় আলাদাভাবে দেখুন।
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {user?.role === 'admin' && (
                <Link
                  to="/admin/academic"
                  className="inline-flex items-center gap-2 rounded-lg gold-btn px-4 py-2.5 text-sm font-bold whitespace-nowrap shrink-0"
                >
                  <Settings2 className="h-4 w-4" />
                  <span>পাঠ্যক্রম পরিচালনা</span>
                </Link>
              )}
              <Link
                to={user ? '/dashboard/questions' : '/exams'}
                className="inline-flex items-center gap-2 rounded-lg gold-outline-btn px-4 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0"
              >
                <BookOpen className="h-4 w-4 text-[#D4A853]" />
                <span>{user ? 'প্রশ্নব্যাংক খুলুন' : 'লাইভ পরীক্ষা দেখুন'}</span>
              </Link>
            </div>
          </div>

          {/* Summary Metrics & Level Segmented Filter */}
          <div className="mt-6 flex flex-col gap-4 border-t border-[#D4A853]/18 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#9DA6B5] tabular-nums">
              <span>মোট শ্রেণি: {toBanglaDigits(activeClasses.length)}</span>
              <span aria-hidden="true">·</span>
              <span>সক্রিয় বিষয়: {toBanglaDigits(activeSubjects.length)}</span>
              <span aria-hidden="true">·</span>
              <span>বিভাগভিত্তিক শ্রেণি: ৯ম–১২শ</span>
            </div>

            <div
              role="tablist"
              aria-label="শিক্ষা স্তর নির্বাচন"
              className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#D4A853]/25 bg-[#0A0D12] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={levelFilter === 'all'}
                onClick={() => setLevelFilter('all')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  levelFilter === 'all'
                    ? 'gold-btn'
                    : 'text-[#B8C0CE] hover:text-[#F5EFE2]'
                }`}
              >
                সকল স্তর (১–১২)
              </button>
              {LEVEL_ORDER.map((lvl) => {
                const meta = EDUCATION_LEVEL_LABELS[lvl];
                return (
                  <button
                    key={lvl}
                    type="button"
                    role="tab"
                    aria-selected={levelFilter === lvl}
                    onClick={() => {
                      setLevelFilter(lvl);
                      const firstCard = classCards.find((c) => c.educationLevel === lvl);
                      if (firstCard) handleSelectCard(firstCard);
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      levelFilter === lvl
                        ? 'gold-btn'
                        : 'text-[#B8C0CE] hover:text-[#F5EFE2]'
                    }`}
                  >
                    {meta.nameBn} ({meta.rangeLabelBn})
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Step 1: Class Cards Organized by 3 Education Levels (Class 9-10 & 11-12 as single cards) */}
        <section aria-label="শ্রেণি নির্বাচন" className="space-y-6">
          {groupedClasses.map((section) => {
            const gridCols =
              section.cards.length === 1
                ? 'grid-cols-1 max-w-sm'
                : section.cards.length <= 4
                ? 'grid-cols-2 sm:grid-cols-4'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5';

            return (
              <div key={section.level} className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#D4A853]/15 pb-2">
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="h-4 w-4 text-[#D4A853] shrink-0" />
                    <h2 className="font-display text-lg font-bold text-[#F5EFE2]">
                      {section.meta.nameBn}
                    </h2>
                    <span className="text-xs text-[#9DA6B5]">
                      {section.meta.name} · {section.meta.rangeLabelBn}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#D4A853] tabular-nums">
                    {toBanglaDigits(section.cards.length)}টি কার্ড
                  </span>
                </div>

                <div className={`grid gap-3 ${gridCols}`}>
                  {section.cards.map((card) => {
                    const isSelected = selectedCard?.id === card.id;
                    const clsSubjectCount = activeSubjects.filter(
                      (s) => s.classId === card.primaryClass.id
                    ).length;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => handleSelectCard(card)}
                        aria-pressed={isSelected}
                        className={`group rounded-xl border p-4 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'border-[#EAC779] bg-[#141923] shadow-[0_10px_28px_rgba(212,168,83,0.14)]'
                            : 'border-[#D4A853]/22 bg-[#0C1017] hover:border-[#D4A853]/55 hover:bg-[#111621]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-[#D4A853] tabular-nums">
                            {card.name}
                          </span>
                          <ChevronRight
                            className={`h-4 w-4 shrink-0 transition-transform ${
                              isSelected
                                ? 'text-[#EAC779] translate-x-0.5'
                                : 'text-[#6E7787] group-hover:text-[#D4A853]'
                            }`}
                          />
                        </div>

                        <div>
                          <p
                            className={`text-base font-bold leading-snug ${
                              isSelected ? 'text-[#EAC779]' : 'text-[#F5EFE2]'
                            }`}
                          >
                            {card.nameBn}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-[#9DA6B5] tabular-nums">
                            <span>{section.meta.nameBn}</span>
                            <span aria-hidden="true">·</span>
                            <span>{toBanglaDigits(clsSubjectCount)} বিষয়</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {/* Step 2: Active Class Workspace (Group Selection ONLY for Class 9–12 + Subject List) */}
        {selectedCard && selectedClass && (
          <section
            aria-label="নির্বাচিত শ্রেণির বিষয় তালিকা"
            className="obsidian-card rounded-xl p-5 sm:p-6 space-y-6"
          >
            {/* Active Class Header */}
            <div className="flex flex-col gap-3 border-b border-[#D4A853]/18 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#D4A853]">
                  <span>{selectedLevelMeta.nameBn}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedCard.name}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {selectedCard.hasGroups
                      ? 'বিভাগভিত্তিক পাঠ্যক্রম (বিজ্ঞান / মানবিক / ব্যবসায় শিক্ষা)'
                      : 'সাধারণ পাঠ্যক্রম (সকল শিক্ষার্থীর জন্য অভিন্ন)'}
                  </span>
                </div>
                <h2 className="mt-1 font-display text-2xl font-bold text-[#F5EFE2]">
                  {selectedCard.nameBn} — বিষয় তালিকা
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Link
                  to={
                    user
                      ? `/dashboard/questions?classId=${selectedClass.id}`
                      : `/exams`
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg gold-outline-btn px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  <Compass className="h-3.5 w-3.5 text-[#D4A853]" />
                  <span>{user ? 'এই শ্রেণির প্রশ্নব্যাংক' : 'লাইভ পরীক্ষা দেখুন'}</span>
                </Link>
              </div>
            </div>

            {/* Group Selection: Rendered ONLY for Class 9–12 */}
            {selectedClass.hasGroups && classGroups.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#EAC779] flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    <span>বিভাগ নির্বাচন করুন (শ্রেণি ৯–১২)</span>
                  </h3>
                  <span className="text-xs text-[#9DA6B5]">
                    নির্বাচিত বিভাগের সাধারণ আবশ্যিক, বিভাগভিত্তিক, ঐচ্ছিক ও চতুর্থ বিষয় একত্রে দেখানো হয়েছে
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {classGroups.map((grp) => {
                    const isGrpSelected = grp.id === effectiveGroupId;
                    const grpCount = getSubjectsForClassAndGroup(
                      activeSubjects,
                      selectedClass,
                      grp.id,
                      false
                    ).length;

                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => setSelectedGroupId(grp.id)}
                        aria-pressed={isGrpSelected}
                        className={`rounded-xl border p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isGrpSelected
                            ? 'border-[#EAC779] bg-[#161B26] text-[#F5EFE2]'
                            : 'border-[#D4A853]/22 bg-[#090C11] text-[#B8C0CE] hover:border-[#D4A853]/50 hover:text-[#F5EFE2]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg border shrink-0 ${
                              isGrpSelected
                                ? 'border-[#EAC779]/60 bg-[#D4A853]/15 text-[#EAC779]'
                                : 'border-[#D4A853]/25 bg-[#11151E] text-[#D4A853]'
                            }`}
                          >
                            {getGroupIcon(grp.code, grp.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-bold truncate">{grp.nameBn}</p>
                            <p className="text-xs text-[#9DA6B5] truncate">{grp.name}</p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-semibold text-[#EAC779] tabular-nums shrink-0">
                          {toBanglaDigits(grpCount)} বিষয়
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dynamic Search & Category Filter Controls */}
            <div className="flex flex-col gap-3 rounded-xl border border-[#D4A853]/18 bg-[#090C11] p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9DA6B5]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="বিষয়ের নাম বা কোড দিয়ে খুঁজুন (যেমন: Physics, 136, গণিত)..."
                  aria-label="বিষয়ের নাম বা কোড দিয়ে অনুসন্ধান"
                  className="w-full rounded-lg border border-[#D4A853]/28 bg-[#0E1219] py-2 pl-9 pr-3 text-sm text-[#F5EFE2] placeholder-[#7C8594] focus:border-[#EAC779] focus:outline-none"
                />
              </div>

              <div
                role="group"
                aria-label="বিষয়ের ধরন অনুযায়ী ফিল্টার"
                className="flex flex-wrap items-center gap-1.5"
              >
                {(
                  [
                    { key: 'all', label: 'সকল' },
                    { key: 'compulsory', label: 'আবশ্যিক' },
                    { key: 'group', label: 'বিভাগভিত্তিক' },
                    { key: 'optional', label: 'ঐচ্ছিক' },
                    { key: 'fourth', label: 'চতুর্থ বিষয়' },
                  ] as const
                ).map((item) => {
                  const active = categoryFilter === item.key;
                  const count = categoryCounts[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setCategoryFilter(item.key)}
                      aria-pressed={active}
                      className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                        active
                          ? 'gold-btn border-transparent'
                          : 'border-[#D4A853]/25 bg-[#0E1219] text-[#B8C0CE] hover:border-[#EAC779] hover:text-[#F5EFE2]'
                      }`}
                    >
                      {item.label} ({toBanglaDigits(count)})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject List */}
            {filteredSubjects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D4A853]/25 bg-[#090C11] p-10 text-center space-y-3">
                <p className="text-base font-semibold text-[#F5EFE2]">
                  নির্বাচিত ফিল্টারে কোনো বিষয় পাওয়া যায়নি
                </p>
                <p className="text-sm text-[#9DA6B5]">
                  অনুসন্ধান শব্দ বা ক্যাটাগরি ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('all');
                    setSearchQuery('');
                  }}
                  className="inline-flex items-center rounded-lg gold-outline-btn px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  ফিল্টার রিসেট করুন
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {filteredSubjects.map((sub, idx) => {
                  const cat: SubjectCategory = sub.category || 'compulsory';
                  const catMeta = SUBJECT_CATEGORY_LABELS[cat];
                  return (
                    <div
                      key={sub.id}
                      className="rounded-xl border border-[#D4A853]/20 bg-[#0A0E14] p-4 flex flex-col justify-between gap-3 hover:border-[#D4A853]/45 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 text-xs text-[#9DA6B5] font-mono tabular-nums">
                            <span>{toBanglaDigits(String(idx + 1).padStart(2, '0'))}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#D4A853] font-semibold">কোড: {sub.code}</span>
                          </div>
                          <h4 className="text-base font-bold text-[#F5EFE2] leading-snug">
                            {sub.nameBn}
                          </h4>
                          <p className="text-xs text-[#9DA6B5]">{sub.name}</p>
                        </div>

                        <span
                          className={`rounded border px-2 py-0.5 text-xs font-semibold whitespace-nowrap shrink-0 ${CATEGORY_STYLES[cat]}`}
                        >
                          {catMeta.nameBn}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#D4A853]/12 pt-2.5 text-xs text-[#9DA6B5]">
                        <span>
                          {selectedCard.nameBn} · {getGroupDisplayLabel(sub)}
                        </span>
                        <span className="text-[#B8C0CE]">{catMeta.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
