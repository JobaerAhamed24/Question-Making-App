import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  Copy,
  Download,
  FileText,
  Layers,
  Maximize2,
  Minimize2,
  Palette,
  Plus,
  Printer,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Button, Card, FormField, Input, Select, Textarea } from '../../components/ui/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { toBanglaDigits } from '../../lib/bn';
import { questionBankService } from '../../services/questionBankService';
import {
  createDefaultDeckConfig,
  exportDeckToPptx,
  generateSlidesFromMcqs,
  getSampleMcqs12,
  getSampleRawMcqText12,
  parseMcqTextToItems,
  SLIDE_FONT_OPTIONS,
  SLIDE_TEMPLATES,
  slideService,
} from '../../services/slideService';
import type {
  AnswerRevealMode,
  SlideAspectRatio,
  SlideBackgroundStyle,
  SlideDeck,
  SlideDeckConfig,
  SlideItem,
  SlideLayoutMode,
  SlideMcqInput,
  SlideTypographyScale,
} from '../../types/domain';

function getAspectClass(ratio: SlideAspectRatio): string {
  if (ratio === '16:10') return 'aspect-[16/10]';
  if (ratio === '4:3') return 'aspect-[4/3]';
  return 'aspect-video';
}

function SlideCanvasView({
  slide,
  config,
  slideNumber,
  totalSlides,
  compact = false,
}: {
  slide: SlideItem;
  config: SlideDeckConfig;
  slideNumber: number;
  totalSlides: number;
  compact?: boolean;
}) {
  const bgStyle: React.CSSProperties = {
    backgroundColor: config.customBgColor,
    color: config.customTextColor,
    fontFamily: `"${config.fontFamily}", "Hind Siliguri", sans-serif`,
    backgroundImage:
      config.backgroundStyle === 'gradient'
        ? `radial-gradient(circle at 85% 15%, ${config.customAccentColor}26, transparent 52%), radial-gradient(circle at 12% 88%, ${config.customAccentColor}18, transparent 48%)`
        : config.backgroundStyle === 'grid'
        ? `linear-gradient(${config.customAccentColor}14 1px, transparent 1px), linear-gradient(90deg, ${config.customAccentColor}14 1px, transparent 1px)`
        : undefined,
    backgroundSize: config.backgroundStyle === 'grid' ? '32px 32px' : undefined,
  };

  const scalePromptClass =
    compact
      ? 'text-[10px]'
      : config.typographyScale === 'classroom'
      ? 'text-xl sm:text-2xl lg:text-[26px]'
      : config.typographyScale === 'compact'
      ? 'text-base sm:text-lg'
      : 'text-lg sm:text-xl';

  const scaleOptionClass =
    compact
      ? 'text-[8px]'
      : config.typographyScale === 'classroom'
      ? 'text-base sm:text-lg'
      : config.typographyScale === 'compact'
      ? 'text-xs sm:text-sm'
      : 'text-sm sm:text-base';

  const isTitleOrSummary = slide.kind === 'title' || slide.kind === 'summary';
  const isAnswer = slide.kind === 'answer';

  return (
    <div
      style={bgStyle}
      className={`relative w-full h-full overflow-hidden flex flex-col justify-between select-none ${
        compact ? 'p-2.5' : 'p-6 sm:p-8 lg:p-10'
      }`}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{ backgroundColor: config.customAccentColor }}
      />

      {isTitleOrSummary ? (
        <div className="my-auto flex flex-col items-center justify-center text-center space-y-3 px-4">
          <span
            className={`font-mono uppercase tracking-[0.2em] font-semibold ${
              compact ? 'text-[7px]' : 'text-xs'
            }`}
            style={{ color: config.customAccentColor }}
          >
            {slide.kind === 'title' ? 'MCQ PRESENTATION' : 'SESSION SUMMARY'}
          </span>
          <h2
            className={`font-bold leading-tight text-balance ${
              compact
                ? 'text-xs'
                : config.typographyScale === 'classroom'
                ? 'text-3xl sm:text-4xl'
                : 'text-2xl sm:text-3xl'
            }`}
          >
            {slide.title}
          </h2>
          {slide.subtitle && (
            <p
              className={`${compact ? 'text-[8px]' : 'text-base sm:text-lg'} font-medium opacity-90`}
              style={{ color: config.customAccentColor }}
            >
              {slide.subtitle}
            </p>
          )}
          {slide.prompt && (
            <p className={`${compact ? 'text-[7px]' : 'text-sm'} opacity-80 max-w-2xl`}>
              {slide.prompt}
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between gap-3 pt-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`font-bold tracking-wide ${compact ? 'text-[7px]' : 'text-xs sm:text-sm'}`}
                style={{ color: config.customAccentColor }}
              >
                {slide.title}
              </span>
              {isAnswer && !compact && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded border border-emerald-400/50 bg-emerald-500/15 text-emerald-300">
                  <Check className="h-3.5 w-3.5" />
                  সঠিক উত্তর
                </span>
              )}
            </div>

            {slide.prompt && (
              <p className={`font-bold leading-snug ${scalePromptClass}`}>{slide.prompt}</p>
            )}
          </div>

          {/* Options */}
          {slide.options && slide.options.length > 0 && (
            <div
              className={`grid gap-2.5 my-auto ${
                config.layoutMode === 'stacked'
                  ? 'grid-cols-1'
                  : config.layoutMode === 'split-focus'
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : 'grid-cols-2'
              }`}
            >
              {slide.options.map((opt, idx) => {
                const highlight = isAnswer && opt.isCorrect;
                return (
                  <div
                    key={`${opt.label}-${idx}`}
                    style={{
                      borderColor: highlight ? '#34D399' : `${config.customAccentColor}45`,
                      backgroundColor: highlight
                        ? 'rgba(16, 185, 129, 0.2)'
                        : `${config.customAccentColor}0F`,
                    }}
                    className={`rounded-lg border transition-colors flex items-center gap-2.5 ${
                      compact ? 'px-1.5 py-1' : 'px-3.5 py-2.5 sm:py-3'
                    }`}
                  >
                    <span
                      style={{
                        backgroundColor: highlight ? '#10B981' : config.customAccentColor,
                        color: highlight ? '#FFFFFF' : '#090B0E',
                      }}
                      className={`shrink-0 font-bold rounded flex items-center justify-center ${
                        compact ? 'h-3 w-3 text-[6px]' : 'h-6 w-6 text-xs'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className={`font-medium leading-snug ${scaleOptionClass} flex-1`}>
                      {opt.text}
                    </span>
                    {highlight && !compact && (
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Explanation on Answer slides */}
          {isAnswer && slide.explanation && !compact && (
            <div
              className="rounded-lg border px-3.5 py-2 text-xs sm:text-sm leading-relaxed"
              style={{
                borderColor: `${config.customAccentColor}45`,
                backgroundColor: `${config.customAccentColor}14`,
              }}
            >
              <span className="font-bold" style={{ color: config.customAccentColor }}>
                ব্যাখ্যা:{' '}
              </span>
              <span className="opacity-95">{slide.explanation}</span>
            </div>
          )}
        </div>
      )}

      {/* Slide footer */}
      {!compact && (
        <div className="flex items-center justify-between text-[11px] opacity-65 pt-2 border-t border-current/10">
          <span className="truncate">{config.presenterName || config.title}</span>
          <span className="font-mono tabular-nums">
            {toBanglaDigits(slideNumber)} / {toBanglaDigits(totalSlides)}
          </span>
        </div>
      )}
    </div>
  );
}

export function SlideMakerPage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const { classes, subjects } = questionBankService.getAcademicCatalogue();

  const [config, setConfig] = useState<SlideDeckConfig>(() => createDefaultDeckConfig());
  const [sourceMcqs, setSourceMcqs] = useState<SlideMcqInput[]>(() => getSampleMcqs12());
  const [slides, setSlides] = useState<SlideItem[]>(() =>
    generateSlidesFromMcqs(getSampleMcqs12(), createDefaultDeckConfig())
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [rightTab, setRightTab] = useState<'edit' | 'design'>('design');
  const [deckId] = useState(() => `deck-${Date.now()}`);
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);

  // Import / Paste Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<'paste' | 'bank'>('paste');
  const [rawMcqText, setRawMcqText] = useState(() => getSampleRawMcqText12());
  const [bankClassId, setBankClassId] = useState('');
  const [bankSubjectId, setBankSubjectId] = useState('');
  const [bankLimit, setBankLimit] = useState(12);

  const parsedPreview = useMemo(() => parseMcqTextToItems(rawMcqText), [rawMcqText]);

  const activeSlide = slides[activeIndex] ?? slides[0];

  // Keyboard shortcuts during fullscreen presentation
  useEffect(() => {
    if (!isPresenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPresenting(false);
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(slides.length - 1, i + 1));
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPresenting, slides.length]);

  const regenerateFromMcqs = (nextMcqs: SlideMcqInput[], nextConfig: SlideDeckConfig) => {
    const built = generateSlidesFromMcqs(nextMcqs, nextConfig);
    setSourceMcqs(nextMcqs);
    setSlides(built);
    setActiveIndex(0);
  };

  const applyConfigUpdate = (patch: Partial<SlideDeckConfig>, rebuildSlides = false) => {
    const next = { ...config, ...patch };
    setConfig(next);
    if (rebuildSlides) {
      const rebuilt = generateSlidesFromMcqs(sourceMcqs, next);
      setSlides(rebuilt);
      setActiveIndex((idx) => Math.min(idx, Math.max(0, rebuilt.length - 1)));
    }
  };

  const handleApplyTemplate = (templateId: SlideDeckConfig['templateId']) => {
    const tpl = SLIDE_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    applyConfigUpdate({
      templateId: tpl.id,
      customBgColor: tpl.bgColor,
      customTextColor: tpl.textColor,
      customAccentColor: tpl.accentColor,
      fontFamily: tpl.fontFamily,
    });
  };

  const handleGenerateFromPaste = () => {
    if (parsedPreview.length === 0) {
      pushToast({
        title: 'কোনো MCQ শনাক্ত করা যায়নি',
        description: 'প্রশ্ন এবং ক/খ/গ/ঘ বা A/B/C/D অপশনসহ সঠিক ফরম্যাটে লিখুন বা নমুনা লোড করুন।',
        variant: 'error',
      });
      return;
    }
    if (parsedPreview.length > 100) {
      pushToast({
        title: 'সর্বোচ্চ ১০০টি MCQ অনুমোদিত',
        description: `প্রথম ১০০টি MCQ দিয়ে স্লাইড তৈরি করা হয়েছে (শনাক্তকৃত: ${parsedPreview.length})।`,
        variant: 'warning',
      });
    }
    const capped = parsedPreview.slice(0, 100);
    regenerateFromMcqs(capped, config);
    setShowImportModal(false);
    pushToast({
      title: 'স্লাইড ডেক তৈরি হয়েছে',
      description: `${toBanglaDigits(capped.length)}টি MCQ থেকে মোট ${toBanglaDigits(
        generateSlidesFromMcqs(capped, config).length
      )}টি স্লাইড প্রস্তুত।`,
      variant: 'success',
    });
  };

  const handleImportFromBank = async () => {
    const imported = await slideService.importMcqsFromQuestionBank({
      classId: bankClassId || undefined,
      subjectId: bankSubjectId || undefined,
      limit: bankLimit,
    });
    if (imported.length === 0) {
      pushToast({
        title: 'ফিল্টার অনুযায়ী MCQ পাওয়া যায়নি',
        description: 'শ্রেণি বা বিষয় পরিবর্তন করে পুনরায় চেষ্টা করুন।',
        variant: 'warning',
      });
      return;
    }
    regenerateFromMcqs(imported, config);
    setShowImportModal(false);
    pushToast({
      title: 'প্রশ্নব্যাংক থেকে MCQ আমদানি হয়েছে',
      description: `${toBanglaDigits(imported.length)}টি প্রশ্ন স্লাইডে রূপান্তরিত হয়েছে।`,
      variant: 'success',
    });
  };

  const updateActiveSlide = (patch: Partial<SlideItem>) => {
    setSlides((prev) =>
      prev.map((s, idx) => (idx === activeIndex ? { ...s, ...patch } : s))
    );
  };

  const moveSlide = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= slides.length) return;
    const copy = [...slides];
    const [moved] = copy.splice(idx, 1);
    copy.splice(target, 0, moved);
    setSlides(copy);
    setActiveIndex(target);
  };

  const duplicateSlide = (idx: number) => {
    const copy = [...slides];
    const clone: SlideItem = {
      ...structuredClone(copy[idx]),
      id: `slide-copy-${Date.now()}`,
      title: `${copy[idx].title} (কপি)`,
    };
    copy.splice(idx + 1, 0, clone);
    setSlides(copy);
    setActiveIndex(idx + 1);
  };

  const addCustomSlide = () => {
    const fresh: SlideItem = {
      id: `slide-custom-${Date.now()}`,
      kind: 'question',
      title: `নতুন প্রশ্ন স্লাইড`,
      prompt: 'এখানে আপনার প্রশ্নটি লিখুন...',
      options: [
        { label: 'ক', text: 'বিকল্প ১', isCorrect: true },
        { label: 'খ', text: 'বিকল্প ২', isCorrect: false },
        { label: 'গ', text: 'বিকল্প ৩', isCorrect: false },
        { label: 'ঘ', text: 'বিকল্প ৪', isCorrect: false },
      ],
      explanation: '',
    };
    const copy = [...slides];
    copy.splice(activeIndex + 1, 0, fresh);
    setSlides(copy);
    setActiveIndex(activeIndex + 1);
    setRightTab('edit');
  };

  const deleteSlide = (idx: number) => {
    if (slides.length <= 1) {
      pushToast({ title: 'কমপক্ষে ১টি স্লাইড থাকতে হবে', variant: 'warning' });
      return;
    }
    const next = slides.filter((_, i) => i !== idx);
    setSlides(next);
    setActiveIndex((cur) => Math.max(0, Math.min(cur, next.length - 1)));
  };

  const handleExportPptx = async () => {
    setIsExportingPptx(true);
    try {
      const deck: SlideDeck = {
        id: deckId,
        userId: user?.id,
        config,
        slides,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await exportDeckToPptx(deck);
      pushToast({
        title: 'PowerPoint (.pptx) ডাউনলোড হয়েছে',
        description: `${toBanglaDigits(slides.length)}টি সম্পাদনাযোগ্য স্লাইডসহ ফাইল সংরক্ষিত।`,
        variant: 'success',
      });
    } catch (err) {
      pushToast({
        title: '.PPTX এক্সপোর্ট ব্যর্থ হয়েছে',
        description: err instanceof Error ? err.message : 'পুনরায় চেষ্টা করুন।',
        variant: 'error',
      });
    } finally {
      setIsExportingPptx(false);
    }
  };

  const handlePrintPdf = () => {
    document.body.classList.add('printing-slides-mode');
    window.print();
    window.setTimeout(() => {
      document.body.classList.remove('printing-slides-mode');
    }, 500);
  };

  const handleSaveDeck = async () => {
    const deck: SlideDeck = {
      id: deckId,
      userId: user?.id,
      config,
      slides,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await slideService.saveDeck(deck);
    pushToast({
      title: 'প্রেজেন্টেশন ডেক সংরক্ষিত হয়েছে',
      description: 'ব্রাউজার সেশনে স্লাইড ডেকটি সংরক্ষণ করা হয়েছে।',
      variant: 'success',
    });
  };

  const filteredBankSubjects = bankClassId
    ? subjects.filter((s) => s.classId === bankClassId)
    : subjects;

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#07090C] text-[#F3EEE3] font-bangla">
      {/* Screen Workspace (hidden during landscape slide print) */}
      <div className="no-print mx-auto max-w-[1440px] px-4 py-5 sm:px-6 space-y-4">
        {/* Studio Header Bar */}
        <Card className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#D4A853]/35 bg-[#141822] text-[#EAC779]">
                <Layers className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-display text-xl sm:text-2xl font-bold gold-text-gradient truncate">
                    অটো স্লাইড মেকার স্টুডিও
                  </h1>
                  <span className="text-xs font-mono text-[#D4A853] tabular-nums">
                    {toBanglaDigits(sourceMcqs.length)} MCQ → {toBanglaDigits(slides.length)} স্লাইড ({config.aspectRatio})
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#9DA6B5]">
                  ১০–১০০টি MCQ পেস্ট করুন বা প্রশ্নব্যাংক থেকে এনে মুহূর্তেই ক্লাসরুম-রেডি স্লাইড ও .PPTX তৈরি করুন।
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowImportModal(true)}
              >
                <Upload className="h-4 w-4" />
                <span>MCQ ইনপুট / প্রশ্নব্যাংক</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={handleSaveDeck}>
                <Save className="h-4 w-4" />
                <span>সংরক্ষণ</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsPresenting(true)}
              >
                <Maximize2 className="h-4 w-4" />
                <span>প্রেজেন্ট</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={handlePrintPdf}>
                <Printer className="h-4 w-4" />
                <span>PDF ডাউনলোড</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportPptx}
                disabled={isExportingPptx}
              >
                <Download className="h-4 w-4" />
                <span>{isExportingPptx ? 'তৈরি হচ্ছে...' : '.PPTX ডাউনলোড'}</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* 3-Pane Studio Editor */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {/* Left Rail: Slide Sorter */}
          <Card className="xl:col-span-3 p-3 flex flex-col max-h-[680px]">
            <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#D4A853]/20">
              <span className="text-sm font-bold text-[#EAC779] tabular-nums">
                স্লাইড তালিকা ({toBanglaDigits(slides.length)})
              </span>
              <button
                type="button"
                onClick={addCustomSlide}
                className="inline-flex items-center gap-1 rounded-md border border-[#D4A853]/35 bg-[#121620] px-2.5 py-1 text-xs font-semibold text-[#EAC779] hover:border-[#EAC779]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>যোগ</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {slides.map((s, idx) => {
                const isSelected = idx === activeIndex;
                const kindLabel =
                  s.kind === 'title'
                    ? 'শিরোনাম'
                    : s.kind === 'answer'
                    ? 'উত্তর'
                    : s.kind === 'summary'
                    ? 'সারসংক্ষেপ'
                    : 'প্রশ্ন';
                return (
                  <div
                    key={s.id}
                    className={`group rounded-lg border p-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#EAC779] bg-[#D4A853]/12'
                        : 'border-[#D4A853]/20 bg-[#0A0D12] hover:border-[#D4A853]/45'
                    }`}
                    onClick={() => setActiveIndex(idx)}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-mono font-bold text-[#EAC779] tabular-nums">
                        #{toBanglaDigits(idx + 1)} • {kindLabel}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSlide(idx, -1);
                          }}
                          disabled={idx === 0}
                          aria-label="উপরে নিন"
                          className="p-0.5 text-[#9DA6B5] hover:text-[#F5EFE2] disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSlide(idx, 1);
                          }}
                          disabled={idx === slides.length - 1}
                          aria-label="নিচে নিন"
                          className="p-0.5 text-[#9DA6B5] hover:text-[#F5EFE2] disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateSlide(idx);
                          }}
                          aria-label="অনুলিপি করুন"
                          className="p-0.5 text-[#9DA6B5] hover:text-[#EAC779]"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSlide(idx);
                          }}
                          aria-label="মুছে ফেলুন"
                          className="p-0.5 text-[#9DA6B5] hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className={`w-full overflow-hidden rounded border border-white/10 ${getAspectClass(config.aspectRatio)}`}>
                      <SlideCanvasView
                        slide={s}
                        config={config}
                        slideNumber={idx + 1}
                        totalSlides={slides.length}
                        compact
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Center Canvas: Live Aspect-Ratio Slide Preview */}
          <div className="xl:col-span-6 space-y-3">
            <Card className="p-4 sm:p-5 flex flex-col items-center justify-center bg-[#090B10]">
              <div className="w-full max-w-[780px] mx-auto">
                <div
                  className={`w-full overflow-hidden rounded-xl border border-[#D4A853]/35 shadow-2xl ${getAspectClass(
                    config.aspectRatio
                  )}`}
                >
                  {activeSlide && (
                    <SlideCanvasView
                      slide={activeSlide}
                      config={config}
                      slideNumber={activeIndex + 1}
                      totalSlides={slides.length}
                    />
                  )}
                </div>
              </div>

              {/* Navigation Bar below Canvas */}
              <div className="mt-4 w-full flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#D4A853]/15">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  disabled={activeIndex === 0}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>পূর্ববর্তী স্লাইড</span>
                </Button>

                <span className="text-sm font-mono text-[#EAC779] tabular-nums">
                  স্লাইড {toBanglaDigits(activeIndex + 1)} / {toBanglaDigits(slides.length)}
                </span>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveIndex((i) => Math.min(slides.length - 1, i + 1))}
                  disabled={activeIndex >= slides.length - 1}
                >
                  <span>পরবর্তী স্লাইড</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Panel: Slide Editor & Theme Customization */}
          <Card className="xl:col-span-3 p-4 max-h-[680px] overflow-y-auto space-y-4">
            <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-[#D4A853]/25 bg-[#090B10] p-1">
              <button
                type="button"
                onClick={() => setRightTab('design')}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors ${
                  rightTab === 'design'
                    ? 'bg-[#D4A853] text-[#090B0E]'
                    : 'text-[#B8C0CE] hover:text-[#F5EFE2]'
                }`}
              >
                <Palette className="h-3.5 w-3.5" />
                <span>ডিজাইন ও থিম</span>
              </button>
              <button
                type="button"
                onClick={() => setRightTab('edit')}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors ${
                  rightTab === 'edit'
                    ? 'bg-[#D4A853] text-[#090B0E]'
                    : 'text-[#B8C0CE] hover:text-[#F5EFE2]'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>স্লাইড সম্পাদনা</span>
              </button>
            </div>

            {rightTab === 'design' ? (
              <div className="space-y-4">
                <FormField label="প্রেজেন্টেশনের শিরোনাম" htmlFor="deck-title">
                  <Input
                    id="deck-title"
                    value={config.title}
                    onChange={(e) => applyConfigUpdate({ title: e.target.value })}
                  />
                </FormField>

                <FormField label="উপস্থাপক / প্রতিষ্ঠানের নাম" htmlFor="deck-presenter">
                  <Input
                    id="deck-presenter"
                    value={config.presenterName}
                    onChange={(e) => applyConfigUpdate({ presenterName: e.target.value })}
                  />
                </FormField>

                <div>
                  <p className="text-xs font-semibold text-[#EAC779] mb-2">প্রফেশনাল টেমপ্লেট</p>
                  <div className="grid grid-cols-1 gap-2">
                    {SLIDE_TEMPLATES.map((tpl) => {
                      const active = config.templateId === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleApplyTemplate(tpl.id)}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                            active
                              ? 'border-[#EAC779] bg-[#D4A853]/15'
                              : 'border-[#D4A853]/20 bg-[#0A0D12] hover:border-[#D4A853]/45'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="h-5 w-5 rounded border border-white/20 shrink-0"
                              style={{
                                background: `linear-gradient(135deg, ${tpl.bgColor} 55%, ${tpl.accentColor} 55%)`,
                              }}
                            />
                            <span className="text-xs font-semibold text-[#F5EFE2]">
                              {tpl.nameBn}
                            </span>
                          </div>
                          {active && <Check className="h-4 w-4 text-[#EAC779]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="color-bg" className="block text-[11px] text-[#B8C0CE] mb-1">
                      পটভূমি
                    </label>
                    <input
                      id="color-bg"
                      type="color"
                      value={config.customBgColor}
                      onChange={(e) => applyConfigUpdate({ customBgColor: e.target.value })}
                      className="h-9 w-full rounded border border-[#D4A853]/30 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label htmlFor="color-text" className="block text-[11px] text-[#B8C0CE] mb-1">
                      টেক্সট
                    </label>
                    <input
                      id="color-text"
                      type="color"
                      value={config.customTextColor}
                      onChange={(e) => applyConfigUpdate({ customTextColor: e.target.value })}
                      className="h-9 w-full rounded border border-[#D4A853]/30 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label htmlFor="color-accent" className="block text-[11px] text-[#B8C0CE] mb-1">
                      অ্যাকসেন্ট
                    </label>
                    <input
                      id="color-accent"
                      type="color"
                      value={config.customAccentColor}
                      onChange={(e) => applyConfigUpdate({ customAccentColor: e.target.value })}
                      className="h-9 w-full rounded border border-[#D4A853]/30 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>

                <FormField label="অ্যাসপেক্ট রেশিও" htmlFor="slide-ratio">
                  <Select
                    id="slide-ratio"
                    value={config.aspectRatio}
                    onChange={(e) =>
                      applyConfigUpdate({ aspectRatio: e.target.value as SlideAspectRatio })
                    }
                  >
                    <option value="16:9">16:9 ওয়াইডস্ক্রিন (স্ট্যান্ডার্ড)</option>
                    <option value="16:10">16:10 ল্যাপটপ ডিসপ্লে</option>
                    <option value="4:3">4:3 ক্লাসরুম প্রজেক্টর</option>
                  </Select>
                </FormField>

                <FormField label="অপশন লেআউট" htmlFor="slide-layout">
                  <Select
                    id="slide-layout"
                    value={config.layoutMode}
                    onChange={(e) =>
                      applyConfigUpdate({ layoutMode: e.target.value as SlideLayoutMode })
                    }
                  >
                    <option value="grid-2x2">২×২ গ্রিড লেআউট</option>
                    <option value="stacked">লম্বালম্বি তালিকা</option>
                    <option value="split-focus">স্প্লিট ফোকাস</option>
                  </Select>
                </FormField>

                <FormField label="ব্যাকগ্রাউন্ড প্যাটার্ন" htmlFor="slide-bg-style">
                  <Select
                    id="slide-bg-style"
                    value={config.backgroundStyle}
                    onChange={(e) =>
                      applyConfigUpdate({
                        backgroundStyle: e.target.value as SlideBackgroundStyle,
                      })
                    }
                  >
                    <option value="gradient">সফট গ্রেডিয়েন্ট গ্লো</option>
                    <option value="grid">একাডেমিক গ্রিড লাইন</option>
                    <option value="solid">সলিড মিনিমাল</option>
                  </Select>
                </FormField>

                <FormField label="টাইপোগ্রাফি ফন্ট" htmlFor="slide-font">
                  <Select
                    id="slide-font"
                    value={config.fontFamily}
                    onChange={(e) => applyConfigUpdate({ fontFamily: e.target.value })}
                  >
                    {SLIDE_FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="ফন্ট সাইজ স্কেল" htmlFor="slide-scale">
                  <Select
                    id="slide-scale"
                    value={config.typographyScale}
                    onChange={(e) =>
                      applyConfigUpdate({
                        typographyScale: e.target.value as SlideTypographyScale,
                      })
                    }
                  >
                    <option value="standard">স্ট্যান্ডার্ড</option>
                    <option value="classroom">বড় ক্লাসরুম প্রজেকশন</option>
                    <option value="compact">কম্প্যাক্ট</option>
                  </Select>
                </FormField>

                <FormField label="উত্তর স্লাইড বিন্যাস" htmlFor="slide-reveal-mode">
                  <Select
                    id="slide-reveal-mode"
                    value={config.answerRevealMode}
                    onChange={(e) =>
                      applyConfigUpdate(
                        { answerRevealMode: e.target.value as AnswerRevealMode },
                        true
                      )
                    }
                  >
                    <option value="after-each">প্রতি প্রশ্নের পর উত্তর স্লাইড</option>
                    <option value="at-end">সব প্রশ্নের শেষে একসাথে উত্তর স্লাইড</option>
                    <option value="question-only">শুধুমাত্র প্রশ্ন স্লাইড</option>
                  </Select>
                </FormField>

                <div className="space-y-2 pt-1 border-t border-[#D4A853]/15 text-xs">
                  <label className="flex items-center gap-2 text-[#E5E0D5] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeTitleSlide}
                      onChange={(e) =>
                        applyConfigUpdate({ includeTitleSlide: e.target.checked }, true)
                      }
                      className="accent-[#D4A853]"
                    />
                    <span>শিরোনাম (Title) স্লাইড অন্তর্ভুক্ত করুন</span>
                  </label>
                  <label className="flex items-center gap-2 text-[#E5E0D5] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeSummarySlide}
                      onChange={(e) =>
                        applyConfigUpdate({ includeSummarySlide: e.target.checked }, true)
                      }
                      className="accent-[#D4A853]"
                    />
                    <span>সারসংক্ষেপ (Summary) স্লাইড অন্তর্ভুক্ত করুন</span>
                  </label>
                </div>
              </div>
            ) : activeSlide ? (
              <div className="space-y-3.5">
                <FormField label="স্লাইড শিরোনাম" htmlFor="ed-title">
                  <Input
                    id="ed-title"
                    value={activeSlide.title}
                    onChange={(e) => updateActiveSlide({ title: e.target.value })}
                  />
                </FormField>

                {(activeSlide.kind === 'title' || activeSlide.kind === 'summary') && (
                  <FormField label="উপ-শিরোনাম" htmlFor="ed-sub">
                    <Input
                      id="ed-sub"
                      value={activeSlide.subtitle ?? ''}
                      onChange={(e) => updateActiveSlide({ subtitle: e.target.value })}
                    />
                  </FormField>
                )}

                <FormField
                  label={
                    activeSlide.kind === 'title' || activeSlide.kind === 'summary'
                      ? 'বিবরণ টেক্সট'
                      : 'প্রশ্ন / মূল বক্তব্য'
                  }
                  htmlFor="ed-prompt"
                >
                  <Textarea
                    id="ed-prompt"
                    rows={3}
                    value={activeSlide.prompt ?? ''}
                    onChange={(e) => updateActiveSlide({ prompt: e.target.value })}
                  />
                </FormField>

                {activeSlide.options && activeSlide.options.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#EAC779]">
                      বিকল্পসমূহ ও সঠিক উত্তর নির্বাচন
                    </p>
                    {activeSlide.options.map((opt, oi) => (
                      <div key={`${opt.label}-${oi}`} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct-option-edit"
                          checked={opt.isCorrect}
                          aria-label={`সঠিক উত্তর ${opt.label}`}
                          onChange={() => {
                            const updatedOpts = activeSlide.options!.map((o, idx) => ({
                              ...o,
                              isCorrect: idx === oi,
                            }));
                            updateActiveSlide({ options: updatedOpts });
                          }}
                          className="accent-emerald-400 shrink-0"
                        />
                        <span className="text-xs font-bold text-[#D4A853] w-5 shrink-0">
                          {opt.label})
                        </span>
                        <Input
                          value={opt.text}
                          onChange={(e) => {
                            const updatedOpts = activeSlide.options!.map((o, idx) =>
                              idx === oi ? { ...o, text: e.target.value } : o
                            );
                            updateActiveSlide({ options: updatedOpts });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {activeSlide.kind === 'answer' && (
                  <FormField label="উত্তরের ব্যাখ্যা" htmlFor="ed-exp">
                    <Textarea
                      id="ed-exp"
                      rows={2}
                      value={activeSlide.explanation ?? ''}
                      onChange={(e) => updateActiveSlide({ explanation: e.target.value })}
                    />
                  </FormField>
                )}

                <FormField label="স্পিকার নোটস (PPTX নোট)" htmlFor="ed-notes">
                  <Textarea
                    id="ed-notes"
                    rows={2}
                    value={activeSlide.notes ?? ''}
                    onChange={(e) => updateActiveSlide({ notes: e.target.value })}
                  />
                </FormField>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      {/* MCQ Paste / Question Bank Import Modal */}
      {showImportModal && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="MCQ ইনপুট ও প্রশ্নব্যাংক আমদানি"
        >
          <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#D4A853]/25 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-[#EAC779]" />
                <h2 className="text-lg font-bold text-[#F5EFE2]">
                  ১০–১০০টি MCQ থেকে স্বয়ংক্রিয় স্লাইড তৈরি
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                aria-label="বন্ধ করুন"
                className="rounded-lg p-1.5 text-[#9DA6B5] hover:bg-white/5 hover:text-[#F5EFE2]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 pt-3 flex gap-2 border-b border-[#D4A853]/15">
              <button
                type="button"
                onClick={() => setImportMode('paste')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                  importMode === 'paste'
                    ? 'border-[#EAC779] text-[#EAC779]'
                    : 'border-transparent text-[#9DA6B5] hover:text-[#F5EFE2]'
                }`}
              >
                টেক্সট / JSON পেস্ট করুন
              </button>
              <button
                type="button"
                onClick={() => setImportMode('bank')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                  importMode === 'bank'
                    ? 'border-[#EAC779] text-[#EAC779]'
                    : 'border-transparent text-[#9DA6B5] hover:text-[#F5EFE2]'
                }`}
              >
                <BookOpen className="inline h-4 w-4 mr-1.5" />
                প্রশ্নব্যাংক থেকে আনুন
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {importMode === 'paste' ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#B8C0CE]">
                    <span>
                      নম্বরসহ প্রশ্ন (১. ...), বিকল্প (ক/খ/গ/ঘ বা A/B/C/D) এবং <strong>উত্তর:</strong> বা সঠিক বিকল্পে <strong>*</strong> ব্যবহার করুন।
                    </span>
                    <button
                      type="button"
                      onClick={() => setRawMcqText(getSampleRawMcqText12())}
                      className="font-semibold text-[#EAC779] hover:underline"
                    >
                      ১২টি নমুনা MCQ রিসেট করুন
                    </button>
                  </div>
                  <Textarea
                    rows={12}
                    value={rawMcqText}
                    onChange={(e) => setRawMcqText(e.target.value)}
                    placeholder={`1. বাংলাদেশের রাজধানী কোনটি?\nক) চট্টগ্রাম\nখ) ঢাকা\nগ) রাজশাহী\nঘ) খুলনা\nউত্তর: খ\nব্যাখ্যা: ঢাকা বাংলাদেশের রাজধানী।`}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D4A853]/25 bg-[#090B10] px-4 py-2.5 text-sm">
                    <span className="text-[#E5E0D5] tabular-nums">
                      শনাক্তকৃত MCQ:{' '}
                      <strong className="text-[#EAC779]">
                        {toBanglaDigits(parsedPreview.length)}টি
                      </strong>
                      {parsedPreview.length > 0 && parsedPreview.length < 10 && (
                        <span className="ml-2 text-xs text-amber-300">
                          (সুপারিশ: ১০–১০০টি MCQ)
                        </span>
                      )}
                    </span>
                    <Button onClick={handleGenerateFromPaste}>
                      <Sparkles className="h-4 w-4" />
                      <span>স্লাইড তৈরি করুন</span>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-[#B8C0CE]">
                    প্রশ্নব্যাংকে সংরক্ষিত প্রকাশিত বহুনির্বাচনি (MCQ) প্রশ্নগুলো থেকে সরাসরি প্রেজেন্টেশন তৈরি করুন।
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField label="শ্রেণি" htmlFor="imp-class">
                      <Select
                        id="imp-class"
                        value={bankClassId}
                        onChange={(e) => {
                          setBankClassId(e.target.value);
                          setBankSubjectId('');
                        }}
                      >
                        <option value="">সকল শ্রেণি</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nameBn}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="বিষয়" htmlFor="imp-sub">
                      <Select
                        id="imp-sub"
                        value={bankSubjectId}
                        onChange={(e) => setBankSubjectId(e.target.value)}
                      >
                        <option value="">সকল বিষয়</option>
                        {filteredBankSubjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nameBn}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="সর্বোচ্চ MCQ সংখ্যা (১০–১০০)" htmlFor="imp-limit">
                      <Input
                        id="imp-limit"
                        type="number"
                        min={1}
                        max={100}
                        value={bankLimit}
                        onChange={(e) => setBankLimit(Number(e.target.value) || 12)}
                      />
                    </FormField>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleImportFromBank}>
                      <BookOpen className="h-4 w-4" />
                      <span>প্রশ্নব্যাংক থেকে স্লাইড তৈরি করুন</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Fullscreen Presenter Overlay */}
      {isPresenting && activeSlide && (
        <div className="no-print fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-6xl">
            <div className={`w-full overflow-hidden rounded-xl shadow-2xl ${getAspectClass(config.aspectRatio)}`}>
              <SlideCanvasView
                slide={activeSlide}
                config={config}
                slideNumber={activeIndex + 1}
                totalSlides={slides.length}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-[#E5E0D5]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              disabled={activeIndex === 0}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>পূর্ববর্তী</span>
            </Button>
            <span className="font-mono tabular-nums">
              {toBanglaDigits(activeIndex + 1)} / {toBanglaDigits(slides.length)}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveIndex((i) => Math.min(slides.length - 1, i + 1))}
              disabled={activeIndex >= slides.length - 1}
            >
              <span>পরবর্তী</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsPresenting(false)}
            >
              <Minimize2 className="h-4 w-4" />
              <span>বন্ধ করুন (Esc)</span>
            </Button>
          </div>
        </div>
      )}

      {/* Print-Only Landscape Slide Deck (for Browser Save-as-PDF) */}
      <div className="hidden print:block print-slide-deck">
        {slides.map((s, idx) => (
          <div
            key={`print-${s.id}`}
            className="print-slide-page w-full h-screen page-break-after-always overflow-hidden"
          >
            <SlideCanvasView
              slide={s}
              config={config}
              slideNumber={idx + 1}
              totalSlides={slides.length}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
