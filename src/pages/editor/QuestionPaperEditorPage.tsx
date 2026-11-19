import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  FileText,
  Grid,
  Palette,
  Plus,
  Printer,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button, Card, FormField, Input, Select, Textarea } from '../../components/ui/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { DEFAULT_PAPER_DESIGN, PAPER_TEMPLATES } from '../../data/platformSeedData';
import { QUESTION_TYPE_LABELS_BN, getDifficultyLabelBn, toBanglaDigits } from '../../lib/bn';
import { generatePaperDocxBlob, triggerBlobDownload } from '../../lib/docxExport';
import { calculatePaperTotalMarks } from '../../lib/rules';
import { createDefaultOmrConfig, platformService } from '../../services/platformService';
import { questionBankService } from '../../services/questionBankService';
import type {
  OmrSheetConfig,
  PaperDesignConfig,
  QuestionDifficulty,
  QuestionPaper,
  QuestionPaperItem,
  QuestionTypeCode,
} from '../../types/domain';

type EditorTab = 'info' | 'design' | 'questions' | 'omr';
type PreviewMode = 'desktop' | 'print' | 'pdf';

function OmrSheetPage({
  paper,
  omr,
  design,
}: {
  paper: QuestionPaper;
  omr: OmrSheetConfig;
  design: PaperDesignConfig;
}) {
  const letters =
    omr.optionStyle === 'bn'
      ? ['ক', 'খ', 'গ', 'ঘ', 'ঙ'].slice(0, omr.optionsCount)
      : ['A', 'B', 'C', 'D', 'E'].slice(0, omr.optionsCount);
  const totalQ = Math.max(10, Math.min(100, omr.questionCount));
  const perCol = Math.ceil(totalQ / 4);
  const columns = [0, 1, 2, 3].map((colIdx) =>
    Array.from({ length: perCol }, (_, rowIdx) => colIdx * perCol + rowIdx + 1).filter(
      (n) => n <= totalQ
    )
  );

  return (
    <div
      className="print-paper-sheet print-page-break mt-8 rounded-xl bg-white text-slate-900 shadow-lg border border-slate-300"
      style={{
        padding: `${design.pageMarginMm}mm`,
        fontFamily: design.bengaliFont,
      }}
    >
      <div className="border-2 border-slate-900 p-4 space-y-4">
        {/* OMR Header */}
        <div className="text-center border-b-2 border-slate-900 pb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
            OPTICAL MARK RECOGNITION (OMR) ANSWER SHEET
          </p>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">{paper.schoolName}</h2>
          <p className="text-sm font-semibold text-slate-700">
            {paper.examName} — {paper.title}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            কালো কালির বলপেন দিয়ে সঠিক বৃত্তটি সম্পূর্ণ ভরাট করো।
          </p>
        </div>

        {/* Roll / Registration / Set Code Grids */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {omr.includeRollGrid && (
            <div className="border border-slate-400 p-2 rounded">
              <p className="font-bold text-center border-b border-slate-300 pb-1 mb-2">
                রোল নম্বর (Roll No)
              </p>
              <div className="grid grid-cols-6 gap-1 mb-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-5 border border-slate-500 rounded-xs" />
                ))}
              </div>
              <div className="grid grid-cols-6 gap-1 text-[9px] text-center">
                {Array.from({ length: 6 }).map((_, col) => (
                  <div key={col} className="space-y-0.5">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                      <div
                        key={digit}
                        className="mx-auto flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-600 leading-none"
                      >
                        {toBanglaDigits(digit)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {omr.includeRegGrid && (
            <div className="border border-slate-400 p-2 rounded">
              <p className="font-bold text-center border-b border-slate-300 pb-1 mb-2">
                রেজিস্ট্রেশন নম্বর (Reg. No)
              </p>
              <div className="grid grid-cols-6 gap-1 mb-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-5 border border-slate-500 rounded-xs" />
                ))}
              </div>
              <div className="grid grid-cols-6 gap-1 text-[9px] text-center">
                {Array.from({ length: 6 }).map((_, col) => (
                  <div key={col} className="space-y-0.5">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                      <div
                        key={digit}
                        className="mx-auto flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-600 leading-none"
                      >
                        {toBanglaDigits(digit)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-slate-400 p-2 rounded flex flex-col justify-between gap-2">
            <div>
              <p className="font-bold text-center border-b border-slate-300 pb-1 mb-2">
                পরীক্ষার্থীর তথ্য
              </p>
              <div className="space-y-2 text-[11px]">
                <p>নাম: ________________________</p>
                <p>বিষয়: {paper.subjectLabel || paper.subjectId}</p>
                <p>স্বাক্ষর: _____________________</p>
              </div>
            </div>
            {omr.includeSetCode && (
              <div className="border-t border-slate-300 pt-2">
                <p className="font-bold text-center mb-1.5">প্রশ্নপত্রের সেট কোড</p>
                <div className="flex items-center justify-center gap-3">
                  {(omr.optionStyle === 'bn' ? ['ক', 'খ', 'গ', 'ঘ'] : ['A', 'B', 'C', 'D']).map(
                    (code) => (
                      <div key={code} className="flex flex-col items-center gap-0.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-700 text-[10px] font-bold">
                          {code}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Answer Bubbles Grid (4 Columns) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {columns.map((nums, cIdx) => (
            <div key={cIdx} className="border border-slate-300 rounded p-2 space-y-1.5">
              {nums.map((num) => (
                <div key={num} className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="w-6 font-bold text-right tabular-nums text-slate-700">
                    {toBanglaDigits(num)}.
                  </span>
                  <div className="flex items-center gap-1.5">
                    {letters.map((lbl) => (
                      <span
                        key={lbl}
                        className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full border border-slate-700 text-[9px] font-semibold"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function QuestionPaperEditorPage() {
  const { paperId } = useParams<{ paperId: string }>();
  const { user } = useAuth();
  const { pushToast } = useToast();

  const [paper, setPaper] = useState<QuestionPaper | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('info');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [exportingDocx, setExportingDocx] = useState(false);

  const catalogue = questionBankService.getAcademicCatalogue();

  useEffect(() => {
    if (!paperId) return;
    const loaded = platformService.getPaperForEditor(paperId, user);
    if (loaded) {
      setPaper({
        ...loaded,
        designConfig: { ...DEFAULT_PAPER_DESIGN, ...(loaded.designConfig || {}) },
        omrConfig: {
          ...createDefaultOmrConfig(loaded.items.length || 30),
          ...(loaded.omrConfig || {}),
        },
      });
      if (loaded.items[0]) setSelectedItemId(loaded.items[0].id);
    }
  }, [paperId, user]);

  const design: PaperDesignConfig = useMemo(
    () => ({ ...DEFAULT_PAPER_DESIGN, ...(paper?.designConfig || {}) }),
    [paper?.designConfig]
  );

  const omr: OmrSheetConfig = useMemo(
    () => ({
      ...createDefaultOmrConfig(paper?.items.length || 30),
      ...(paper?.omrConfig || {}),
    }),
    [paper?.omrConfig, paper?.items.length]
  );

  const totalMarks = useMemo(
    () => (paper ? calculatePaperTotalMarks(paper.items) : 0),
    [paper]
  );

  const selectedItem = useMemo(
    () => paper?.items.find((i) => i.id === selectedItemId) || paper?.items[0] || null,
    [paper, selectedItemId]
  );

  if (!paper) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center space-y-4 font-bangla">
        <h1 className="font-display text-2xl font-bold gold-text-gradient">প্রশ্নপত্র খুঁজে পাওয়া যায়নি</h1>
        <p className="text-sm text-[#B8C0CE]">
          একাডেমিক অথবা ভর্তি পরীক্ষা বিল্ডার থেকে প্রশ্ন নির্বাচন করে "প্রিভিউ এডিটর" খুলুন।
        </p>
        <div className="flex justify-center gap-3">
          <Link to="/academic" className="rounded-lg gold-btn px-4 py-2 text-sm font-bold">
            একাডেমিক বিল্ডার
          </Link>
          <Link to="/admission" className="rounded-lg gold-outline-btn px-4 py-2 text-sm font-semibold">
            ভর্তি পরীক্ষা বিল্ডার
          </Link>
        </div>
      </div>
    );
  }

  const resolvedClassName =
    paper.classLabel ||
    catalogue.classes.find((c) => c.id === paper.classId)?.nameBn ||
    paper.classId;
  const resolvedSubjectName =
    paper.subjectLabel ||
    catalogue.subjects.find((s) => s.id === paper.subjectId)?.nameBn ||
    paper.subjectId;

  const updatePaper = (patch: Partial<QuestionPaper>) => {
    setPaper((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateDesign = (patch: Partial<PaperDesignConfig>) => {
    setPaper((prev) =>
      prev
        ? {
            ...prev,
            designConfig: { ...DEFAULT_PAPER_DESIGN, ...(prev.designConfig || {}), ...patch },
          }
        : prev
    );
  };

  const updateOmr = (patch: Partial<OmrSheetConfig>) => {
    setPaper((prev) =>
      prev
        ? {
            ...prev,
            omrConfig: {
              ...createDefaultOmrConfig(prev.items.length || 30),
              ...(prev.omrConfig || {}),
              ...patch,
            },
          }
        : prev
    );
  };

  const updateItem = (itemId: string, updater: (it: QuestionPaperItem) => QuestionPaperItem) => {
    setPaper((prev) =>
      prev ? { ...prev, items: prev.items.map((it) => (it.id === itemId ? updater(it) : it)) } : prev
    );
  };

  const handleDuplicateItem = (item: QuestionPaperItem) => {
    const copy: QuestionPaperItem = {
      ...item,
      id: `pi-copy-${Date.now().toString(36)}`,
      snapshot: {
        ...item.snapshot,
        options: item.snapshot.options?.map((o) => ({ ...o })),
        subParts: item.snapshot.subParts?.map((sp) => ({ ...sp })),
      },
    };
    const idx = paper.items.findIndex((i) => i.id === item.id);
    const next = [...paper.items];
    next.splice(idx + 1, 0, copy);
    updatePaper({ items: next.map((it, i) => ({ ...it, orderIndex: i })) });
    setSelectedItemId(copy.id);
    pushToast({ title: 'প্রশ্নটি ডুপ্লিকেট করা হয়েছে', variant: 'info' });
  };

  const handleDeleteItem = (itemId: string) => {
    const next = paper.items
      .filter((i) => i.id !== itemId)
      .map((it, i) => ({ ...it, orderIndex: i }));
    updatePaper({ items: next });
    setSelectedItemId(next[0]?.id || null);
    pushToast({ title: 'প্রশ্নটি মুছে ফেলা হয়েছে', variant: 'info' });
  };

  const handleMoveItem = (index: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= paper.items.length) return;
    const copy = [...paper.items];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    updatePaper({ items: copy.map((it, i) => ({ ...it, orderIndex: i })) });
  };

  const handleSavePaper = () => {
    const saved = platformService.saveWorkspacePaper(paper);
    setPaper(saved);
    pushToast({ title: 'প্রশ্নপত্র ও ডিজাইন সংরক্ষিত হয়েছে', variant: 'success' });
  };

  const handleExportDocx = async () => {
    setExportingDocx(true);
    try {
      const blob = await generatePaperDocxBlob(
        paper,
        resolvedClassName,
        resolvedSubjectName,
        showAnswerKey
      );
      const safeName = `${paper.title.replace(/[^\w\u0980-\u09FF-]+/g, '_')}.docx`;
      triggerBlobDownload(blob, safeName);
      pushToast({ title: '.DOCX ফাইল ডাউনলোড শুরু হয়েছে', variant: 'success' });
    } catch {
      pushToast({ title: '.DOCX এক্সপোর্ট করতে সমস্যা হয়েছে', variant: 'error' });
    } finally {
      setExportingDocx(false);
    }
  };

  const handlePrintOrPdf = () => {
    window.print();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updatePaper({ schoolLogoDataUrl: String(reader.result || '') });
    reader.readAsDataURL(file);
  };

  const handleQuestionImageUpload = (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateItem(itemId, (it) => ({
        ...it,
        snapshot: { ...it.snapshot, imageUrl: String(reader.result || '') },
      }));
    };
    reader.readAsDataURL(file);
  };

  const borderClass =
    design.borderStyle === 'double'
      ? 'border-4 border-double border-slate-800'
      : design.borderStyle === 'single'
        ? 'border border-slate-400'
        : design.borderStyle === 'accent'
          ? 'border-2 border-amber-700'
          : 'border border-slate-200';

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 space-y-5 font-bangla">
      {/* Top Toolbar (hidden on print) */}
      <Card className="p-3.5 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={paper.domain === 'admission' ? '/admission' : '/academic'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4A853]/30 px-3 py-1.5 text-xs font-semibold text-[#EAC779] hover:border-[#EAC779] whitespace-nowrap"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            বিল্ডারে ফিরুন
          </Link>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[#F5EFE2] truncate">
              ডকুমেন্ট প্রশ্নপত্র এডিটর — {paper.title}
            </h1>
            <p className="text-xs text-[#9DA6B5] tabular-nums">
              {toBanglaDigits(paper.items.length)}টি প্রশ্ন · মোট {toBanglaDigits(totalMarks)} নম্বর ·{' '}
              {toBanglaDigits(paper.durationMinutes)} মিনিট
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preview Mode Switcher */}
          <div className="inline-flex rounded-lg border border-[#D4A853]/30 bg-[#0A0D12] p-0.5 text-xs">
            {(
              [
                { id: 'desktop', label: 'ডেস্কটপ' },
                { id: 'print', label: 'প্রিন্ট প্রিভিউ' },
                { id: 'pdf', label: 'PDF ভিউ' },
              ] as Array<{ id: PreviewMode; label: string }>
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPreviewMode(m.id)}
                className={`rounded-md px-2.5 py-1 font-semibold cursor-pointer ${
                  previewMode === m.id
                    ? 'bg-[#D4A853] text-[#090B0E]'
                    : 'text-[#B8C0CE] hover:text-[#F5EFE2]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <Button variant="secondary" size="sm" onClick={() => setShowAnswerKey((v) => !v)}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {showAnswerKey ? 'উত্তরপত্র লুকান' : 'উত্তরপত্র দেখুন'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSavePaper}>
            <Save className="h-3.5 w-3.5" />
            সংরক্ষণ
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportDocx} disabled={exportingDocx}>
            <Download className="h-3.5 w-3.5" />
            {exportingDocx ? 'তৈরি হচ্ছে...' : '.DOCX ডাউনলোড'}
          </Button>
          <Button size="sm" onClick={handlePrintOrPdf}>
            <Printer className="h-3.5 w-3.5" />
            প্রিন্ট / PDF
          </Button>
        </div>
      </Card>

      {/* Main Split: Left Customization Studio | Right Live A4 Document Canvas */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
        {/* LEFT STUDIO CONTROLS (Hidden on Print) */}
        <aside className="xl:col-span-5 space-y-4 no-print">
          {/* 4 Studio Tabs */}
          <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-[#D4A853]/25 bg-[#0A0D12] p-1.5">
            {(
              [
                { id: 'info', label: 'তথ্য', icon: <FileText className="h-3.5 w-3.5" /> },
                { id: 'design', label: 'ডিজাইন', icon: <Palette className="h-3.5 w-3.5" /> },
                { id: 'questions', label: 'প্রশ্ন', icon: <Edit3 className="h-3.5 w-3.5" /> },
                { id: 'omr', label: 'OMR', icon: <Grid className="h-3.5 w-3.5" /> },
              ] as Array<{ id: EditorTab; label: string; icon: React.ReactNode }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold cursor-pointer transition-colors ${
                  activeTab === tab.id
                    ? 'gold-btn'
                    : 'text-[#B8C0CE] hover:bg-white/5 hover:text-[#F5EFE2]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: Paper Info Customization */}
          {activeTab === 'info' && (
            <Card className="p-5 space-y-4">
              <h2 className="text-base font-bold text-[#EAC779]">প্রশ্নপত্রের তথ্য ও হেডার/ফুটার</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="প্রশ্নপত্রের শিরোনাম">
                  <Input
                    value={paper.title}
                    onChange={(e) => updatePaper({ title: e.target.value })}
                  />
                </FormField>
                <FormField label="পরীক্ষার নাম">
                  <Input
                    value={paper.examName}
                    onChange={(e) => updatePaper({ examName: e.target.value })}
                  />
                </FormField>
              </div>
              <FormField label="প্রতিষ্ঠানের নাম">
                <Input
                  value={paper.schoolName}
                  onChange={(e) => updatePaper({ schoolName: e.target.value })}
                />
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField label={paper.domain === 'admission' ? 'ভর্তি বিভাগ' : 'শ্রেণি'}>
                  <Input
                    value={resolvedClassName}
                    onChange={(e) => updatePaper({ classLabel: e.target.value })}
                  />
                </FormField>
                <FormField label="বিষয়">
                  <Input
                    value={resolvedSubjectName}
                    onChange={(e) => updatePaper({ subjectLabel: e.target.value })}
                  />
                </FormField>
                <FormField label="সময় (মিনিট)">
                  <Input
                    type="number"
                    min={10}
                    max={300}
                    value={paper.durationMinutes}
                    onChange={(e) =>
                      updatePaper({ durationMinutes: Math.max(10, Number(e.target.value) || 60) })
                    }
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="উপরের হেডার বার্তা (ঐচ্ছিক)">
                  <Input
                    value={paper.headerText || ''}
                    onChange={(e) => updatePaper({ headerText: e.target.value })}
                    placeholder="যেমন: বিসমিল্লাহির রাহমানির রাহিম / সেট কোড: ক"
                  />
                </FormField>
                <FormField label="নিচের ফুটার বার্তা (ঐচ্ছিক)">
                  <Input
                    value={paper.footerText || ''}
                    onChange={(e) => updatePaper({ footerText: e.target.value })}
                    placeholder="যেমন: শুভকামনা — সকল প্রশ্নের উত্তর পরিষ্কার করে লেখো"
                  />
                </FormField>
              </div>
              <FormField label="পরীক্ষার নির্দেশনাবলি">
                <Textarea
                  rows={2}
                  value={paper.instructions}
                  onChange={(e) => updatePaper({ instructions: e.target.value })}
                />
              </FormField>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 rounded-lg border border-[#D4A853]/35 bg-[#0A0D12] px-3 py-1.5 text-xs font-semibold text-[#EAC779] cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>প্রতিষ্ঠানের লোগো</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                <label className="flex items-center gap-2 text-xs text-[#C2C8D3] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paper.includeStudentFields}
                    onChange={(e) => updatePaper({ includeStudentFields: e.target.checked })}
                    className="accent-[#D4A853]"
                  />
                  <span>শিক্ষার্থীর নাম ও রোল ঘর দেখান</span>
                </label>
              </div>
            </Card>
          )}

          {/* TAB 2: Design & Template Customization */}
          {activeTab === 'design' && (
            <Card className="p-5 space-y-4">
              <h2 className="text-base font-bold text-[#EAC779]">টেমপ্লেট ও ডকুমেন্ট ডিজাইন</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PAPER_TEMPLATES.map((tpl) => {
                  const active = design.templateId === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => updateDesign(tpl.preset)}
                      className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                        active
                          ? 'border-[#EAC779] bg-[#D4A853]/15'
                          : 'border-[#D4A853]/20 bg-[#0A0D12] hover:border-[#D4A853]/45'
                      }`}
                    >
                      <p className="text-xs font-bold text-[#F5EFE2]">{tpl.nameBn}</p>
                      <p className="mt-1 text-[11px] text-[#9DA6B5] leading-snug">{tpl.descriptionBn}</p>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="বাংলা ফন্ট">
                  <Select
                    value={design.bengaliFont}
                    onChange={(e) => updateDesign({ bengaliFont: e.target.value })}
                  >
                    <option value='"Noto Serif Bengali", serif'>Noto Serif Bengali (ক্লাসিক)</option>
                    <option value='"Hind Siliguri", sans-serif'>Hind Siliguri (মডার্ন)</option>
                    <option value='"Tiro Bangla", serif'>Tiro Bangla (বইয়ের ফন্ট)</option>
                  </Select>
                </FormField>
                <FormField label="ইংরেজি ফন্ট">
                  <Select
                    value={design.englishFont}
                    onChange={(e) => updateDesign({ englishFont: e.target.value })}
                  >
                    <option value='"Plus Jakarta Sans", sans-serif'>Plus Jakarta Sans</option>
                    <option value='"Outfit", sans-serif'>Outfit</option>
                    <option value='Georgia, serif'>Georgia Serif</option>
                  </Select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <FormField label="ফন্ট (px)">
                  <Input
                    type="number"
                    min={11}
                    max={22}
                    value={design.fontSizePx}
                    onChange={(e) => updateDesign({ fontSizePx: Number(e.target.value) || 14 })}
                  />
                </FormField>
                <FormField label="হেডিং (px)">
                  <Input
                    type="number"
                    min={16}
                    max={32}
                    value={design.headingSizePx}
                    onChange={(e) => updateDesign({ headingSizePx: Number(e.target.value) || 22 })}
                  />
                </FormField>
                <FormField label="লাইন স্পেস">
                  <Input
                    type="number"
                    step={0.1}
                    min={1.2}
                    max={2.4}
                    value={design.lineHeight}
                    onChange={(e) => updateDesign({ lineHeight: Number(e.target.value) || 1.65 })}
                  />
                </FormField>
                <FormField label="মার্জিন (mm)">
                  <Input
                    type="number"
                    min={8}
                    max={25}
                    value={design.pageMarginMm}
                    onChange={(e) => updateDesign({ pageMarginMm: Number(e.target.value) || 14 })}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="টেক্সট অ্যালাইনমেন্ট">
                  <Select
                    value={design.textAlign}
                    onChange={(e) =>
                      updateDesign({ textAlign: e.target.value as PaperDesignConfig['textAlign'] })
                    }
                  >
                    <option value="left">বাম দিকে (Left)</option>
                    <option value="justify">উভয় দিকে সমান (Justify)</option>
                    <option value="center">মাঝে (Center)</option>
                  </Select>
                </FormField>
                <FormField label="বর্ডার শৈলী">
                  <Select
                    value={design.borderStyle}
                    onChange={(e) =>
                      updateDesign({
                        borderStyle: e.target.value as PaperDesignConfig['borderStyle'],
                      })
                    }
                  >
                    <option value="double">ডাবল বর্ডার (বোর্ড স্টাইল)</option>
                    <option value="single">একক সূক্ষ্ম বর্ডার</option>
                    <option value="accent">সোনালি অ্যাকসেন্ট বর্ডার</option>
                    <option value="none">বর্ডার ছাড়া</option>
                  </Select>
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FormField label="পৃষ্ঠার রঙ">
                  <input
                    type="color"
                    value={design.backgroundColor}
                    onChange={(e) => updateDesign({ backgroundColor: e.target.value })}
                    className="h-9 w-full rounded border border-[#D4A853]/30 bg-transparent cursor-pointer"
                  />
                </FormField>
                <FormField label="লেখার রঙ">
                  <input
                    type="color"
                    value={design.textColor}
                    onChange={(e) => updateDesign({ textColor: e.target.value })}
                    className="h-9 w-full rounded border border-[#D4A853]/30 bg-transparent cursor-pointer"
                  />
                </FormField>
                <FormField label="হেডার রঙ">
                  <input
                    type="color"
                    value={design.headerColor}
                    onChange={(e) => updateDesign({ headerColor: e.target.value })}
                    className="h-9 w-full rounded border border-[#D4A853]/30 bg-transparent cursor-pointer"
                  />
                </FormField>
              </div>
            </Card>
          )}

          {/* TAB 3: Per-Question Inline Editor */}
          {activeTab === 'questions' && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#EAC779]">প্রশ্নভিত্তিক সম্পাদনা</h2>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const fresh: QuestionPaperItem = {
                      id: `pi-custom-${Date.now().toString(36)}`,
                      sourceQuestionId: `custom-${Date.now().toString(36)}`,
                      orderIndex: paper.items.length,
                      customMarks: 1,
                      snapshot: {
                        classId: paper.classId,
                        subjectId: paper.subjectId,
                        chapterId: 'custom',
                        questionTypeCode: 'mcq',
                        difficulty: 'medium',
                        language: 'bn',
                        prompt: 'নতুন কাস্টম প্রশ্ন এখানে লিখুন...',
                        options: [
                          { id: 'o1', label: 'ক', text: 'অপশন ১', isCorrect: true },
                          { id: 'o2', label: 'খ', text: 'অপশন ২', isCorrect: false },
                          { id: 'o3', label: 'গ', text: 'অপশন ৩', isCorrect: false },
                          { id: 'o4', label: 'ঘ', text: 'অপশন ৪', isCorrect: false },
                        ],
                        correctAnswerText: 'ক) অপশন ১',
                      },
                    };
                    updatePaper({ items: [...paper.items, fresh] });
                    setSelectedItemId(fresh.id);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  নতুন প্রশ্ন
                </Button>
              </div>

              {/* Compact Question Selector List */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {paper.items.map((it, idx) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => setSelectedItemId(it.id)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold shrink-0 cursor-pointer tabular-nums ${
                      selectedItem?.id === it.id
                        ? 'border-[#EAC779] bg-[#D4A853] text-[#090B0E]'
                        : 'border-[#D4A853]/25 bg-[#0A0D12] text-[#C2C8D3]'
                    }`}
                  >
                    #{it.customNumber || toBanglaDigits(idx + 1)}
                  </button>
                ))}
              </div>

              {selectedItem && (
                <div className="space-y-3.5 border-t border-[#D4A853]/15 pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#D4A853]">
                      নির্বাচিত প্রশ্ন সম্পাদনা
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleMoveItem(
                            paper.items.findIndex((i) => i.id === selectedItem.id),
                            'up'
                          )
                        }
                        title="উপরে নিন"
                        className="rounded border border-[#D4A853]/25 p-1 text-[#C2C8D3] hover:text-[#EAC779] cursor-pointer"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleMoveItem(
                            paper.items.findIndex((i) => i.id === selectedItem.id),
                            'down'
                          )
                        }
                        title="নিচে নিন"
                        className="rounded border border-[#D4A853]/25 p-1 text-[#C2C8D3] hover:text-[#EAC779] cursor-pointer"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateItem(selectedItem)}
                        title="ডুপ্লিকেট করুন"
                        className="rounded border border-[#D4A853]/25 p-1 text-[#C2C8D3] hover:text-[#EAC779] cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(selectedItem.id)}
                        title="মুছুন"
                        className="rounded border border-rose-500/30 p-1 text-rose-300 hover:bg-rose-950/60 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <FormField label="ক্রমিক নং">
                      <Input
                        value={selectedItem.customNumber || ''}
                        onChange={(e) =>
                          updateItem(selectedItem.id, (it) => ({
                            ...it,
                            customNumber: e.target.value,
                          }))
                        }
                        placeholder="স্বয়ংক্রিয়"
                      />
                    </FormField>
                    <FormField label="নম্বর">
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={selectedItem.customMarks}
                        onChange={(e) =>
                          updateItem(selectedItem.id, (it) => ({
                            ...it,
                            customMarks: Math.max(1, Number(e.target.value) || 1),
                          }))
                        }
                      />
                    </FormField>
                    <FormField label="ধরন">
                      <Select
                        value={selectedItem.snapshot.questionTypeCode}
                        onChange={(e) =>
                          updateItem(selectedItem.id, (it) => ({
                            ...it,
                            snapshot: {
                              ...it.snapshot,
                              questionTypeCode: e.target.value as QuestionTypeCode,
                            },
                          }))
                        }
                      >
                        {Object.entries(QUESTION_TYPE_LABELS_BN).map(([code, lbl]) => (
                          <option key={code} value={code}>
                            {lbl}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="কঠিনতা">
                      <Select
                        value={selectedItem.snapshot.difficulty || 'medium'}
                        onChange={(e) =>
                          updateItem(selectedItem.id, (it) => ({
                            ...it,
                            snapshot: {
                              ...it.snapshot,
                              difficulty: e.target.value as QuestionDifficulty,
                            },
                          }))
                        }
                      >
                        <option value="easy">{getDifficultyLabelBn('easy')}</option>
                        <option value="medium">{getDifficultyLabelBn('medium')}</option>
                        <option value="hard">{getDifficultyLabelBn('hard')}</option>
                      </Select>
                    </FormField>
                  </div>

                  <FormField label="উদ্দীপক (ঐচ্ছিক)">
                    <Textarea
                      rows={2}
                      value={selectedItem.snapshot.stimulus || ''}
                      onChange={(e) =>
                        updateItem(selectedItem.id, (it) => ({
                          ...it,
                          snapshot: { ...it.snapshot, stimulus: e.target.value },
                        }))
                      }
                    />
                  </FormField>

                  <FormField label="প্রশ্নের মূল লেখা">
                    <Textarea
                      rows={3}
                      value={selectedItem.snapshot.prompt}
                      onChange={(e) =>
                        updateItem(selectedItem.id, (it) => ({
                          ...it,
                          snapshot: { ...it.snapshot, prompt: e.target.value },
                        }))
                      }
                    />
                  </FormField>

                  <FormField label="গাণিতিক সমীকরণ (ঐচ্ছিক)">
                    <Input
                      value={selectedItem.snapshot.equationLatex || ''}
                      onChange={(e) =>
                        updateItem(selectedItem.id, (it) => ({
                          ...it,
                          snapshot: { ...it.snapshot, equationLatex: e.target.value },
                        }))
                      }
                      placeholder="যেমন: F = ma বা a² + b² = c²"
                    />
                  </FormField>

                  {/* Image URL or Upload */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#C2C8D3]">প্রশ্নের চিত্র (URL বা আপলোড)</label>
                    <div className="flex gap-2">
                      <Input
                        value={selectedItem.snapshot.imageUrl || ''}
                        onChange={(e) =>
                          updateItem(selectedItem.id, (it) => ({
                            ...it,
                            snapshot: { ...it.snapshot, imageUrl: e.target.value },
                          }))
                        }
                        placeholder="https://..."
                      />
                      <label className="inline-flex items-center gap-1 rounded-lg border border-[#D4A853]/35 px-3 text-xs font-semibold text-[#EAC779] cursor-pointer whitespace-nowrap">
                        <Upload className="h-3.5 w-3.5" />
                        আপলোড
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleQuestionImageUpload(e, selectedItem.id)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* MCQ Options Editor */}
                  <div className="space-y-2 border-t border-[#D4A853]/15 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#EAC779]">অপশন সম্পাদনা (MCQ)</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateItem(selectedItem.id, (it) => {
                            const existing = it.snapshot.options || [];
                            const nextLabel = ['ক', 'খ', 'গ', 'ঘ', 'ঙ'][existing.length] || String(existing.length + 1);
                            return {
                              ...it,
                              snapshot: {
                                ...it.snapshot,
                                options: [
                                  ...existing,
                                  { id: `opt-${Date.now()}`, label: nextLabel, text: '', isCorrect: false },
                                ],
                              },
                            };
                          })
                        }
                        className="text-xs font-semibold text-[#EAC779] hover:underline cursor-pointer"
                      >
                        + অপশন যোগ
                      </button>
                    </div>
                    {(selectedItem.snapshot.options || []).map((opt, oIdx) => (
                      <div key={opt.id} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`correct-${selectedItem.id}`}
                          checked={opt.isCorrect}
                          onChange={() =>
                            updateItem(selectedItem.id, (it) => ({
                              ...it,
                              snapshot: {
                                ...it.snapshot,
                                options: (it.snapshot.options || []).map((o) => ({
                                  ...o,
                                  isCorrect: o.id === opt.id,
                                })),
                                correctAnswerText: `${opt.label}) ${opt.text}`,
                              },
                            }))
                          }
                          title="সঠিক উত্তর চিহ্নিত করুন"
                          className="accent-emerald-500"
                        />
                        <Input
                          value={opt.label}
                          onChange={(e) =>
                            updateItem(selectedItem.id, (it) => ({
                              ...it,
                              snapshot: {
                                ...it.snapshot,
                                options: (it.snapshot.options || []).map((o) =>
                                  o.id === opt.id ? { ...o, label: e.target.value } : o
                                ),
                              },
                            }))
                          }
                          className="w-12 text-center px-1 py-1 text-xs"
                        />
                        <Input
                          value={opt.text}
                          onChange={(e) =>
                            updateItem(selectedItem.id, (it) => ({
                              ...it,
                              snapshot: {
                                ...it.snapshot,
                                options: (it.snapshot.options || []).map((o) =>
                                  o.id === opt.id ? { ...o, text: e.target.value } : o
                                ),
                              },
                            }))
                          }
                          className="flex-1 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateItem(selectedItem.id, (it) => ({
                              ...it,
                              snapshot: {
                                ...it.snapshot,
                                options: (it.snapshot.options || []).filter((_, i) => i !== oIdx),
                              },
                            }))
                          }
                          className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                          aria-label="অপশন মুছুন"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Custom Answer & Explanation */}
                  <FormField label="সঠিক উত্তর (ডাটাবেস বা কাস্টম)">
                    <Input
                      value={selectedItem.snapshot.correctAnswerText || ''}
                      onChange={(e) =>
                        updateItem(selectedItem.id, (it) => ({
                          ...it,
                          snapshot: { ...it.snapshot, correctAnswerText: e.target.value },
                        }))
                      }
                    />
                  </FormField>
                  <FormField label="ব্যাখ্যা (ঐচ্ছিক)">
                    <Textarea
                      rows={2}
                      value={selectedItem.snapshot.explanation || ''}
                      onChange={(e) =>
                        updateItem(selectedItem.id, (it) => ({
                          ...it,
                          snapshot: { ...it.snapshot, explanation: e.target.value },
                        }))
                      }
                    />
                  </FormField>
                </div>
              )}
            </Card>
          )}

          {/* TAB 4: Optional OMR Answer Sheet Configurator */}
          {activeTab === 'omr' && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#EAC779]">OMR উত্তরপত্র কনফিগারেশন</h2>
                  <p className="text-xs text-[#9DA6B5]">
                    প্রশ্নপত্রের সাথে আলাদা প্রিন্ট-উপযোগী OMR শিট যুক্ত করুন
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-bold text-[#F5EFE2] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={omr.enabled}
                    onChange={(e) => updateOmr({ enabled: e.target.checked })}
                    className="h-4 w-4 accent-[#D4A853]"
                  />
                  <span>চালু করুন</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField label="OMR প্রশ্ন সংখ্যা">
                  <Input
                    type="number"
                    min={10}
                    max={100}
                    value={omr.questionCount}
                    onChange={(e) =>
                      updateOmr({ questionCount: Math.max(10, Math.min(100, Number(e.target.value) || 30)) })
                    }
                  />
                </FormField>
                <FormField label="অপশন সংখ্যা">
                  <Select
                    value={String(omr.optionsCount)}
                    onChange={(e) => updateOmr({ optionsCount: Number(e.target.value) as 4 | 5 })}
                  >
                    <option value="4">৪টি অপশন (ক–ঘ / A–D)</option>
                    <option value="5">৫টি অপশন (ক–ঙ / A–E)</option>
                  </Select>
                </FormField>
                <FormField label="অপশন অক্ষর">
                  <Select
                    value={omr.optionStyle}
                    onChange={(e) => updateOmr({ optionStyle: e.target.value as 'bn' | 'en' })}
                  >
                    <option value="bn">বাংলা (ক, খ, গ, ঘ)</option>
                    <option value="en">English (A, B, C, D)</option>
                  </Select>
                </FormField>
              </div>

              <div className="space-y-2 border-t border-[#D4A853]/15 pt-3 text-xs text-[#C2C8D3]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={omr.includeRollGrid}
                    onChange={(e) => updateOmr({ includeRollGrid: e.target.checked })}
                    className="accent-[#D4A853]"
                  />
                  <span>রোল নম্বর বৃত্ত গ্রিড (Roll Number Grid)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={omr.includeRegGrid}
                    onChange={(e) => updateOmr({ includeRegGrid: e.target.checked })}
                    className="accent-[#D4A853]"
                  />
                  <span>রেজিস্ট্রেশন নম্বর বৃত্ত গ্রিড (Registration Grid)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={omr.includeSetCode}
                    onChange={(e) => updateOmr({ includeSetCode: e.target.checked })}
                    className="accent-[#D4A853]"
                  />
                  <span>প্রশ্নপত্রের সেট কোড বৃত্ত (Set Code)</span>
                </label>
              </div>
            </Card>
          )}
        </aside>

        {/* RIGHT LIVE DOCUMENT CANVAS */}
        <section
          className={`xl:col-span-7 ${
            previewMode === 'print' || previewMode === 'pdf'
              ? 'bg-slate-200/90 dark:bg-slate-900/80 rounded-2xl p-4 sm:p-6'
              : ''
          }`}
        >
          <div
            className={`print-paper-sheet mx-auto rounded-xl shadow-xl transition-all ${borderClass}`}
            style={{
              maxWidth: previewMode === 'desktop' ? '100%' : '210mm',
              backgroundColor: design.backgroundColor,
              color: design.textColor,
              fontFamily: `${design.bengaliFont}, ${design.englishFont}`,
              fontSize: `${design.fontSizePx}px`,
              lineHeight: design.lineHeight,
              textAlign: design.textAlign,
              padding: `${design.pageMarginMm}mm`,
            }}
          >
            {/* Optional Header Text */}
            {paper.headerText && (
              <p className="text-center text-xs italic opacity-80 mb-2">{paper.headerText}</p>
            )}

            {/* Institution Header */}
            <div className="text-center border-b-2 pb-3 mb-4" style={{ borderColor: design.headerColor }}>
              <div className="flex items-center justify-center gap-3">
                {paper.schoolLogoDataUrl && (
                  <img
                    src={paper.schoolLogoDataUrl}
                    alt="লোগো"
                    className="h-12 w-12 object-contain"
                  />
                )}
                <div>
                  <h2
                    className="font-bold tracking-tight"
                    style={{ fontSize: `${design.headingSizePx}px`, color: design.headerColor }}
                  >
                    {paper.schoolName}
                  </h2>
                  <p className="font-semibold opacity-90">
                    {paper.examName} — {paper.title}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold pt-2 border-t border-slate-300/70 tabular-nums">
                <span>
                  {paper.domain === 'admission' ? 'বিভাগ' : 'শ্রেণি'}: {resolvedClassName}
                </span>
                <span>বিষয়: {resolvedSubjectName}</span>
                <span>সময়: {toBanglaDigits(paper.durationMinutes)} মিনিট</span>
                <span>পূর্ণমান: {toBanglaDigits(totalMarks)}</span>
              </div>
            </div>

            {/* Student Info Fields (No Required Date!) */}
            {paper.includeStudentFields && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-300 rounded px-3 py-2 text-xs mb-3">
                <div>শিক্ষার্থীর নাম: ________________________________</div>
                <div>রোল নং: __________________ &nbsp; সেট: ______</div>
              </div>
            )}

            {/* Instructions */}
            {paper.instructions && (
              <p className="text-xs italic mb-4 pb-2 border-b border-dashed border-slate-300">
                <span className="font-bold not-italic">বিশেষ দ্রষ্টব্য: </span>
                {paper.instructions}
              </p>
            )}

            {/* Questions List */}
            <div className="space-y-4">
              {paper.items.map((item, idx) => {
                const q = item.snapshot;
                const isSelected = selectedItem?.id === item.id;
                const displayNum = item.customNumber || toBanglaDigits(idx + 1);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setActiveTab('questions');
                    }}
                    className={`print-avoid-break rounded-lg p-2 -mx-2 transition-colors cursor-pointer ${
                      isSelected ? 'ring-2 ring-amber-500/60 bg-amber-50/40' : 'hover:bg-slate-100/60'
                    }`}
                  >
                    {q.stimulus && (
                      <p className="mb-1 text-[0.95em] italic opacity-90">
                        <span className="font-bold not-italic mr-1">{displayNum}. [উদ্দীপক]</span>
                        {q.stimulus}
                      </p>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">
                        {!q.stimulus && <span className="font-bold mr-1.5">{displayNum}.</span>}
                        {q.prompt}
                      </p>
                      <span className="font-bold text-xs shrink-0 tabular-nums">
                        [{toBanglaDigits(item.customMarks)}]
                      </span>
                    </div>

                    {q.equationLatex && (
                      <p className="mt-1 ml-5 font-mono text-[0.9em] bg-slate-100/80 px-2.5 py-1 rounded inline-block">
                        {q.equationLatex}
                      </p>
                    )}

                    {q.imageUrl && (
                      <img
                        src={q.imageUrl}
                        alt="প্রশ্নের চিত্র"
                        className="mt-2 ml-5 max-h-44 rounded border border-slate-300 object-contain"
                      />
                    )}

                    {q.options && q.options.length > 0 && (
                      <div className="mt-2 ml-5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[0.94em]">
                        {q.options.map((opt) => (
                          <div key={opt.id}>
                            <span className="font-semibold mr-1">({opt.label})</span>
                            <span>{opt.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.subParts && q.subParts.length > 0 && (
                      <div className="mt-2 ml-5 space-y-1 text-[0.94em]">
                        {q.subParts.map((sp) => (
                          <div key={sp.id} className="flex justify-between gap-2">
                            <span>
                              <strong className="mr-1">{sp.label})</strong>
                              {sp.prompt}
                            </span>
                            <span className="font-semibold text-xs tabular-nums">
                              [{toBanglaDigits(sp.marks)}]
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Optional Footer Text */}
            {paper.footerText && (
              <div className="mt-6 pt-3 border-t border-slate-300 text-center text-xs opacity-80">
                {paper.footerText}
              </div>
            )}

            {/* Optional Answer Key Section */}
            {showAnswerKey && (
              <div className="print-page-break mt-8 pt-4 border-t-2 border-slate-800 space-y-2.5">
                <h3 className="text-base font-bold text-center">উত্তরপত্র ও সংক্ষিপ্ত ব্যাখ্যা</h3>
                {paper.items.map((item, idx) => (
                  <div key={item.id} className="text-xs border-b border-slate-200 pb-1.5">
                    <span className="font-bold mr-1.5">
                      {item.customNumber || toBanglaDigits(idx + 1)}.
                    </span>
                    <span className="font-semibold text-emerald-800">
                      {item.snapshot.correctAnswerText || 'পাঠ্যবই অনুযায়ী উত্তর'}
                    </span>
                    {item.snapshot.explanation && (
                      <p className="text-[11px] opacity-80 ml-4 mt-0.5">
                        ব্যাখ্যা: {item.snapshot.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Separate Printable OMR Answer Sheet */}
          {omr.enabled && <OmrSheetPage paper={paper} omr={omr} design={design} />}
        </section>
      </div>
    </div>
  );
}
