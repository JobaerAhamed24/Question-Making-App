import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Cpu,
  GraduationCap,
  Layers,
  Stethoscope,
  Upload,
} from 'lucide-react';
import { Button, Card, FormField, Input, Select, Textarea } from '../../components/ui/Primitives';
import {
  QuestionSelectionWorkspace,
  type WorkspaceExamMeta,
} from '../../components/workspace/QuestionSelectionWorkspace';
import { useToast } from '../../contexts/ToastContext';
import { toBanglaDigits } from '../../lib/bn';
import { getAdmissionCategoryLabelBn, platformService } from '../../services/platformService';
import type { AdmissionCategoryCode, WorkspaceFilterState } from '../../types/domain';

export function AdmissionBuilderPage() {
  const { category } = useParams<{ category?: string }>();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const admissionCat = platformService.getAdmissionCatalogue();
  const validCategory: AdmissionCategoryCode | null =
    category === 'university' || category === 'engineering' || category === 'medical'
      ? category
      : null;

  const [title, setTitle] = useState('ভর্তি প্রস্তুতি মডেল টেস্ট');
  const [examName, setExamName] = useState('মডেল টেস্ট ০১');
  const [schoolName, setSchoolName] = useState('এক্সিলেন্স অ্যাডমিশন একাডেমি');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [schoolLogoDataUrl, setSchoolLogoDataUrl] = useState<string | undefined>(undefined);
  const [instructions, setInstructions] = useState(
    'প্রতিটি সঠিক উত্তরের জন্য পূর্ণ নম্বর এবং প্রতিটি ভুল উত্তরের জন্য ০.২৫ নম্বর কাটা যাবে।'
  );
  const [selectedInstitutionIds, setSelectedInstitutionIds] = useState<string[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [stage, setStage] = useState<'setup' | 'workspace'>('setup');

  const institutions = useMemo(
    () => admissionCat.institutions.filter((i) => i.isActive && i.categoryId === validCategory),
    [admissionCat.institutions, validCategory]
  );

  const subjects = useMemo(
    () => admissionCat.subjects.filter((s) => s.isActive && s.categoryId === validCategory),
    [admissionCat.subjects, validCategory]
  );

  const effectiveSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId) || null,
    [subjects, selectedSubjectId]
  );

  const topics = useMemo(
    () =>
      admissionCat.topics.filter(
        (t) =>
          t.isActive &&
          (!effectiveSubject
            ? subjects.some((s) => s.id === t.admissionSubjectId)
            : t.admissionSubjectId === effectiveSubject.id)
      ),
    [admissionCat.topics, effectiveSubject, subjects]
  );

  const categoryIcons: Record<AdmissionCategoryCode, React.ReactNode> = {
    university: <GraduationCap className="h-7 w-7" />,
    engineering: <Cpu className="h-7 w-7" />,
    medical: <Stethoscope className="h-7 w-7" />,
  };

  // Landing view: 3 Large Admission Category Cards
  if (!validCategory) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 space-y-10 font-bangla">
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <p className="text-xs font-mono font-bold tracking-[0.22em] text-[#D4A853] uppercase">
            ADMISSION QUESTION PAPER BUILDER
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold gold-text-gradient">
            ভর্তি পরীক্ষা প্রশ্নপত্র তৈরি
          </h1>
          <p className="text-base text-[#B8C0CE] leading-relaxed">
            বিশ্ববিদ্যালয়, প্রকৌশল ও মেডিকেল ভর্তি পরীক্ষার জন্য সম্পূর্ণ স্বতন্ত্র ভর্তি প্রশ্নব্যাংক—প্রতিষ্ঠান, বিষয়, টপিক ও ভর্তি সাল (২০১০–২০২৬) অনুযায়ী প্রশ্নপত্র ও OMR তৈরি করুন।
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {admissionCat.categories.map((cat) => {
            const instList = admissionCat.institutions.filter((i) => i.categoryId === cat.id);
            return (
              <Card
                key={cat.id}
                className="p-6 flex flex-col justify-between gap-6 hover:border-[#EAC779]/65 transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-13 w-13 items-center justify-center rounded-xl border border-[#D4A853]/40 bg-[#141822] text-[#EAC779]">
                      {categoryIcons[cat.id]}
                    </div>
                    <span className="text-xs font-mono font-semibold text-[#D4A853] tabular-nums">
                      {toBanglaDigits(instList.length)}টি প্রতিষ্ঠান
                    </span>
                  </div>

                  <div>
                    <h2 className="font-display text-2xl font-bold text-[#F5EFE2]">{cat.nameBn}</h2>
                    <p className="mt-1 text-xs font-medium text-[#D4A853]">{cat.subtitleBn}</p>
                  </div>

                  <p className="text-sm text-[#C2C8D3] leading-relaxed">{cat.descriptionBn}</p>

                  <ul className="space-y-2 border-t border-[#D4A853]/15 pt-4 text-xs text-[#E5E0D5]">
                    {cat.highlightsBn.map((hl) => (
                      <li key={hl} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-[#EAC779] shrink-0 mt-0.5" />
                        <span>{hl}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  to={`/admission/${cat.id}`}
                  className="flex items-center justify-center gap-2 rounded-lg gold-btn px-4 py-3 text-sm font-bold"
                >
                  <span>প্রশ্নপত্র বিল্ডার খুলুন</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const toggleItem = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSchoolLogoDataUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleOpenWorkspace = () => {
    if (!title.trim() || !examName.trim()) {
      pushToast({ title: 'প্রশ্নপত্রের শিরোনাম ও পরীক্ষার নাম দিন', variant: 'error' });
      return;
    }
    setStage('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const workspaceMeta: WorkspaceExamMeta = {
    domain: 'admission',
    admissionCategory: validCategory,
    title: title.trim(),
    examName: examName.trim(),
    schoolName: schoolName.trim(),
    schoolLogoDataUrl,
    durationMinutes: Number(durationMinutes) || 60,
    instructions: instructions.trim(),
    classId: `admission-${validCategory}`,
    classLabel: getAdmissionCategoryLabelBn(validCategory),
    subjectId: effectiveSubject?.id || `admission-${validCategory}-all`,
    subjectLabel: effectiveSubject?.nameBn || 'সমন্বিত ভর্তি বিষয়সমূহ',
  };

  const workspaceInitialFilters: WorkspaceFilterState = {
    domain: 'admission',
    sources: [],
    chapterIds: [],
    topicIds: [],
    admissionCategory: validCategory,
    institutionIds: selectedInstitutionIds,
    admissionSubjectId: effectiveSubject?.id,
    admissionTopicIds: selectedTopicIds,
    difficulties: [],
    questionTypes: [],
    boards: [],
    years: [],
    answerFilter: 'all',
    usageFilter: 'all',
    sortBy: 'default',
    search: '',
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6 font-bangla">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-[#D4A853]/20 pb-5">
        <div>
          <button
            type="button"
            onClick={() => navigate('/admission')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4A853] hover:underline mb-2 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            সকল ভর্তি বিভাগ
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-bold gold-text-gradient">
            {getAdmissionCategoryLabelBn(validCategory)} — প্রশ্নপত্র বিল্ডার
          </h1>
          <p className="mt-1 text-sm text-[#B8C0CE]">
            বিশ্ববিদ্যালয়/প্রতিষ্ঠান, ভর্তি বিষয়, একাধিক টপিক এবং বিগত ভর্তি সাল (২০১০–২০২৬) অনুযায়ী প্রশ্ন বাছাই করুন।
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStage('setup')}
            className={`rounded-lg border px-3 py-1.5 cursor-pointer ${
              stage === 'setup'
                ? 'border-[#EAC779] bg-[#D4A853]/20 text-[#EAC779]'
                : 'border-[#D4A853]/25 text-[#9DA6B5]'
            }`}
          >
            ধাপ ১: ভর্তি তথ্য ও টপিক
          </button>
          <ArrowRight className="h-3.5 w-3.5 text-[#8C95A4]" />
          <span
            className={`rounded-lg border px-3 py-1.5 ${
              stage === 'workspace'
                ? 'border-[#EAC779] bg-[#D4A853]/20 text-[#EAC779]'
                : 'border-[#D4A853]/20 text-[#8C95A4]'
            }`}
          >
            ধাপ ২: প্রশ্ন নির্বাচন ওয়ার্কস্পেস
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
          {/* Exam Metadata Form (NO Academic Class / NO NCTB Chapter / NO Exam Date) */}
          <Card className="lg:col-span-6 p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#F5EFE2] border-b border-[#D4A853]/20 pb-3">
              ভর্তি পরীক্ষার সাধারণ তথ্য
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="প্রশ্নপত্রের শিরোনাম" required>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </FormField>
              <FormField label="পরীক্ষার নাম" required>
                <Input value={examName} onChange={(e) => setExamName(e.target.value)} />
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="কোচিং বা প্রতিষ্ঠানের নাম" required>
                <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
              </FormField>
              <FormField label="সময় (মিনিট)" required>
                <Input
                  type="number"
                  min={15}
                  max={240}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value) || 60)}
                />
              </FormField>
            </div>

            <FormField label="প্রতিষ্ঠানের লোগো (ঐচ্ছিক)">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 rounded-lg border border-[#D4A853]/35 bg-[#0A0D12] px-3 py-1.5 text-xs font-semibold text-[#EAC779] cursor-pointer">
                  <Upload className="h-4 w-4" />
                  লোগো আপলোড
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                {schoolLogoDataUrl && (
                  <img
                    src={schoolLogoDataUrl}
                    alt="লোগো"
                    className="h-9 w-9 rounded border border-[#D4A853]/30 bg-white object-contain p-0.5"
                  />
                )}
              </div>
            </FormField>

            <FormField label="পরীক্ষার নির্দেশনা">
              <Textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </FormField>
          </Card>

          {/* Admission Institutions, Subjects & Multi-Topics */}
          <Card className="lg:col-span-6 p-6 space-y-5">
            <h2 className="text-lg font-bold text-[#F5EFE2] border-b border-[#D4A853]/20 pb-3">
              প্রতিষ্ঠান, বিষয় ও টপিক নির্বাচন
            </h2>

            {/* Institutions */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#EAC779] flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                বিশ্ববিদ্যালয় / প্রতিষ্ঠান নির্বাচন (ঐচ্ছিক, একাধিক)
              </p>
              <div className="flex flex-wrap gap-2">
                {institutions.map((inst) => {
                  const active = selectedInstitutionIds.includes(inst.id);
                  return (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => setSelectedInstitutionIds((prev) => toggleItem(prev, inst.id))}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                        active
                          ? 'border-[#EAC779] bg-[#D4A853]/20 text-[#EAC779]'
                          : 'border-[#D4A853]/25 bg-[#0A0D12] text-[#C2C8D3]'
                      }`}
                    >
                      {inst.nameBn}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject */}
            <FormField label="ভর্তি বিষয় (সকল বা নির্দিষ্ট বিষয়)">
              <Select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedTopicIds([]);
                }}
              >
                <option value="">সকল বিষয় (সমন্বিত মডেল টেস্ট)</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.nameBn}
                  </option>
                ))}
              </Select>
            </FormField>

            {/* Multi-Topics */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#EAC779]">ভর্তি টপিক নির্বাচন (একাধিক)</span>
                <span className="text-[#9DA6B5] tabular-nums">
                  {toBanglaDigits(selectedTopicIds.length)}টি নির্বাচিত
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {topics.map((t) => (
                  <label
                    key={t.id}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer ${
                      selectedTopicIds.includes(t.id)
                        ? 'border-[#EAC779]/60 bg-[#D4A853]/10 text-[#F5EFE2]'
                        : 'border-[#D4A853]/20 bg-[#0A0D12] text-[#C2C8D3]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTopicIds.includes(t.id)}
                      onChange={() => setSelectedTopicIds((prev) => toggleItem(prev, t.id))}
                      className="accent-[#D4A853]"
                    />
                    <span>{t.nameBn}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-[#D4A853]/20 pt-4">
              <Button size="lg" onClick={handleOpenWorkspace} className="w-full justify-center py-3">
                <Layers className="h-5 w-5" />
                <span>ভর্তি প্রশ্ন নির্বাচন ওয়ার্কস্পেস খুলুন</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
