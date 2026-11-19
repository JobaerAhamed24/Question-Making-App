import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Flag,
  Gamepad2,
  GraduationCap,
  Library,
  MessageSquare,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button, Card, FormField, Input, Select, Textarea } from '../../components/ui/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { AVAILABLE_EXAM_YEARS } from '../../data/platformSeedData';
import { formatBnDateTime, getDifficultyLabelBn, toBanglaDigits } from '../../lib/bn';
import { getAdmissionCategoryLabelBn, platformService } from '../../services/platformService';
import type {
  AdmissionCategoryCode,
  KidsGameCategory,
  KidsGameModeId,
  LearningCategorySlug,
  QuestionDifficulty,
} from '../../types/domain';

export function AdminAdmissionManagePage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [rev, setRev] = useState(0);

  const [instCategory, setInstCategory] = useState<AdmissionCategoryCode>('university');
  const [instNameBn, setInstNameBn] = useState('');
  const [instShortCode, setInstShortCode] = useState('');

  const [subCategory, setSubCategory] = useState<AdmissionCategoryCode>('university');
  const [subNameBn, setSubNameBn] = useState('');

  const [topicSubjectId, setTopicSubjectId] = useState('asub-uni-phy');
  const [topicNameBn, setTopicNameBn] = useState('');

  // Quick Add Admission Question + AI Approval Queue
  const [qCategory, setQCategory] = useState<AdmissionCategoryCode>('university');
  const [qInstId, setQInstId] = useState('inst-du');
  const [qSubId, setQSubId] = useState('asub-uni-phy');
  const [qYear, setQYear] = useState(2025);
  const [qDifficulty, setQDifficulty] = useState<QuestionDifficulty>('medium');
  const [qPrompt, setQPrompt] = useState('');
  const [qAnswer, setQAnswer] = useState('');
  const [importJson, setImportJson] = useState('');

  const admissionCat = useMemo(() => platformService.getAdmissionCatalogue(), [rev]);
  const allQuestions = useMemo(() => platformService.getAllQuestions(user), [user, rev]);
  const admissionQuestions = useMemo(
    () => allQuestions.filter((q) => q.domain === 'admission'),
    [allQuestions]
  );
  const pendingAiQuestions = useMemo(
    () => allQuestions.filter((q) => q.approvalStatus === 'pending_ai'),
    [allQuestions]
  );

  return (
    <div className="space-y-6 font-bangla">
      <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold gold-text-gradient flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-[#EAC779]" />
            ভর্তি পরীক্ষা ও প্রশ্নব্যাংক ব্যবস্থাপনা
          </h1>
          <p className="mt-1 text-sm text-[#B8C0CE]">
            বিশ্ববিদ্যালয়, প্রকৌশল ও মেডিকেল ভর্তি প্রতিষ্ঠান, বিষয়, টপিক, ভর্তি প্রশ্ন এবং AI প্রশ্ন অনুমোদন পরিচালনা করুন।
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const json = platformService.exportAcademicBundleJson();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'curriculum-chapters-export.json';
            a.click();
            URL.revokeObjectURL(url);
            pushToast({ title: 'পাঠ্যক্রম JSON এক্সপোর্ট সম্পন্ন', variant: 'success' });
          }}
        >
          <Download className="h-4 w-4" />
          পাঠ্যক্রম JSON এক্সপোর্ট
        </Button>
      </Card>

      {/* AI Generated / Pending Question Approval Queue */}
      <Card className="p-5 space-y-3">
        <h2 className="text-base font-bold text-[#EAC779] flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          অপেক্ষমাণ AI / যাচাইযোগ্য প্রশ্ন অনুমোদন ({toBanglaDigits(pendingAiQuestions.length)})
        </h2>
        {pendingAiQuestions.length === 0 ? (
          <p className="text-sm text-[#9DA6B5]">কোনো অপেক্ষমাণ প্রশ্ন নেই—সকল প্রশ্ন অনুমোদিত।</p>
        ) : (
          <div className="space-y-2.5">
            {pendingAiQuestions.map((q) => (
              <div
                key={q.id}
                className="rounded-xl border border-amber-400/35 bg-[#0A0D12] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <p className="text-xs text-amber-300 font-semibold">
                    {q.isAiGenerated ? 'AI জেনারেটেড প্রশ্ন' : 'যাচাইকরণ অপেক্ষমাণ'} ·{' '}
                    {getDifficultyLabelBn(q.difficulty)}
                  </p>
                  <p className="text-sm font-medium text-[#F5EFE2]">{q.prompt}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => {
                      platformService.updateQuestionApproval(q.id, 'approved', user?.fullName);
                      setRev((r) => r + 1);
                      pushToast({ title: 'প্রশ্নটি অনুমোদিত হয়েছে', variant: 'success' });
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    অনুমোদন
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      platformService.updateQuestionApproval(q.id, 'rejected', user?.fullName);
                      setRev((r) => r + 1);
                      pushToast({ title: 'প্রশ্নটি প্রত্যাখ্যান করা হয়েছে', variant: 'info' });
                    }}
                  >
                    প্রত্যাখ্যান
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Institutions, Subjects, Topics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Add Institution */}
        <Card className="p-5 space-y-3">
          <h2 className="text-base font-bold text-[#EAC779]">নতুন ভর্তি প্রতিষ্ঠান যুক্ত</h2>
          <FormField label="ভর্তি বিভাগ">
            <Select
              value={instCategory}
              onChange={(e) => setInstCategory(e.target.value as AdmissionCategoryCode)}
            >
              <option value="university">বিশ্ববিদ্যালয় ভর্তি</option>
              <option value="engineering">প্রকৌশল ভর্তি</option>
              <option value="medical">মেডিকেল ভর্তি</option>
            </Select>
          </FormField>
          <FormField label="প্রতিষ্ঠানের নাম">
            <Input
              value={instNameBn}
              onChange={(e) => setInstNameBn(e.target.value)}
              placeholder="যেমন: শাহজালাল বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়"
            />
          </FormField>
          <FormField label="সংক্ষিপ্ত কোড">
            <Input
              value={instShortCode}
              onChange={(e) => setInstShortCode(e.target.value)}
              placeholder="যেমন: SUST"
            />
          </FormField>
          <Button
            size="sm"
            onClick={() => {
              if (!instNameBn.trim() || !instShortCode.trim()) return;
              platformService.addAdmissionInstitution(
                {
                  categoryId: instCategory,
                  name: instShortCode.trim(),
                  nameBn: instNameBn.trim(),
                  shortCode: instShortCode.trim().toUpperCase(),
                  isActive: true,
                },
                user?.fullName
              );
              setInstNameBn('');
              setInstShortCode('');
              setRev((r) => r + 1);
              pushToast({ title: 'ভর্তি প্রতিষ্ঠান যুক্ত হয়েছে', variant: 'success' });
            }}
          >
            <Plus className="h-4 w-4" /> যুক্ত করুন
          </Button>
          <div className="pt-2 border-t border-[#D4A853]/15 space-y-1.5 max-h-44 overflow-y-auto">
            {admissionCat.institutions.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between text-xs bg-[#0A0D12] border border-[#D4A853]/15 rounded px-2.5 py-1.5"
              >
                <span className="text-[#F5EFE2] truncate">
                  {i.shortCode} — {i.nameBn}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    platformService.deleteAdmissionInstitution(i.id);
                    setRev((r) => r + 1);
                  }}
                  className="text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Add Admission Subject & Topic */}
        <Card className="p-5 space-y-4">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-[#EAC779]">ভর্তি বিষয় যুক্ত করুন</h2>
            <Select
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value as AdmissionCategoryCode)}
            >
              <option value="university">বিশ্ববিদ্যালয় ভর্তি</option>
              <option value="engineering">প্রকৌশল ভর্তি</option>
              <option value="medical">মেডিকেল ভর্তি</option>
            </Select>
            <Input
              value={subNameBn}
              onChange={(e) => setSubNameBn(e.target.value)}
              placeholder="বিষয়ের নাম (যেমন: সাধারণ জ্ঞান)"
            />
            <Button
              size="sm"
              onClick={() => {
                if (!subNameBn.trim()) return;
                platformService.addAdmissionSubject(
                  { categoryId: subCategory, name: subNameBn.trim(), nameBn: subNameBn.trim(), isActive: true },
                  user?.fullName
                );
                setSubNameBn('');
                setRev((r) => r + 1);
                pushToast({ title: 'ভর্তি বিষয় যুক্ত হয়েছে', variant: 'success' });
              }}
            >
              <Plus className="h-4 w-4" /> বিষয় যোগ
            </Button>
          </div>

          <div className="space-y-3 border-t border-[#D4A853]/20 pt-4">
            <h2 className="text-base font-bold text-[#EAC779]">ভর্তি টপিক যুক্ত করুন</h2>
            <Select value={topicSubjectId} onChange={(e) => setTopicSubjectId(e.target.value)}>
              {admissionCat.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {getAdmissionCategoryLabelBn(s.categoryId)} — {s.nameBn}
                </option>
              ))}
            </Select>
            <Input
              value={topicNameBn}
              onChange={(e) => setTopicNameBn(e.target.value)}
              placeholder="টপিকের নাম (যেমন: জৈব যৌগের নামকরণ)"
            />
            <Button
              size="sm"
              onClick={() => {
                if (!topicNameBn.trim()) return;
                platformService.addAdmissionTopic(
                  { admissionSubjectId: topicSubjectId, name: topicNameBn.trim(), nameBn: topicNameBn.trim(), isActive: true },
                  user?.fullName
                );
                setTopicNameBn('');
                setRev((r) => r + 1);
                pushToast({ title: 'ভর্তি টপিক যুক্ত হয়েছে', variant: 'success' });
              }}
            >
              <Plus className="h-4 w-4" /> টপিক যোগ
            </Button>
          </div>
        </Card>

        {/* Quick Add Admission Question */}
        <Card className="p-5 space-y-3">
          <h2 className="text-base font-bold text-[#EAC779]">নতুন ভর্তি প্রশ্ন যুক্ত করুন</h2>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={qCategory}
              onChange={(e) => setQCategory(e.target.value as AdmissionCategoryCode)}
            >
              <option value="university">বিশ্ববিদ্যালয়</option>
              <option value="engineering">প্রকৌশল</option>
              <option value="medical">মেডিকেল</option>
            </Select>
            <Select value={qInstId} onChange={(e) => setQInstId(e.target.value)}>
              {admissionCat.institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.shortCode}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Select value={qSubId} onChange={(e) => setQSubId(e.target.value)}>
              {admissionCat.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameBn}
                </option>
              ))}
            </Select>
            <Select value={String(qYear)} onChange={(e) => setQYear(Number(e.target.value))}>
              {AVAILABLE_EXAM_YEARS.map((y) => (
                <option key={y} value={y}>
                  {toBanglaDigits(y)}
                </option>
              ))}
            </Select>
            <Select
              value={qDifficulty}
              onChange={(e) => setQDifficulty(e.target.value as QuestionDifficulty)}
            >
              <option value="easy">সহজ</option>
              <option value="medium">মধ্যম</option>
              <option value="hard">কঠিন</option>
            </Select>
          </div>
          <Textarea
            rows={2}
            value={qPrompt}
            onChange={(e) => setQPrompt(e.target.value)}
            placeholder="ভর্তি পরীক্ষার প্রশ্ন লিখুন..."
          />
          <Input
            value={qAnswer}
            onChange={(e) => setQAnswer(e.target.value)}
            placeholder="সঠিক উত্তর..."
          />
          <Button
            size="sm"
            onClick={() => {
              if (!qPrompt.trim()) return;
              platformService.upsertExtraQuestion(
                {
                  domain: 'admission',
                  classId: 'admission',
                  subjectId: qSubId,
                  chapterId: 'admission',
                  admissionCategory: qCategory,
                  institutionId: qInstId,
                  admissionSubjectId: qSubId,
                  boardYear: qYear,
                  approvalStatus: 'approved',
                  questionTypeCode: 'mcq',
                  language: 'bn',
                  difficulty: qDifficulty,
                  marks: 1,
                  status: 'published',
                  prompt: qPrompt.trim(),
                  correctAnswerText: qAnswer.trim(),
                },
                user?.fullName
              );
              setQPrompt('');
              setQAnswer('');
              setRev((r) => r + 1);
              pushToast({ title: 'নতুন ভর্তি প্রশ্ন যুক্ত হয়েছে', variant: 'success' });
            }}
          >
            <Plus className="h-4 w-4" /> প্রশ্ন সংরক্ষণ
          </Button>
          <p className="text-xs text-[#9DA6B5] tabular-nums">
            মোট ভর্তি প্রশ্ন: {toBanglaDigits(admissionQuestions.length)}টি
          </p>
        </Card>
      </div>

      {/* Bulk Chapter JSON Import */}
      <Card className="p-5 space-y-3">
        <h2 className="text-base font-bold text-[#EAC779] flex items-center gap-2">
          <Upload className="h-4 w-4" />
          বাল্ক অধ্যায় ও টপিক JSON ইমপোর্ট
        </h2>
        <Textarea
          rows={3}
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
          placeholder='{"chapters": [{"subjectId": "sub-c8-math", "chapterNumber": 5, "nameBn": "বীজগণিতীয় ভগ্নাংশ"}]}'
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            try {
              const count = platformService.importChaptersJson(importJson, user?.fullName);
              setImportJson('');
              setRev((r) => r + 1);
              pushToast({ title: `${toBanglaDigits(count)}টি অধ্যায় ইমপোর্ট হয়েছে`, variant: 'success' });
            } catch {
              pushToast({ title: 'সঠিক JSON ফরম্যাট প্রদান করুন', variant: 'error' });
            }
          }}
        >
          ইমপোর্ট করুন
        </Button>
      </Card>
    </div>
  );
}

