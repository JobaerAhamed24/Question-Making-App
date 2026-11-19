import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Layers,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { Button, Card, FormField, Input, Select, Textarea } from '../../components/ui/Primitives';
import {
  QuestionSelectionWorkspace,
  type WorkspaceExamMeta,
} from '../../components/workspace/QuestionSelectionWorkspace';
import { useToast } from '../../contexts/ToastContext';
import { getSubjectsForClassAndGroup } from '../../data/curriculumData';
import { toBanglaDigits } from '../../lib/bn';
import { platformService } from '../../services/platformService';
import { questionBankService } from '../../services/questionBankService';
import type { WorkspaceFilterState } from '../../types/domain';

export function AcademicBuilderPage() {
  const { pushToast } = useToast();
  const catalogue = questionBankService.getAcademicCatalogue();

  // Step 1: Examination Information (NO Examination Date field!)
  const [title, setTitle] = useState('অর্ধবার্ষিক মডেল টেস্ট প্রশ্নপত্র');
  const [examName, setExamName] = useState('অর্ধবার্ষিক পরীক্ষা');
  const [classId, setClassId] = useState('cls-8');
  const [groupId, setGroupId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [schoolName, setSchoolName] = useState('আদর্শ একাডেমিক স্কুল অ্যান্ড কলেজ');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [schoolLogoDataUrl, setSchoolLogoDataUrl] = useState<string | undefined>(undefined);
  const [instructions, setInstructions] = useState(
    'সকল প্রশ্নের উত্তর দাও। প্রতিটি প্রশ্নের মান ডানপাশে উল্লেখ করা হয়েছে।'
  );

  // Step 2: Cascading Chapter -> Topic Selection
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [expandedChapterIds, setExpandedChapterIds] = useState<string[]>([]);
  const [chapterSearch, setChapterSearch] = useState('');

  // Workflow Stage: 'setup' -> 'workspace'
  const [stage, setStage] = useState<'setup' | 'workspace'>('setup');

  const selectedClass = useMemo(
    () => catalogue.classes.find((c) => c.id === classId) || catalogue.classes[0],
    [catalogue.classes, classId]
  );

  const classGroups = useMemo(
    () => (selectedClass?.hasGroups ? catalogue.groups.filter((g) => g.classId === selectedClass.id) : []),
    [catalogue.groups, selectedClass]
  );

  const effectiveGroupId = selectedClass?.hasGroups
    ? groupId && classGroups.some((g) => g.id === groupId)
      ? groupId
      : classGroups[0]?.id || ''
    : '';

  // Combined compulsory + group subjects without duplicates for Class 9–12; NCTB subjects without groups for Class 1–8
  const availableSubjects = useMemo(() => {
    if (!selectedClass) return [];
    const list = getSubjectsForClassAndGroup(
      catalogue.subjects,
      selectedClass,
      selectedClass.hasGroups ? effectiveGroupId : null
    );
    const unique = new Map<string, (typeof list)[number]>();
    list.forEach((s) => {
      const key = s.nameBn.trim();
      if (!unique.has(key)) unique.set(key, s);
    });
    return Array.from(unique.values());
  }, [catalogue.subjects, selectedClass, effectiveGroupId]);

  const effectiveSubject = useMemo(() => {
    const found = availableSubjects.find((s) => s.id === subjectId);
    return found || availableSubjects[0] || null;
  }, [availableSubjects, subjectId]);

  const subjectChapters = useMemo(() => {
    if (!effectiveSubject) return [];
    return platformService.getMergedChaptersForSubject(effectiveSubject);
  }, [effectiveSubject]);

  const allTopicsForSubject = useMemo(
    () => platformService.getMergedTopicsForChapters(subjectChapters.map((c) => c.id)),
    [subjectChapters]
  );

  const filteredChapters = useMemo(() => {
    const q = chapterSearch.trim().toLowerCase();
    if (!q) return subjectChapters;
    return subjectChapters.filter((ch) => {
      const topics = allTopicsForSubject.filter((t) => t.chapterId === ch.id);
      return (
        ch.nameBn.toLowerCase().includes(q) ||
        ch.name.toLowerCase().includes(q) ||
        topics.some((t) => t.nameBn.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
      );
    });
  }, [subjectChapters, allTopicsForSubject, chapterSearch]);

  const handleClassChange = (newClassId: string) => {
    setClassId(newClassId);
    setGroupId('');
    setSubjectId('');
    setSelectedChapterIds([]);
    setSelectedTopicIds([]);
    setExpandedChapterIds([]);
  };

  const handleSubjectChange = (newSubId: string) => {
    setSubjectId(newSubId);
    setSelectedChapterIds([]);
    setSelectedTopicIds([]);
    setExpandedChapterIds([]);
  };

  const toggleChapter = (chId: string) => {
    const exists = selectedChapterIds.includes(chId);
    if (exists) {
      setSelectedChapterIds((prev) => prev.filter((id) => id !== chId));
      const chTopics = allTopicsForSubject.filter((t) => t.chapterId === chId).map((t) => t.id);
      setSelectedTopicIds((prev) => prev.filter((id) => !chTopics.includes(id)));
    } else {
      setSelectedChapterIds((prev) => [...prev, chId]);
      if (!expandedChapterIds.includes(chId)) {
        setExpandedChapterIds((prev) => [...prev, chId]);
      }
    }
  };

  const toggleExpandChapter = (chId: string) => {
    setExpandedChapterIds((prev) =>
      prev.includes(chId) ? prev.filter((id) => id !== chId) : [...prev, chId]
    );
  };

  const toggleTopic = (chId: string, topicId: string) => {
    if (!selectedChapterIds.includes(chId)) {
      setSelectedChapterIds((prev) => [...prev, chId]);
    }
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const selectAllTopicsInChapter = (chId: string) => {
    const chTopics = allTopicsForSubject.filter((t) => t.chapterId === chId).map((t) => t.id);
    if (!selectedChapterIds.includes(chId)) {
      setSelectedChapterIds((prev) => [...prev, chId]);
    }
    setSelectedTopicIds((prev) => Array.from(new Set([...prev, ...chTopics])));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024 * 2) {
      pushToast({ title: 'লোগো ফাইল ২ এমবি এর কম হতে হবে', variant: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSchoolLogoDataUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleSubmitAndLoadQuestions = () => {
    if (!title.trim() || !examName.trim() || !selectedClass || !effectiveSubject) {
      pushToast({
        title: 'প্রয়োজনীয় তথ্য পূরণ করুন',
        description: 'শিরোনাম, পরীক্ষার নাম, শ্রেণি এবং বিষয় নির্বাচন করুন।',
        variant: 'error',
      });
      return;
    }
    setStage('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const workspaceMeta: WorkspaceExamMeta = {
    domain: 'academic',
    title: title.trim(),
    examName: examName.trim(),
    schoolName: schoolName.trim(),
    schoolLogoDataUrl,
    durationMinutes: Number(durationMinutes) || 60,
    instructions: instructions.trim(),
    classId: selectedClass?.id || classId,
    classLabel: selectedClass?.nameBn || '',
    subjectId: effectiveSubject?.id || '',
    subjectLabel: effectiveSubject?.nameBn || '',
  };

  const workspaceInitialFilters: WorkspaceFilterState = useMemo(
    () => ({
      domain: 'academic',
      sources: [],
      classId: selectedClass?.id,
      groupId: effectiveGroupId || undefined,
      subjectId: effectiveSubject?.id,
      chapterIds: selectedChapterIds,
      topicIds: selectedTopicIds,
      institutionIds: [],
      admissionTopicIds: [],
      difficulties: [],
      questionTypes: [],
      boards: [],
      years: [],
      answerFilter: 'all',
      usageFilter: 'all',
      sortBy: 'default',
      search: '',
    }),
    [selectedClass?.id, effectiveGroupId, effectiveSubject?.id, selectedChapterIds, selectedTopicIds]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6 font-bangla">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-[#D4A853]/20 pb-5">
        <div>
          <p className="text-xs font-mono font-bold tracking-[0.2em] text-[#D4A853] uppercase">
            ACADEMIC QUESTION PAPER BUILDER • CLASS 1–12
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold gold-text-gradient">
            একাডেমিক প্রশ্নপত্র তৈরি (শ্রেণি ১–১২)
          </h1>
          <p className="mt-1 text-sm text-[#B8C0CE]">
            NCTB পাঠ্যক্রম অনুযায়ী শ্রেণি, বিভাগ, বিষয়, একাধিক অধ্যায় ও টপিক নির্বাচন করে বোর্ড স্ট্যান্ডার্ড প্রশ্নপত্র তৈরি করুন।
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setStage('setup')}
            className={`rounded-lg border px-3 py-1.5 cursor-pointer ${
              stage === 'setup'
                ? 'border-[#EAC779] bg-[#D4A853]/20 text-[#EAC779]'
                : 'border-[#D4A853]/25 text-[#9DA6B5]'
            }`}
          >
            ধাপ ১–২: তথ্য ও অধ্যায়
          </button>
          <ArrowRight className="h-3.5 w-3.5 text-[#8C95A4]" />
          <span
            className={`rounded-lg border px-3 py-1.5 ${
              stage === 'workspace'
                ? 'border-[#EAC779] bg-[#D4A853]/20 text-[#EAC779]'
                : 'border-[#D4A853]/20 text-[#8C95A4]'
            }`}
          >
            ধাপ ৩: প্রশ্ন নির্বাচন ওয়ার্কস্পেস
          </span>
        </div>
      </div>

      {stage === 'workspace' ? (
        <QuestionSelectionWorkspace
          meta={workspaceMeta}
          initialFilters={workspaceInitialFilters}
          onBackToSetup={() => setStage('setup')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* STEP 1: Examination Information Form (Strictly NO Examination Date field) */}
          <Card className="lg:col-span-6 p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-[#D4A853]/20 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4A853]/40 bg-[#141822] text-[#EAC779] text-xs font-bold">
                ০১
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#F5EFE2]">পরীক্ষার তথ্য</h2>
                <p className="text-xs text-[#9DA6B5]">প্রতিষ্ঠান, শ্রেণি, বিষয় ও পরীক্ষার সাধারণ তথ্য</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="প্রশ্নপত্রের শিরোনাম (Exam Title)" required>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: অর্ধবার্ষিক মডেল টেস্ট প্রশ্নপত্র"
                />
              </FormField>
              <FormField label="পরীক্ষার নাম (Exam Name)" required>
                <Input
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="যেমন: প্রথম সাময়িক / প্রাক-নির্বাচনী পরীক্ষা"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="শ্রেণি নির্বাচন (শ্রেণি ১–১২)" required>
                <Select value={classId} onChange={(e) => handleClassChange(e.target.value)}>
                  {catalogue.classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.nameBn}
                    </option>
                  ))}
                </Select>
              </FormField>

              {selectedClass?.hasGroups ? (
                <FormField label="বিভাগ নির্বাচন (৯ম–১২শ)" required>
                  <Select
                    value={effectiveGroupId}
                    onChange={(e) => {
                      setGroupId(e.target.value);
                      setSubjectId('');
                      setSelectedChapterIds([]);
                      setSelectedTopicIds([]);
                    }}
                  >
                    {classGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nameBn}
                      </option>
                    ))}
                  </Select>
                </FormField>
              ) : (
                <FormField label="সময় (মিনিট)" required>
                  <Input
                    type="number"
                    min={10}
                    max={300}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value) || 60)}
                  />
                </FormField>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="বিষয় নির্বাচন (NCTB পাঠ্যক্রম)" required>
                <Select
                  value={effectiveSubject?.id || ''}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                >
                  {availableSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.nameBn}
                      {sub.category === 'compulsory' ? ' (আবশ্যিক)' : sub.category === 'group' ? ' (বিভাগীয়)' : ''}
                    </option>
                  ))}
                </Select>
              </FormField>

              {selectedClass?.hasGroups && (
                <FormField label="সময় (মিনিট)" required>
                  <Input
                    type="number"
                    min={10}
                    max={300}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value) || 60)}
                  />
                </FormField>
              )}
            </div>

            <FormField label="প্রতিষ্ঠানের নাম (Institution Name)" required>
              <Input
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="আপনার বিদ্যালয়, কলেজ বা কোচিংয়ের নাম"
              />
            </FormField>

            <FormField label="প্রতিষ্ঠানের লোগো (ঐচ্ছিক)">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 rounded-lg border border-[#D4A853]/35 bg-[#0A0D12] px-3.5 py-2 text-xs font-semibold text-[#EAC779] hover:border-[#EAC779] cursor-pointer">
                  <Upload className="h-4 w-4" />
                  <span>লোগো আপলোড করুন</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {schoolLogoDataUrl && (
                  <div className="flex items-center gap-2">
                    <img
                      src={schoolLogoDataUrl}
                      alt="প্রতিষ্ঠানের লোগো"
                      className="h-9 w-9 rounded object-contain border border-[#D4A853]/30 bg-white p-0.5"
                    />
                    <button
                      type="button"
                      onClick={() => setSchoolLogoDataUrl(undefined)}
                      className="text-xs text-rose-400 hover:underline cursor-pointer"
                    >
                      সরান
                    </button>
                  </div>
                )}
              </div>
            </FormField>

            <FormField label="পরীক্ষার নির্দেশনা (Examination Instructions)">
              <Textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="পরীক্ষার্থীদের জন্য সাধারণ নির্দেশনাবলি..."
              />
            </FormField>
          </Card>

          {/* STEP 2: Cascading Subject -> Chapter -> Topic Selection */}
          <Card className="lg:col-span-6 p-6 space-y-5">
            <div className="flex items-center justify-between gap-2 border-b border-[#D4A853]/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4A853]/40 bg-[#141822] text-[#EAC779] text-xs font-bold">
                  ০২
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#F5EFE2]">অধ্যায় ও টপিক নির্বাচন</h2>
                  <p className="text-xs text-[#9DA6B5]">
                    {selectedClass?.nameBn} → {effectiveSubject?.nameBn || 'বিষয় নির্বাচন করুন'}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs tabular-nums">
                <p className="font-bold text-[#EAC779]">
                  {toBanglaDigits(selectedChapterIds.length)}টি অধ্যায়
                </p>
                <p className="text-[#9DA6B5]">{toBanglaDigits(selectedTopicIds.length)}টি টপিক</p>
              </div>
            </div>

            {/* Search Chapters / Topics */}
            <div className="relative">
              <Search className="h-4 w-4 text-[#8C95A4] absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                placeholder="অধ্যায় বা টপিক খুঁজুন..."
                className="pl-9"
              />
            </div>

            {/* Selected Chapters / Topics removable tags */}
            {(selectedChapterIds.length > 0 || selectedTopicIds.length > 0) && (
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-2.5">
                {selectedChapterIds.map((chId) => {
                  const ch = subjectChapters.find((c) => c.id === chId);
                  if (!ch) return null;
                  return (
                    <button
                      key={chId}
                      type="button"
                      onClick={() => toggleChapter(chId)}
                      className="inline-flex items-center gap-1 rounded-md bg-[#D4A853]/15 border border-[#D4A853]/40 px-2 py-0.5 text-xs text-[#EAC779] cursor-pointer"
                    >
                      <BookOpen className="h-3 w-3" />
                      <span>{ch.nameBn}</span>
                      <X className="h-3 w-3" />
                    </button>
                  );
                })}
                {selectedTopicIds.map((tId) => {
                  const tp = allTopicsForSubject.find((t) => t.id === tId);
                  if (!tp) return null;
                  return (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => toggleTopic(tp.chapterId, tId)}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-950/50 border border-emerald-500/35 px-2 py-0.5 text-xs text-emerald-300 cursor-pointer"
                    >
                      <span>{tp.nameBn}</span>
                      <X className="h-3 w-3" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Expandable Chapter Accordion List */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {filteredChapters.map((ch) => {
                const isSelected = selectedChapterIds.includes(ch.id);
                const isExpanded = expandedChapterIds.includes(ch.id);
                const chTopics = allTopicsForSubject.filter((t) => t.chapterId === ch.id);
                const selectedInChapterCount = chTopics.filter((t) =>
                  selectedTopicIds.includes(t.id)
                ).length;

                return (
                  <div
                    key={ch.id}
                    className={`rounded-xl border transition-colors ${
                      isSelected
                        ? 'border-[#EAC779]/55 bg-[#D4A853]/[0.06]'
                        : 'border-[#D4A853]/20 bg-[#0A0D12]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 p-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleChapter(ch.id)}
                          className="h-4 w-4 accent-[#D4A853] cursor-pointer shrink-0"
                        />
                        <button
                          type="button"
                          onClick={() => toggleExpandChapter(ch.id)}
                          className="text-left min-w-0 cursor-pointer"
                        >
                          <p className="text-sm font-semibold text-[#F5EFE2] truncate">
                            অধ্যায় {toBanglaDigits(ch.chapterNumber)}: {ch.nameBn}
                          </p>
                          <p className="text-[11px] text-[#8C95A4] flex items-center gap-2">
                            <span>{toBanglaDigits(chTopics.length)}টি টপিক</span>
                            {selectedInChapterCount > 0 && (
                              <span className="text-emerald-400">
                                · {toBanglaDigits(selectedInChapterCount)}টি নির্বাচিত
                              </span>
                            )}
                            {ch.pendingVerification && (
                              <span className="text-amber-400">· যাচাইকরণ অপেক্ষমাণ</span>
                            )}
                          </p>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {chTopics.length > 0 && (
                          <button
                            type="button"
                            onClick={() => selectAllTopicsInChapter(ch.id)}
                            className="inline-flex items-center gap-1 rounded border border-[#D4A853]/30 px-2 py-1 text-[11px] font-medium text-[#EAC779] hover:bg-[#D4A853]/15 cursor-pointer"
                          >
                            <CheckSquare className="h-3 w-3" />
                            সব টপিক
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleExpandChapter(ch.id)}
                          aria-label="টপিক দেখান"
                          className="rounded p-1 text-[#9DA6B5] hover:text-[#EAC779] cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded && chTopics.length > 0 && (
                      <div className="border-t border-[#D4A853]/15 px-4 py-2.5 space-y-1.5 bg-[#080A0F]/60 rounded-b-xl">
                        {chTopics.map((topic) => (
                          <label
                            key={topic.id}
                            className="flex items-center gap-2.5 text-xs text-[#C2C8D3] hover:text-[#F5EFE2] cursor-pointer py-0.5"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTopicIds.includes(topic.id)}
                              onChange={() => toggleTopic(ch.id, topic.id)}
                              className="accent-[#D4A853]"
                            />
                            <span>{topic.nameBn}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Prominent Submit Action Button */}
            <div className="border-t border-[#D4A853]/20 pt-4 space-y-2.5">
              <Button
                size="lg"
                onClick={handleSubmitAndLoadQuestions}
                className="w-full justify-center text-base py-3"
              >
                <Layers className="h-5 w-5" />
                <span>সাবমিট করুন ও প্রশ্ন নির্বাচন ওয়ার্কস্পেস খুলুন</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
              <p className="text-xs text-[#8C95A4] text-center">
                সাবমিট করলে নির্বাচিত অধ্যায় ও টপিক অনুযায়ী প্রশ্নব্যাংক থেকে প্রশ্ন লোড হবে—যা পরের ধাপে বোর্ড, সাল ও কঠিনতা অনুযায়ী বাছাই করতে পারবেন।
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
