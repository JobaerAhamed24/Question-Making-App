import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  Check,
  Eye,
  Filter,
  GripVertical,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shuffle,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { Button, Card, Input, Modal, Select } from '../ui/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ALL_EDUCATION_BOARDS, AVAILABLE_EXAM_YEARS } from '../../data/platformSeedData';
import {
  EDUCATION_BOARD_LABELS_BN,
  QUESTION_TYPE_LABELS_BN,
  getDifficultyLabelBn,
  toBanglaDigits,
} from '../../lib/bn';
import {
  createDefaultOmrConfig,
  getAdmissionCategoryLabelBn,
  platformService,
} from '../../services/platformService';
import { questionBankService } from '../../services/questionBankService';
import type {
  AdmissionCategoryCode,
  EducationBoard,
  Question,
  QuestionDifficulty,
  QuestionDomain,
  QuestionPaperItem,
  QuestionSourceFilter,
  QuestionTypeCode,
  SavedFilterPreset,
  WorkspaceFilterState,
} from '../../types/domain';

export interface WorkspaceExamMeta {
  domain: QuestionDomain;
  title: string;
  examName: string;
  schoolName: string;
  schoolLogoDataUrl?: string;
  durationMinutes: number;
  instructions: string;
  classId: string;
  classLabel: string;
  subjectId: string;
  subjectLabel: string;
  admissionCategory?: AdmissionCategoryCode;
}

interface QuestionSelectionWorkspaceProps {
  meta: WorkspaceExamMeta;
  initialFilters: WorkspaceFilterState;
  onBackToSetup?: () => void;
}

const QUESTION_TYPES_ORDERED: QuestionTypeCode[] = [
  'mcq',
  'short',
  'cq',
  'broad',
  'fill_blank',
  'true_false',
  'matching',
  'math',
];

const SOURCE_OPTIONS_ACADEMIC: Array<{ code: QuestionSourceFilter; label: string }> = [
  { code: 'platform', label: 'প্ল্যাটফর্ম প্রশ্নব্যাংক' },
  { code: 'saved', label: 'আমার সংরক্ষিত প্রশ্ন' },
  { code: 'previously_used', label: 'পূর্বে ব্যবহৃত প্রশ্ন' },
  { code: 'admin_approved', label: 'অ্যাডমিন অনুমোদিত প্রশ্ন' },
];

const SOURCE_OPTIONS_ADMISSION: Array<{ code: QuestionSourceFilter; label: string }> = [
  { code: 'platform', label: 'প্ল্যাটফর্ম প্রশ্নব্যাংক' },
  { code: 'previous_admission', label: 'বিগত বছরের ভর্তি প্রশ্ন' },
  { code: 'saved', label: 'আমার সংরক্ষিত প্রশ্ন' },
  { code: 'previously_used', label: 'পূর্বে ব্যবহৃত প্রশ্ন' },
  { code: 'admin_approved', label: 'অ্যাডমিন অনুমোদিত' },
];