export function AdminLearningManagePage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [rev, setRev] = useState(0);

  const [categorySlug, setCategorySlug] = useState<LearningCategorySlug>('mathematics');
  const [classNameBn, setClassNameBn] = useState('অষ্টম শ্রেণি');
  const [subjectNameBn, setSubjectNameBn] = useState('গণিত');
  const [chapterNameBn, setChapterNameBn] = useState('অধ্যায় ৪: বীজগণিতীয় সূত্রাবলি');
  const [exerciseNameBn, setExerciseNameBn] = useState('অনুশীলনী ৪.১');
  const [title, setTitle] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [formulaLine, setFormulaLine] = useState('');
  const [stepDetail, setStepDetail] = useState('');
  const [finalAnswer, setFinalAnswer] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  const items = useMemo(() => platformService.listLearningContents(true), [rev]);
  const comments = useMemo(() => platformService.listComments(undefined, true), [rev]);

  return (
    <div className="space-y-6 font-bangla">
      <Card className="p-5">
        <h1 className="font-display text-2xl font-bold gold-text-gradient flex items-center gap-2">
          <Library className="h-6 w-6 text-[#EAC779]" />
          লার্নিং হাব ও মন্তব্য মডারেশন
        </h1>
        <p className="mt-1 text-sm text-[#B8C0CE]">
          ফ্রি লার্নিং হাবের সমাধান, ইউটিউব ভিডিও, SEO টাইটেল ও মেটা ডেসক্রিপশন যুক্ত করুন এবং শিক্ষার্থীদের মন্তব্য মডারেশন করুন।
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Create Learning Hub Page */}
        <Card className="lg:col-span-6 p-5 space-y-3">
          <h2 className="text-base font-bold text-[#EAC779]">নতুন সমাধান পৃষ্ঠা প্রকাশ করুন</h2>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="ক্যাটাগরি">
              <Select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value as LearningCategorySlug)}
              >
                <option value="mathematics">গণিত</option>
                <option value="higher-mathematics">উচ্চতর গণিত</option>
                <option value="physics">পদার্থবিজ্ঞান</option>
                <option value="chemistry">রসায়ন</option>
                <option value="admission">ভর্তি প্রস্তুতি</option>
              </Select>
            </FormField>
            <FormField label="শ্রেণি / বিভাগ">
              <Input value={classNameBn} onChange={(e) => setClassNameBn(e.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <FormField label="বিষয়">
              <Input value={subjectNameBn} onChange={(e) => setSubjectNameBn(e.target.value)} />
            </FormField>
            <FormField label="অধ্যায়">
              <Input value={chapterNameBn} onChange={(e) => setChapterNameBn(e.target.value)} />
            </FormField>
            <FormField label="অনুশীলনী">
              <Input value={exerciseNameBn} onChange={(e) => setExerciseNameBn(e.target.value)} />
            </FormField>
          </div>
          <FormField label="শিরোনাম (Page Title)" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="সমাধানের শিরোনাম..." />
          </FormField>
          <FormField label="প্রশ্ন / সমস্যা" required>
            <Textarea rows={2} value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
          </FormField>
          <FormField label="প্রয়োজনীয় সূত্র">
            <Input value={formulaLine} onChange={(e) => setFormulaLine(e.target.value)} placeholder="যেমন: (a+b)² = a² + 2ab + b²" />
          </FormField>
          <FormField label="ধাপে ধাপে সমাধানের বিবরণ" required>
            <Textarea rows={3} value={stepDetail} onChange={(e) => setStepDetail(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="চূড়ান্ত উত্তর">
              <Input value={finalAnswer} onChange={(e) => setFinalAnswer(e.target.value)} />
            </FormField>
            <FormField label="YouTube ভিডিও লিংক (ঐচ্ছিক)">
              <Input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="SEO Title">
              <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
            </FormField>
            <FormField label="SEO Meta Description">
              <Input value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
            </FormField>
          </div>
          <Button
            onClick={() => {
              if (!title.trim() || !questionText.trim()) {
                pushToast({ title: 'শিরোনাম ও প্রশ্ন আবশ্যক', variant: 'error' });
                return;
              }
              const slug = `problem-${Date.now().toString(36)}`;
              platformService.upsertLearningContent(
                {
                  categorySlug,
                  domain: categorySlug === 'admission' ? 'admission' : 'academic',
                  classSlug: categorySlug === 'admission' ? 'university' : 'class-8',
                  classNameBn,
                  subjectSlug: categorySlug,
                  subjectNameBn,
                  chapterSlug: 'chapter-custom',
                  chapterNameBn,
                  exerciseSlug: 'exercise-1',
                  exerciseNameBn,
                  problemSlug: slug,
                  title: title.trim(),
                  questionText: questionText.trim(),
                  formulas: formulaLine.trim() ? [formulaLine.trim()] : [],
                  equations: [],
                  solutionSteps: [
                    { stepNumber: 1, heading: 'ধাপে ধাপে সমাধান', detail: stepDetail.trim() || 'বিস্তারিত সমাধান।' },
                  ],
                  finalAnswer: finalAnswer.trim() || 'সম্পন্ন',
                  youtubeUrl: youtubeUrl.trim() || undefined,
                  seoTitle: seoTitle.trim() || title.trim(),
                  seoDescription: seoDescription.trim() || questionText.trim(),
                  relatedIds: [],
                  isPublished: true,
                },
                user?.fullName
              );
              setTitle('');
              setQuestionText('');
              setStepDetail('');
              setFinalAnswer('');
              setRev((r) => r + 1);
              pushToast({ title: 'লার্নিং হাব সমাধান প্রকাশিত হয়েছে', variant: 'success' });
            }}
          >
            <Plus className="h-4 w-4" /> সমাধান প্রকাশ করুন
          </Button>
        </Card>

        {/* Published Learning Pages + Comment Moderation */}
        <div className="lg:col-span-6 space-y-5">
          <Card className="p-5 space-y-3">
            <h2 className="text-base font-bold text-[#EAC779]">
              সকল লার্নিং পৃষ্ঠা ({toBanglaDigits(items.length)})
            </h2>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#F5EFE2] truncate">{it.title}</p>
                    <p className="text-[11px] text-[#9DA6B5]">
                      {it.classNameBn} · {it.subjectNameBn} · {it.isPublished ? 'প্রকাশিত' : 'খসড়া'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        platformService.toggleLearningPublish(it.id);
                        setRev((r) => r + 1);
                      }}
                      className="rounded border border-[#D4A853]/30 px-2 py-1 text-[11px] font-semibold text-[#EAC779] cursor-pointer"
                    >
                      {it.isPublished ? 'অপ্রকাশিত' : 'প্রকাশ'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        platformService.deleteLearningContent(it.id);
                        setRev((r) => r + 1);
                      }}
                      className="rounded border border-rose-500/30 p-1 text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h2 className="text-base font-bold text-[#EAC779] flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              মন্তব্য মডারেশন ({toBanglaDigits(comments.length)})
            </h2>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {comments.map((cm) => (
                <div
                  key={cm.id}
                  className={`rounded-lg border p-3 space-y-1.5 ${
                    cm.reportedByUserIds.length > 0
                      ? 'border-amber-500/50 bg-amber-950/20'
                      : 'border-[#D4A853]/20 bg-[#0A0D12]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#F5EFE2]">{cm.userName}</span>
                    <span className="text-[#8C95A4] tabular-nums">{formatBnDateTime(cm.createdAt)}</span>
                  </div>
                  <p className="text-xs text-[#C2C8D3]">{cm.body}</p>
                  <div className="flex items-center justify-between pt-1">
                    {cm.reportedByUserIds.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300">
                        <Flag className="h-3 w-3" /> {toBanglaDigits(cm.reportedByUserIds.length)}টি রিপোর্ট
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-400">স্বাভাবিক</span>
                    )}
                    <div className="flex items-center gap-2">
                      {cm.reportedByUserIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            platformService.clearCommentReports(cm.id);
                            setRev((r) => r + 1);
                          }}
                          className="text-xs text-emerald-400 hover:underline cursor-pointer"
                        >
                          অনুমোদন
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (!user) return;
                          platformService.deleteComment(cm.id, user);
                          setRev((r) => r + 1);
                          pushToast({ title: 'মন্তব্য মুছে ফেলা হয়েছে', variant: 'info' });
                        }}
                        className="text-xs text-rose-400 hover:underline cursor-pointer"
                      >
                        মুছুন
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function AdminKidsGameManagePage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [rev, setRev] = useState(0);

  const [category, setCategory] = useState<KidsGameCategory>('addition');
  const [modeId, setModeId] = useState<KidsGameModeId>('match_answer');
  const [titleBn, setTitleBn] = useState('');
  const [instructionsBn, setInstructionsBn] = useState('');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('easy');
  const [rewardStars, setRewardStars] = useState(3);

  const games = useMemo(() => platformService.listKidsGames(true), [rev]);

  return (
    <div className="space-y-6 font-bangla">
      <Card className="p-5">
        <h1 className="font-display text-2xl font-bold gold-text-gradient flex items-center gap-2">
          <Gamepad2 className="h-6 w-6 text-[#EAC779]" />
          কিডস ম্যাথ গেম ব্যবস্থাপনা
        </h1>
        <p className="mt-1 text-sm text-[#B8C0CE]">
          যোগ, বিয়োগ, গুণ ও ভাগের গেম তৈরি, সক্রিয়/নিষ্ক্রিয়, নতুন লেভেল ও স্টার পুরস্কার নির্ধারণ করুন।
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Card className="lg:col-span-5 p-5 space-y-3">
          <h2 className="text-base font-bold text-[#EAC779]">নতুন কিডস গেম যুক্ত করুন</h2>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="বিভাগ">
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as KidsGameCategory)}
              >
                <option value="addition">যোগ (Addition)</option>
                <option value="subtraction">বিয়োগ (Subtraction)</option>
                <option value="multiplication">গুণ (Multiplication)</option>
                <option value="division">ভাগ (Division)</option>
              </Select>
            </FormField>
            <FormField label="খেলার ধরন">
              <Select value={modeId} onChange={(e) => setModeId(e.target.value as KidsGameModeId)}>
                <option value="match_answer">সঠিক উত্তর মেলাও</option>
                <option value="number_puzzle">সংখ্যার ধাঁধা</option>
                <option value="missing_number">হারানো সংখ্যা</option>
                <option value="timed_challenge">সময়ের চ্যালেঞ্জ</option>
                <option value="table_game">নামতা খেলা</option>
                <option value="equal_grouping">সমান ভাগ খেলা</option>
                <option value="find_quotient">ভাগফল খোঁজো</option>
              </Select>
            </FormField>
          </div>
          <FormField label="গেমের নাম (বাংলায়)" required>
            <Input value={titleBn} onChange={(e) => setTitleBn(e.target.value)} placeholder="যেমন: সুপার দ্রুত যোগ খেলা" />
          </FormField>
          <FormField label="খেলার নির্দেশনা">
            <Textarea rows={2} value={instructionsBn} onChange={(e) => setInstructionsBn(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="কঠিনতা">
              <Select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
              >
                <option value="easy">সহজ</option>
                <option value="medium">মধ্যম</option>
                <option value="hard">কঠিন</option>
              </Select>
            </FormField>
            <FormField label="পুরস্কার স্টার">
              <Input
                type="number"
                min={1}
                max={10}
                value={rewardStars}
                onChange={(e) => setRewardStars(Number(e.target.value) || 3)}
              />
            </FormField>
          </div>
          <Button
            onClick={() => {
              if (!titleBn.trim()) return;
              platformService.upsertKidsGame(
                {
                  category,
                  modeId,
                  titleBn: titleBn.trim(),
                  subtitleBn: modeId.replace('_', ' '),
                  instructionsBn: instructionsBn.trim() || 'সঠিক উত্তর বেছে নাও এবং স্টার জিতো!',
                  difficulty,
                  rewardStars,
                  isActive: true,
                  levels: [
                    {
                      id: `lvl-${Date.now()}`,
                      levelNumber: 1,
                      titleBn: 'লেভেল ১: শুরুর রাউন্ড',
                      difficulty,
                      targetScore: 50,
                      rewardStars,
                    },
                  ],
                  customQuestions: [],
                },
                user?.fullName
              );
              setTitleBn('');
              setInstructionsBn('');
              setRev((r) => r + 1);
              pushToast({ title: 'নতুন কিডস গেম যুক্ত হয়েছে', variant: 'success' });
            }}
          >
            <Plus className="h-4 w-4" /> গেম যুক্ত করুন
          </Button>
        </Card>

        <Card className="lg:col-span-7 p-5 space-y-3">
          <h2 className="text-base font-bold text-[#EAC779]">
            সকল কিডস গেম ({toBanglaDigits(games.length)})
          </h2>
          <div className="space-y-2.5">
            {games.map((g) => (
              <div
                key={g.id}
                className="rounded-xl border border-[#D4A853]/20 bg-[#0A0D12] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-[#F5EFE2]">
                    {g.titleBn}{' '}
                    <span className="text-xs font-normal text-[#9DA6B5]">
                      ({g.category} · {toBanglaDigits(g.levels.length)} লেভেল)
                    </span>
                  </p>
                  <p className="text-xs text-[#9DA6B5]">{g.instructionsBn}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      platformService.addKidsGameLevel(g.id, {
                        levelNumber: g.levels.length + 1,
                        titleBn: `লেভেল ${toBanglaDigits(g.levels.length + 1)}: নতুন চ্যালেঞ্জ`,
                        difficulty: 'medium',
                        targetScore: 70,
                        rewardStars: 3,
                      });
                      setRev((r) => r + 1);
                      pushToast({ title: 'নতুন লেভেল যুক্ত হয়েছে', variant: 'success' });
                    }}
                    className="rounded-lg border border-[#D4A853]/30 px-2.5 py-1 text-xs font-semibold text-[#EAC779] cursor-pointer"
                  >
                    + লেভেল
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      platformService.toggleKidsGameActive(g.id);
                      setRev((r) => r + 1);
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                      g.isActive
                        ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                        : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
                    }`}
                  >
                    {g.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