export function QuestionSelectionWorkspace({
  meta,
  initialFilters,
  onBackToSetup,
}: QuestionSelectionWorkspaceProps) {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<WorkspaceFilterState>(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<QuestionPaperItem[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [randomCount, setRandomCount] = useState(5);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState<SavedFilterPreset[]>([]);
  const [savedPaperId, setSavedPaperId] = useState<string | undefined>(undefined);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const userIdKey = user?.id || 'guest';

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    setSavedPresets(platformService.listSavedFilters(userIdKey, meta.domain));
  }, [userIdKey, meta.domain]);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [filters]);

  const academicCat = questionBankService.getAcademicCatalogue();
  const admissionCat = platformService.getAdmissionCatalogue();

  const availableQuestions = useMemo(() => {
    try {
      return platformService.queryWorkspaceQuestions(user, filters);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'প্রশ্ন লোড করতে সমস্যা হয়েছে।');
      return [];
    }
  }, [user, filters]);

  const selectedQuestionIds = useMemo(
    () => new Set(selectedItems.map((i) => i.sourceQuestionId)),
    [selectedItems]
  );

  const totalSelectedMarks = useMemo(
    () => selectedItems.reduce((sum, i) => sum + (Number(i.customMarks) || 0), 0),
    [selectedItems]
  );

  // Academic helper options for filter refinement
  const academicSubjects = useMemo(
    () => academicCat.subjects.filter((s) => !filters.classId || s.classId === filters.classId),
    [academicCat.subjects, filters.classId]
  );
  const selectedSubjectObj = useMemo(
    () => academicCat.subjects.find((s) => s.id === filters.subjectId),
    [academicCat.subjects, filters.subjectId]
  );
  const academicChapters = useMemo(
    () => (selectedSubjectObj ? platformService.getMergedChaptersForSubject(selectedSubjectObj) : []),
    [selectedSubjectObj]
  );
  const academicTopics = useMemo(
    () => platformService.getMergedTopicsForChapters(filters.chapterIds),
    [filters.chapterIds]
  );

  // Admission helper options
  const admissionInstitutions = useMemo(
    () =>
      admissionCat.institutions.filter(
        (i) => !filters.admissionCategory || i.categoryId === filters.admissionCategory
      ),
    [admissionCat.institutions, filters.admissionCategory]
  );
  const admissionSubjects = useMemo(
    () =>
      admissionCat.subjects.filter(
        (s) => !filters.admissionCategory || s.categoryId === filters.admissionCategory
      ),
    [admissionCat.subjects, filters.admissionCategory]
  );
  const admissionTopics = useMemo(
    () =>
      admissionCat.topics.filter(
        (t) => !filters.admissionSubjectId || t.admissionSubjectId === filters.admissionSubjectId
      ),
    [admissionCat.topics, filters.admissionSubjectId]
  );

  const toggleInArray = <T,>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const handleToggleQuestion = (q: Question) => {
    if (selectedQuestionIds.has(q.id)) {
      setSelectedItems((prev) =>
        prev
          .filter((item) => item.sourceQuestionId !== q.id)
          .map((item, idx) => ({ ...item, orderIndex: idx }))
      );
    } else {
      setSelectedItems((prev) => [
        ...prev,
        platformService.buildPaperItemFromQuestion(q, prev.length),
      ]);
    }
  };

  const handleSelectAllVisible = () => {
    const toAdd = availableQuestions.filter((q) => !selectedQuestionIds.has(q.id));
    if (toAdd.length === 0) return;
    setSelectedItems((prev) => {
      const next = [...prev];
      toAdd.forEach((q) => {
        next.push(platformService.buildPaperItemFromQuestion(q, next.length));
      });
      return next;
    });
    pushToast({
      title: `${toBanglaDigits(toAdd.length)}টি প্রশ্ন যুক্ত হয়েছে`,
      variant: 'success',
    });
  };

  const handleRandomPick = () => {
    const pool = availableQuestions.filter((q) => !selectedQuestionIds.has(q.id));
    if (pool.length === 0) {
      pushToast({ title: 'যোগ করার মতো অবশিষ্ট প্রশ্ন নেই', variant: 'info' });
      return;
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.max(1, randomCount));
    setSelectedItems((prev) => {
      const next = [...prev];
      shuffled.forEach((q) => next.push(platformService.buildPaperItemFromQuestion(q, next.length)));
      return next;
    });
    pushToast({
      title: `র‍্যান্ডমভাবে ${toBanglaDigits(shuffled.length)}টি প্রশ্ন নির্বাচন করা হয়েছে`,
      variant: 'success',
    });
  };

  const moveSelected = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= selectedItems.length) return;
    setSelectedItems((prev) => {
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy.map((item, i) => ({ ...item, orderIndex: i }));
    });
  };

  const handleDropReorder = (dropIndex: number) => {
    if (dragIdx === null || dragIdx === dropIndex) return;
    setSelectedItems((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(dragIdx, 1);
      copy.splice(dropIndex, 0, moved);
      return copy.map((item, i) => ({ ...item, orderIndex: i }));
    });
    setDragIdx(null);
  };

  const handleClearAllFilters = () => {
    setFilters({
      domain: meta.domain,
      sources: [],
      classId: meta.domain === 'academic' ? meta.classId : undefined,
      subjectId: meta.domain === 'academic' ? meta.subjectId : undefined,
      chapterIds: [],
      topicIds: [],
      admissionCategory: meta.admissionCategory,
      institutionIds: [],
      admissionSubjectId: undefined,
      admissionTopicIds: [],
      difficulties: [],
      questionTypes: [],
      boards: [],
      years: [],
      yearFrom: undefined,
      yearTo: undefined,
      answerFilter: 'all',
      usageFilter: 'all',
      sortBy: 'default',
      search: '',
    });
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      pushToast({ title: 'ফিল্টার প্রিসেটের একটি নাম দিন', variant: 'error' });
      return;
    }
    const created = platformService.saveFilterPreset(userIdKey, presetName, filters);
    setSavedPresets((prev) => [created, ...prev]);
    setPresetName('');
    pushToast({ title: 'ফিল্টার প্রিসেট সংরক্ষিত হয়েছে', variant: 'success' });
  };

  const persistPaper = (openEditor: boolean) => {
    if (selectedItems.length === 0) {
      pushToast({
        title: 'অন্তত ১টি প্রশ্ন নির্বাচন করুন',
        description: 'প্রশ্নপত্র সংরক্ষণ বা প্রিভিউ করতে ডান প্যানেল থেকে প্রশ্ন যুক্ত করুন।',
        variant: 'error',
      });
      return;
    }
    const saved = platformService.saveWorkspacePaper({
      id: savedPaperId,
      userId: userIdKey,
      domain: meta.domain,
      admissionCategory: meta.admissionCategory,
      classLabel: meta.classLabel,
      subjectLabel: meta.subjectLabel,
      title: meta.title || 'কাস্টম প্রশ্নপত্র',
      examName: meta.examName || 'মডেল টেস্ট',
      classId: meta.classId,
      subjectId: meta.subjectId,
      schoolName: meta.schoolName || 'শিক্ষা প্রতিষ্ঠান',
      schoolLogoDataUrl: meta.schoolLogoDataUrl,
      durationMinutes: meta.durationMinutes || 60,
      instructions: meta.instructions || 'সকল প্রশ্নের উত্তর দাও।',
      includeStudentFields: true,
      includeHeaderFooter: true,
      includePageNumbers: true,
      omrConfig: createDefaultOmrConfig(
        selectedItems.filter((i) => i.snapshot.questionTypeCode === 'mcq').length || selectedItems.length
      ),
      items: selectedItems,
    });
    setSavedPaperId(saved.id);
    if (openEditor) {
      pushToast({ title: 'প্রশ্নপত্র এডিটর খোলা হচ্ছে', variant: 'success' });
      navigate(`/paper-editor/${saved.id}`);
    } else {
      pushToast({
        title: 'প্রশ্নপত্র খসড়া সংরক্ষিত হয়েছে',
        description: `${toBanglaDigits(selectedItems.length)}টি প্রশ্ন (${toBanglaDigits(totalSelectedMarks)} নম্বর) সংরক্ষিত।`,
        variant: 'success',
      });
    }
  };

  // Active filter chips for quick removal
  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    filters.sources.forEach((src) => {
      const label =
        [...SOURCE_OPTIONS_ACADEMIC, ...SOURCE_OPTIONS_ADMISSION].find((s) => s.code === src)?.label || src;
      chips.push({
        key: `src-${src}`,
        label: `উৎস: ${label}`,
        onRemove: () => setFilters((f) => ({ ...f, sources: f.sources.filter((x) => x !== src) })),
      });
    });
    filters.difficulties.forEach((d) =>
      chips.push({
        key: `diff-${d}`,
        label: `কঠিনতা: ${getDifficultyLabelBn(d)}`,
        onRemove: () => setFilters((f) => ({ ...f, difficulties: f.difficulties.filter((x) => x !== d) })),
      })
    );
    filters.questionTypes.forEach((qt) =>
      chips.push({
        key: `qt-${qt}`,
        label: QUESTION_TYPE_LABELS_BN[qt] || qt,
        onRemove: () => setFilters((f) => ({ ...f, questionTypes: f.questionTypes.filter((x) => x !== qt) })),
      })
    );
    filters.boards.forEach((b) =>
      chips.push({
        key: `bd-${b}`,
        label: EDUCATION_BOARD_LABELS_BN[b]?.bn || b,
        onRemove: () => setFilters((f) => ({ ...f, boards: f.boards.filter((x) => x !== b) })),
      })
    );
    filters.institutionIds.forEach((instId) => {
      const inst = admissionCat.institutions.find((i) => i.id === instId);
      chips.push({
        key: `inst-${instId}`,
        label: inst?.shortCode || instId,
        onRemove: () =>
          setFilters((f) => ({ ...f, institutionIds: f.institutionIds.filter((x) => x !== instId) })),
      });
    });
    filters.years.forEach((yr) =>
      chips.push({
        key: `yr-${yr}`,
        label: `সাল: ${toBanglaDigits(yr)}`,
        onRemove: () => setFilters((f) => ({ ...f, years: f.years.filter((x) => x !== yr) })),
      })
    );
    if (filters.yearFrom || filters.yearTo) {
      chips.push({
        key: 'yr-range',
        label: `সাল পরিসর: ${toBanglaDigits(filters.yearFrom || 2010)}–${toBanglaDigits(filters.yearTo || 2026)}`,
        onRemove: () => setFilters((f) => ({ ...f, yearFrom: undefined, yearTo: undefined })),
      });
    }
    if (filters.answerFilter !== 'all') {
      chips.push({
        key: 'ans',
        label: filters.answerFilter === 'with_answer' ? 'উত্তরসহ প্রশ্ন' : 'উত্তরবিহীন প্রশ্ন',
        onRemove: () => setFilters((f) => ({ ...f, answerFilter: 'all' })),
      });
    }
    if (filters.usageFilter !== 'all') {
      chips.push({
        key: 'use',
        label: filters.usageFilter === 'used' ? 'পূর্বে ব্যবহৃত' : 'অব্যবহৃত প্রশ্ন',
        onRemove: () => setFilters((f) => ({ ...f, usageFilter: 'all' })),
      });
    }
    return chips;
  }, [filters, admissionCat.institutions]);

  const sourceOptions = meta.domain === 'admission' ? SOURCE_OPTIONS_ADMISSION : SOURCE_OPTIONS_ACADEMIC;

  const getInstitutionLabel = (instId?: string) =>
    admissionCat.institutions.find((i) => i.id === instId)?.shortCode || '';

  return (
    <div className="space-y-5 font-bangla">
      {/* Top Workspace Summary Strip */}
      <Card className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#D4A853] font-medium">
            <span>{meta.domain === 'admission' ? getAdmissionCategoryLabelBn(meta.admissionCategory) : meta.classLabel}</span>
            <span>•</span>
            <span>{meta.subjectLabel}</span>
            <span>•</span>
            <span className="tabular-nums">সময়: {toBanglaDigits(meta.durationMinutes)} মিনিট</span>
          </div>
          <h2 className="mt-0.5 font-display text-xl font-bold text-[#F5EFE2] truncate">
            {meta.title} — {meta.examName}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onBackToSetup && (
            <Button variant="secondary" size="sm" onClick={onBackToSetup}>
              তথ্য ও অধ্যায় পরিবর্তন
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowMobileFilters((v) => !v)}
            className="lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            ফিল্টার ({toBanglaDigits(activeChips.length)})
          </Button>
          <Button variant="secondary" size="sm" onClick={() => persistPaper(false)}>
            <Save className="h-4 w-4" />
            সংরক্ষণ করুন
          </Button>
          <Button size="sm" onClick={() => persistPaper(true)}>
            <Eye className="h-4 w-4" />
            প্রিভিউ ও এডিটর ({toBanglaDigits(selectedItems.length)})
          </Button>
        </div>
      </Card>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4A853]/40 bg-[#D4A853]/12 px-2.5 py-1 text-xs font-medium text-[#EAC779] hover:bg-[#D4A853]/20 cursor-pointer"
            >
              <span>{chip.label}</span>
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:underline ml-1 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            সব ফিল্টার মুছুন
          </button>
        </div>
      )}

      {/* Main Two-Panel Layout: LEFT Filters | RIGHT Available + Selected Questions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* LEFT PANEL — Combined Multi-Select Filters */}
        <aside
          className={`lg:col-span-4 xl:col-span-3 space-y-4 ${
            showMobileFilters ? 'block' : 'hidden lg:block'
          }`}
        >
          <Card className="p-4 space-y-5">
            <div className="flex items-center justify-between border-b border-[#D4A853]/20 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#EAC779]">
                <Filter className="h-4 w-4" />
                <span>উন্নত ফিল্টার প্যানেল</span>
              </div>
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-xs text-[#9DA6B5] hover:text-[#EAC779] cursor-pointer"
              >
                রিসেট
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 text-[#8C95A4] absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="প্রশ্ন, উদ্দীপক বা সূত্র খুঁজুন..."
                className="pl-9"
              />
            </div>

            {/* 1. Question Source */}
            <div className="space-y-2">
              <p className="text-xs font-bold tracking-wide text-[#EAC779]">১. প্রশ্নের উৎস</p>
              <div className="space-y-1.5">
                {sourceOptions.map((src) => (
                  <label
                    key={src.code}
                    className="flex items-center gap-2 text-xs text-[#C2C8D3] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.sources.includes(src.code)}
                      onChange={() =>
                        setFilters((f) => ({ ...f, sources: toggleInArray(f.sources, src.code) }))
                      }
                      className="rounded border-[#D4A853]/40 accent-[#D4A853]"
                    />
                    <span>{src.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 2. Domain-Specific Filters (Academic vs Admission strictly separated) */}
            {meta.domain === 'academic' ? (
              <div className="space-y-3 border-t border-[#D4A853]/15 pt-4">
                <p className="text-xs font-bold tracking-wide text-[#EAC779]">২. একাডেমিক ফিল্টার</p>
                <Select
                  value={filters.classId || ''}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      classId: e.target.value || undefined,
                      subjectId: undefined,
                      chapterIds: [],
                      topicIds: [],
                    }))
                  }
                >
                  <option value="">সকল শ্রেণি (১–১২)</option>
                  {academicCat.classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.nameBn}
                    </option>
                  ))}
                </Select>

                <Select
                  value={filters.subjectId || ''}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      subjectId: e.target.value || undefined,
                      chapterIds: [],
                      topicIds: [],
                    }))
                  }
                >
                  <option value="">সকল বিষয়</option>
                  {academicSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.nameBn}
                    </option>
                  ))}
                </Select>

                {academicChapters.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    <p className="text-[11px] font-semibold text-[#9DA6B5]">অধ্যায়সমূহ (একাধিক)</p>
                    {academicChapters.map((ch) => (
                      <label key={ch.id} className="flex items-start gap-2 text-xs text-[#C2C8D3] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.chapterIds.includes(ch.id)}
                          onChange={() =>
                            setFilters((f) => ({
                              ...f,
                              chapterIds: toggleInArray(f.chapterIds, ch.id),
                            }))
                          }
                          className="mt-0.5 accent-[#D4A853]"
                        />
                        <span>{ch.nameBn}</span>
                      </label>
                    ))}
                  </div>
                )}

                {academicTopics.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    <p className="text-[11px] font-semibold text-[#9DA6B5]">টপিকসমূহ (একাধিক)</p>
                    {academicTopics.map((t) => (
                      <label key={t.id} className="flex items-start gap-2 text-xs text-[#C2C8D3] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.topicIds.includes(t.id)}
                          onChange={() =>
                            setFilters((f) => ({
                              ...f,
                              topicIds: toggleInArray(f.topicIds, t.id),
                            }))
                          }
                          className="mt-0.5 accent-[#D4A853]"
                        />
                        <span>{t.nameBn}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 border-t border-[#D4A853]/15 pt-4">
                <p className="text-xs font-bold tracking-wide text-[#EAC779]">২. ভর্তি পরীক্ষার ফিল্টার</p>
                <Select
                  value={filters.admissionCategory || ''}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      admissionCategory: (e.target.value || undefined) as AdmissionCategoryCode | undefined,
                      institutionIds: [],
                      admissionSubjectId: undefined,
                      admissionTopicIds: [],
                    }))
                  }
                >
                  <option value="">সকল ভর্তি বিভাগ</option>
                  {admissionCat.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nameBn}
                    </option>
                  ))}
                </Select>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-[#9DA6B5]">বিশ্ববিদ্যালয় / প্রতিষ্ঠান</p>
                  <div className="flex flex-wrap gap-1.5">
                    {admissionInstitutions.map((inst) => {
                      const active = filters.institutionIds.includes(inst.id);
                      return (
                        <button
                          key={inst.id}
                          type="button"
                          onClick={() =>
                            setFilters((f) => ({
                              ...f,
                              institutionIds: toggleInArray(f.institutionIds, inst.id),
                            }))
                          }
                          className={`rounded-md px-2 py-1 text-xs font-medium border cursor-pointer transition-colors ${
                            active
                              ? 'border-[#EAC779] bg-[#D4A853]/20 text-[#EAC779]'
                              : 'border-[#D4A853]/20 bg-[#0A0D12] text-[#B8C0CE] hover:border-[#D4A853]/45'
                          }`}
                        >
                          {inst.shortCode}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Select
                  value={filters.admissionSubjectId || ''}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      admissionSubjectId: e.target.value || undefined,
                      admissionTopicIds: [],
                    }))
                  }
                >
                  <option value="">সকল ভর্তি বিষয়</option>
                  {admissionSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameBn}
                    </option>
                  ))}
                </Select>

                {admissionTopics.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    <p className="text-[11px] font-semibold text-[#9DA6B5]">ভর্তি টপিকসমূহ (একাধিক)</p>
                    {admissionTopics.map((t) => (
                      <label key={t.id} className="flex items-start gap-2 text-xs text-[#C2C8D3] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.admissionTopicIds.includes(t.id)}
                          onChange={() =>
                            setFilters((f) => ({
                              ...f,
                              admissionTopicIds: toggleInArray(f.admissionTopicIds, t.id),
                            }))
                          }
                          className="mt-0.5 accent-[#D4A853]"
                        />
                        <span>{t.nameBn}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Difficulty */}
            <div className="space-y-2 border-t border-[#D4A853]/15 pt-4">
              <p className="text-xs font-bold tracking-wide text-[#EAC779]">৩. কঠিনতার স্তর</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(['easy', 'medium', 'hard'] as QuestionDifficulty[]).map((diff) => {
                  const active = filters.difficulties.includes(diff);
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() =>
                        setFilters((f) => ({ ...f, difficulties: toggleInArray(f.difficulties, diff) }))
                      }
                      className={`rounded-md py-1.5 text-xs font-semibold border cursor-pointer ${
                        active
                          ? 'border-[#EAC779] bg-[#D4A853]/20 text-[#EAC779]'
                          : 'border-[#D4A853]/20 bg-[#0A0D12] text-[#B8C0CE]'
                      }`}
                    >
                      {getDifficultyLabelBn(diff)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Question Types (Multi-select) */}
            <div className="space-y-2 border-t border-[#D4A853]/15 pt-4">
              <p className="text-xs font-bold tracking-wide text-[#EAC779]">৪. প্রশ্নের ধরন (একাধিক)</p>
              <div className="grid grid-cols-1 gap-1.5">
                {QUESTION_TYPES_ORDERED.map((qt) => (
                  <label key={qt} className="flex items-center gap-2 text-xs text-[#C2C8D3] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.questionTypes.includes(qt)}
                      onChange={() =>
                        setFilters((f) => ({ ...f, questionTypes: toggleInArray(f.questionTypes, qt) }))
                      }
                      className="accent-[#D4A853]"
                    />
                    <span>{QUESTION_TYPE_LABELS_BN[qt]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 5. Education Boards */}
            <div className="space-y-2 border-t border-[#D4A853]/15 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold tracking-wide text-[#EAC779]">৫. শিক্ষা বোর্ড</p>
                {filters.boards.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, boards: [] }))}
                    className="text-[11px] text-[#9DA6B5] hover:text-[#EAC779] cursor-pointer"
                  >
                    সকল বোর্ড
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_EDUCATION_BOARDS.map((b: EducationBoard) => {
                  const active = filters.boards.includes(b);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() =>
                        setFilters((f) => ({ ...f, boards: toggleInArray(f.boards, b) }))
                      }
                      className={`rounded-md px-2 py-1 text-[11px] font-medium border cursor-pointer ${
                        active
                          ? 'border-[#EAC779] bg-[#D4A853]/20 text-[#EAC779]'
                          : 'border-[#D4A853]/20 bg-[#0A0D12] text-[#B8C0CE]'
                      }`}
                    >
                      {EDUCATION_BOARD_LABELS_BN[b].bn.replace(' বোর্ড', '')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. Board / Admission Year (2010–2026 + Range) */}
            <div className="space-y-2.5 border-t border-[#D4A853]/15 pt-4">
              <p className="text-xs font-bold tracking-wide text-[#EAC779]">
                ৬. পরীক্ষার সাল (২০১০–২০২৬)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={filters.yearFrom ?? ''}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      yearFrom: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                >
                  <option value="">শুরু সাল</option>
                  {AVAILABLE_EXAM_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {toBanglaDigits(y)}
                    </option>
                  ))}
                </Select>
                <Select
                  value={filters.yearTo ?? ''}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      yearTo: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                >
                  <option value="">শেষ সাল</option>
                  {AVAILABLE_EXAM_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {toBanglaDigits(y)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {AVAILABLE_EXAM_YEARS.slice(0, 10).map((yr) => {
                  const active = filters.years.includes(yr);
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() =>
                        setFilters((f) => ({ ...f, years: toggleInArray(f.years, yr) }))
                      }
                      className={`rounded px-2 py-0.5 text-[11px] font-mono tabular-nums border cursor-pointer ${
                        active
                          ? 'border-[#EAC779] bg-[#D4A853]/20 text-[#EAC779]'
                          : 'border-[#D4A853]/20 text-[#9DA6B5]'
                      }`}
                    >
                      {toBanglaDigits(yr)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 7. Answer / Usage / Sort */}
            <div className="space-y-2.5 border-t border-[#D4A853]/15 pt-4">
              <p className="text-xs font-bold tracking-wide text-[#EAC779]">৭. অন্যান্য ফিল্টার ও ক্রম</p>
              <Select
                value={filters.answerFilter}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    answerFilter: e.target.value as WorkspaceFilterState['answerFilter'],
                  }))
                }
              >
                <option value="all">সকল প্রশ্ন (উত্তরসহ/ছাড়া)</option>
                <option value="with_answer">শুধু উত্তরসহ প্রশ্ন</option>
                <option value="without_answer">উত্তরবিহীন প্রশ্ন</option>
              </Select>
              <Select
                value={filters.usageFilter}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    usageFilter: e.target.value as WorkspaceFilterState['usageFilter'],
                  }))
                }
              >
                <option value="all">ব্যবহৃত ও অব্যবহৃত উভয়ই</option>
                <option value="unused">শুধু অব্যবহৃত প্রশ্ন</option>
                <option value="used">পূর্বে ব্যবহৃত প্রশ্ন</option>
              </Select>
              <Select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    sortBy: e.target.value as WorkspaceFilterState['sortBy'],
                  }))
                }
              >
                <option value="default">স্বাভাবিক ক্রম</option>
                <option value="recent">সাম্প্রতিক যুক্ত প্রশ্ন</option>
                <option value="year_desc">সর্বশেষ বোর্ড/ভর্তি সাল</option>
                <option value="random">র‍্যান্ডম (এলোমেলো)</option>
              </Select>
            </div>

            {/* 8. Save / Load Filter Presets */}
            <div className="space-y-2 border-t border-[#D4A853]/15 pt-4">
              <p className="text-xs font-bold tracking-wide text-[#EAC779]">সংরক্ষিত ফিল্টার প্রিসেট</p>
              <div className="flex gap-1.5">
                <Input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="প্রিসেটের নাম..."
                  className="text-xs py-1.5"
                />
                <Button size="sm" variant="secondary" onClick={handleSavePreset}>
                  <Bookmark className="h-3.5 w-3.5" />
                </Button>
              </div>
              {savedPresets.length > 0 && (
                <div className="space-y-1 pt-1">
                  {savedPresets.map((pr) => (
                    <div
                      key={pr.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-[#D4A853]/20 bg-[#0A0D12] px-2.5 py-1.5 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setFilters(pr.filters);
                          pushToast({ title: `"${pr.name}" ফিল্টার প্রয়োগ হয়েছে`, variant: 'info' });
                        }}
                        className="truncate text-left text-[#F3EEE3] hover:text-[#EAC779] cursor-pointer"
                      >
                        {pr.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          platformService.deleteFilterPreset(pr.id);
                          setSavedPresets((prev) => prev.filter((p) => p.id !== pr.id));
                        }}
                        aria-label="প্রিসেট মুছুন"
                        className="text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </aside>

        {/* RIGHT PANEL — Available Questions + Selected Questions Drawer */}
        <div className="lg:col-span-8 xl:col-span-9 grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
          {/* Available Questions Column */}
          <div className="xl:col-span-7 space-y-4">
            <Card className="p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[#F5EFE2] tabular-nums">
                পাওয়া গেছে: <span className="text-[#EAC779]">{toBanglaDigits(availableQuestions.length)}টি প্রশ্ন</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleSelectAllVisible}>
                  সবগুলো যুক্ত করুন
                </Button>
                <div className="inline-flex items-center gap-1 rounded-lg border border-[#D4A853]/30 bg-[#0A0D12] px-2 py-1">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={randomCount}
                    onChange={(e) => setRandomCount(Math.max(1, Number(e.target.value) || 1))}
                    className="w-11 bg-transparent text-xs text-center text-[#F3EEE3] focus:outline-none tabular-nums"
                    aria-label="র‍্যান্ডম প্রশ্ন সংখ্যা"
                  />
                  <button
                    type="button"
                    onClick={handleRandomPick}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#EAC779] hover:underline whitespace-nowrap cursor-pointer"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    র‍্যান্ডম বাছাই
                  </button>
                </div>
              </div>
            </Card>

            {isLoading ? (
              <Card className="p-10 text-center space-y-2">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#D4A853] border-t-transparent" />
                <p className="text-sm text-[#B8C0CE]">প্রশ্নব্যাংক থেকে প্রশ্ন লোড হচ্ছে...</p>
              </Card>
            ) : loadError ? (
              <Card className="p-6 text-center space-y-2 border-rose-500/40">
                <p className="text-sm font-semibold text-rose-300">{loadError}</p>
                <Button variant="secondary" size="sm" onClick={handleClearAllFilters}>
                  ফিল্টার রিসেট করুন
                </Button>
              </Card>
            ) : availableQuestions.length === 0 ? (
              <Card className="p-10 text-center space-y-3">
                <p className="text-base font-bold text-[#F5EFE2]">নির্বাচিত ফিল্টারে কোনো প্রশ্ন পাওয়া যায়নি</p>
                <p className="text-sm text-[#9DA6B5]">
                  বোর্ড, সাল বা অধ্যায় ফিল্টার কিছুটা শিথিল করে দেখুন অথবা সব ফিল্টার রিসেট করুন।
                </p>
                <Button variant="secondary" size="sm" onClick={handleClearAllFilters}>
                  সব ফিল্টার রিসেট করুন
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {availableQuestions.map((q) => {
                  const isAdded = selectedQuestionIds.has(q.id);
                  const hasAnswer = Boolean(
                    q.correctAnswerText || q.options?.some((o) => o.isCorrect) || q.subParts?.length
                  );
                  return (
                    <Card
                      key={q.id}
                      className={`p-4 space-y-3 transition-colors ${
                        isAdded ? 'border-[#EAC779]/70 bg-[#D4A853]/[0.06]' : ''
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5 text-[#B8C0CE]">
                          <span className="rounded bg-[#141922] border border-[#D4A853]/30 px-2 py-0.5 font-semibold text-[#EAC779]">
                            {QUESTION_TYPE_LABELS_BN[q.questionTypeCode] || q.questionTypeCode}
                          </span>
                          <span className="rounded bg-[#141922] border border-white/10 px-2 py-0.5">
                            {getDifficultyLabelBn(q.difficulty)}
                          </span>
                          <span className="tabular-nums text-[#D4A853] font-semibold">
                            {toBanglaDigits(q.marks)} নম্বর
                          </span>
                          {q.board && (
                            <span className="rounded bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 text-emerald-300">
                              {EDUCATION_BOARD_LABELS_BN[q.board]?.bn}
                              {q.boardYear ? ` ${toBanglaDigits(q.boardYear)}` : ''}
                            </span>
                          )}
                          {!q.board && q.institutionId && (
                            <span className="rounded bg-indigo-950/50 border border-indigo-400/30 px-2 py-0.5 text-indigo-300">
                              {getInstitutionLabel(q.institutionId)}
                              {q.boardYear ? ` ${toBanglaDigits(q.boardYear)}` : ''}
                            </span>
                          )}
                          {hasAnswer && (
                            <span className="text-emerald-400 font-medium">✓ উত্তরসহ</span>
                          )}
                        </div>
                      </div>

                      {q.stimulus && (
                        <p className="text-xs italic text-[#C2C8D3] bg-[#090C11] border border-[#D4A853]/15 rounded-lg p-2.5">
                          উদ্দীপক: {q.stimulus}
                        </p>
                      )}

                      <p className="text-sm font-medium text-[#F5EFE2] leading-relaxed">{q.prompt}</p>

                      {q.equationLatex && (
                        <p className="font-mono text-xs text-[#EAC779] bg-[#090C11] rounded px-2.5 py-1.5 border border-[#D4A853]/20">
                          {q.equationLatex}
                        </p>
                      )}

                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#C2C8D3]">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className="rounded border border-white/10 bg-[#0A0D12] px-2.5 py-1"
                            >
                              <span className="font-semibold text-[#EAC779] mr-1">({opt.label})</span>
                              {opt.text}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#D4A853]/15">
                        <button
                          type="button"
                          onClick={() => setPreviewQuestion(q)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B8C0CE] hover:text-[#EAC779] cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          বিস্তারিত প্রিভিউ
                        </button>

                        <Button
                          size="sm"
                          variant={isAdded ? 'secondary' : 'primary'}
                          onClick={() => handleToggleQuestion(q)}
                        >
                          {isAdded ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              যুক্ত আছে
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              প্রশ্নপত্রে যুক্ত করুন
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Questions Panel */}
          <div className="xl:col-span-5 xl:sticky xl:top-20">
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[#D4A853]/20 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#EAC779]">নির্বাচিত প্রশ্নসমূহ</h3>
                  <p className="text-xs text-[#9DA6B5] tabular-nums">
                    মোট {toBanglaDigits(selectedItems.length)}টি প্রশ্ন · মোট{' '}
                    {toBanglaDigits(totalSelectedMarks)} নম্বর
                  </p>
                </div>
                {selectedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedItems([])}
                    className="text-xs text-rose-400 hover:underline cursor-pointer"
                  >
                    সব সরান
                  </button>
                )}
              </div>

              {selectedItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#D4A853]/30 p-6 text-center space-y-1">
                  <p className="text-sm font-semibold text-[#F3EEE3]">এখনো কোনো প্রশ্ন নির্বাচন করা হয়নি</p>
                  <p className="text-xs text-[#9DA6B5]">
                    বাম তালিকা থেকে প্রশ্ন যুক্ত করুন। ড্র্যাগ করে ক্রম পরিবর্তন করা যাবে।
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {selectedItems.map((item, idx) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => setDragIdx(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDropReorder(idx)}
                      className="rounded-lg border border-[#D4A853]/25 bg-[#0A0D12] p-2.5 space-y-2 cursor-move"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-[#8C95A4] shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-[#F5EFE2] line-clamp-2">
                            <span className="font-bold text-[#EAC779] mr-1 tabular-nums">
                              {toBanglaDigits(idx + 1)}.
                            </span>
                            {item.snapshot.prompt}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pl-6">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-[#9DA6B5]">নম্বর:</span>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={item.customMarks}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value) || 1);
                              setSelectedItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, customMarks: val } : it))
                              );
                            }}
                            className="w-12 rounded border border-[#D4A853]/30 bg-[#12161F] px-1.5 py-0.5 text-center text-xs text-[#F3EEE3] tabular-nums"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveSelected(idx, 'up')}
                            disabled={idx === 0}
                            aria-label="উপরে নিন"
                            className="rounded border border-[#D4A853]/25 p-1 text-[#B8C0CE] hover:text-[#EAC779] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSelected(idx, 'down')}
                            disabled={idx === selectedItems.length - 1}
                            aria-label="নিচে নিন"
                            className="rounded border border-[#D4A853]/25 p-1 text-[#B8C0CE] hover:text-[#EAC779] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedItems((prev) =>
                                prev
                                  .filter((it) => it.id !== item.id)
                                  .map((it, i) => ({ ...it, orderIndex: i }))
                              )
                            }
                            aria-label="অপসারণ করুন"
                            className="rounded border border-rose-500/30 p-1 text-rose-300 hover:bg-rose-950/60 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#D4A853]/20">
                <Button variant="secondary" onClick={() => persistPaper(false)}>
                  <Save className="h-4 w-4" />
                  সংরক্ষণ
                </Button>
                <Button onClick={() => persistPaper(true)}>
                  <Eye className="h-4 w-4" />
                  প্রিভিউ এডিটর
                </Button>
              </div>
              <p className="text-[11px] text-[#8C95A4] leading-relaxed">
                "প্রিভিউ এডিটর" ক্লিক করলে আলাদা ডকুমেন্ট-স্টাইল এডিটর খুলবে—যেখানে ফন্ট, লেআউট, প্রতিটি প্রশ্ন, অপশন ও OMR শিট সম্পাদনা করে PDF/DOCX এক্সপোর্ট করতে পারবেন।
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Question Detail Preview Modal */}
      <Modal
        open={!!previewQuestion}
        onClose={() => setPreviewQuestion(null)}
        title="প্রশ্নের পূর্ণ বিবরণ"
      >
        {previewQuestion && (
          <div className="space-y-4 text-sm font-bangla">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-[#141922] border border-[#D4A853]/30 px-2 py-0.5 text-[#EAC779] font-semibold">
                {QUESTION_TYPE_LABELS_BN[previewQuestion.questionTypeCode]}
              </span>
              <span className="rounded bg-[#141922] border border-white/10 px-2 py-0.5 text-[#C2C8D3]">
                {getDifficultyLabelBn(previewQuestion.difficulty)} · {toBanglaDigits(previewQuestion.marks)} নম্বর
              </span>
              {previewQuestion.board && (
                <span className="rounded bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 text-emerald-300">
                  {EDUCATION_BOARD_LABELS_BN[previewQuestion.board]?.bn}{' '}
                  {previewQuestion.boardYear ? toBanglaDigits(previewQuestion.boardYear) : ''}
                </span>
              )}
            </div>
            {previewQuestion.stimulus && (
              <div className="rounded-lg bg-[#090C11] border border-[#D4A853]/20 p-3 text-xs text-[#C2C8D3]">
                <span className="font-bold text-[#EAC779]">উদ্দীপক: </span>
                {previewQuestion.stimulus}
              </div>
            )}
            <p className="text-base font-semibold text-[#F5EFE2]">{previewQuestion.prompt}</p>
            {previewQuestion.equationLatex && (
              <p className="font-mono text-xs text-[#EAC779] bg-[#090C11] p-2.5 rounded border border-[#D4A853]/20">
                {previewQuestion.equationLatex}
              </p>
            )}
            {previewQuestion.options && previewQuestion.options.length > 0 && (
              <div className="space-y-1.5">
                {previewQuestion.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      opt.isCorrect
                        ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200 font-semibold'
                        : 'border-white/10 bg-[#0A0D12] text-[#C2C8D3]'
                    }`}
                  >
                    ({opt.label}) {opt.text} {opt.isCorrect ? '✓ সঠিক উত্তর' : ''}
                  </div>
                ))}
              </div>
            )}
            {previewQuestion.subParts && previewQuestion.subParts.length > 0 && (
              <div className="space-y-2">
                {previewQuestion.subParts.map((sp) => (
                  <div key={sp.id} className="rounded-lg border border-white/10 bg-[#0A0D12] p-2.5 text-xs">
                    <p className="font-semibold text-[#F5EFE2]">
                      {sp.label}) {sp.prompt} [{toBanglaDigits(sp.marks)}]
                    </p>
                    <p className="mt-1 text-emerald-300">উত্তর: {sp.answer}</p>
                  </div>
                ))}
              </div>
            )}
            {previewQuestion.correctAnswerText && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-200">
                <span className="font-bold">সঠিক উত্তর: </span>
                {previewQuestion.correctAnswerText}
              </div>
            )}
            {previewQuestion.explanation && (
              <div className="rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-3 text-xs text-[#C2C8D3]">
                <span className="font-bold text-[#EAC779]">ব্যাখ্যা: </span>
                {previewQuestion.explanation}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setPreviewQuestion(null)}>
                বন্ধ করুন
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleToggleQuestion(previewQuestion);
                  setPreviewQuestion(null);
                }}
              >
                {selectedQuestionIds.has(previewQuestion.id)
                  ? 'তালিকা থেকে সরান'
                  : 'প্রশ্নপত্রে যুক্ত করুন'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
