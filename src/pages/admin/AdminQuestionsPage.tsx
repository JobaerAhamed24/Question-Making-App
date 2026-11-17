import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Edit,
  Eye,
  FileCheck2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  getQuestionTypeIcon,
  QuestionTypeQuickAddBar,
} from '../../components/admin/QuestionTypeButtons';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FormField,
  Input,
  Modal,
  Pagination,
  Select,
  StatusTag,
  Textarea,
} from '../../components/ui/Primitives';
import { GEOMETRY_TRIANGLE_SVG, PHYSICS_CIRCUIT_SVG } from '../../data/seedData';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  formatBnNumber,
  getDifficultyLabelBn,
  getQuestionStatusLabelBn,
  toBanglaDigits,
} from '../../lib/bn';
import {
  appendCqSubPart,
  appendMcqOption,
  calculateCqTotalMarks,
  createDefaultCqSubParts,
  createDefaultMcqOptions,
  insertTextSnippet,
  MATH_SYMBOL_BUTTONS,
  parseQuestionTypeParam,
  QUESTION_TYPE_META,
  relabelMcqOptions,
  removeCqSubPart,
  removeMcqOption,
  validateQuestionDraftByType,
} from '../../lib/questionFormHelpers';
import { questionBankService } from '../../services/questionBankService';
import type {
  CreativeSubPart,
  Question,
  QuestionDifficulty,
  QuestionOption,
  QuestionStatus,
  QuestionTypeCode,
} from '../../types/domain';

const PAGE_SIZE = 8;

export function AdminQuestionsListPage() {
  const { user, revision, bumpRevision } = useAuth();
  const { pushToast } = useToast();

  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Question | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState(
    JSON.stringify(
      [
        {
          classId: 'cls-6',
          subjectId: 'sub-6-math',
          chapterId: 'ch-6-m1',
          questionTypeCode: 'short',
          language: 'bn',
          difficulty: 'easy',
          marks: 2,
          status: 'published',
          prompt: '২৪ এবং ৩৬-এর গরিষ্ঠ সাধারণ গুণনীয়ক (গ.সা.গু.) কত?',
          correctAnswerText: '১২',
          explanation: '২৪ ও ৩৬-এর সাধারণ গুণনীয়কগুলো হলো ১, ২, ৩, ৪, ৬ ও ১২। এর মধ্যে বৃহত্তম ১২।',
        },
      ],
      null,
      2
    )
  );

  const state = useMemo(
    () => (user?.role === 'admin' ? questionBankService.getAdminDashboardSnapshot(user) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, revision]
  );

  if (!user || user.role !== 'admin' || !state) return null;

  const filtered = state.questions.filter((q) => {
    if (classFilter !== 'all' && q.classId !== classFilter) return false;
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    if (typeFilter !== 'all' && q.questionTypeCode !== typeFilter) return false;
    if (searchText.trim() && !q.prompt.toLowerCase().includes(searchText.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getClassName = (id: string) => {
    const cls = state.classes.find((c) => c.id === id);
    return cls?.nameBn || cls?.name || id;
  };
  const getSubjectName = (id: string) => {
    const sub = state.subjects.find((s) => s.id === id);
    return sub?.nameBn || sub?.name || id;
  };
  const getTypeName = (code: QuestionTypeCode) => {
    const qt = state.questionTypes.find((t) => t.code === code);
    return qt?.nameBn || qt?.name || code;
  };

  const hasActiveFilters =
    classFilter !== 'all' ||
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    searchText.trim().length > 0;

  const handleToggleStatus = (q: Question) => {
    const nextStatus: QuestionStatus = q.status === 'published' ? 'draft' : 'published';
    questionBankService.adminSaveQuestion(user, {
      ...q,
      status: nextStatus,
    });
    bumpRevision();
    pushToast({
      title: nextStatus === 'published' ? 'প্রশ্ন প্রকাশিত হয়েছে' : 'প্রশ্ন খসড়ায় স্থানান্তরিত হয়েছে',
      variant: 'info',
    });
  };

  const handleBulkImport = () => {
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('প্রশ্নের একটি খালি নয় এমন JSON অ্যারে প্রদান করুন।');
      }
      const count = questionBankService.adminBulkImportQuestions(user, parsed);
      setBulkOpen(false);
      bumpRevision();
      pushToast({ title: `${toBanglaDigits(count)}টি প্রশ্ন ইমপোর্ট হয়েছে`, variant: 'success' });
    } catch (err) {
      pushToast({
        title: 'বাল্ক ইমপোর্ট ব্যর্থ হয়েছে',
        description: err instanceof Error ? err.message : 'অবৈধ JSON ফরম্যাট।',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold gold-text-gradient">প্রশ্ন ব্যবস্থাপনা</h1>
            <p className="mt-1 text-base text-[#B8C0CE] tabular-nums">
              সকল শ্রেণি ও প্রকাশনা অবস্থায় মোট {formatBnNumber(filtered.length)}টি মাস্টার প্রশ্ন রয়েছে।
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
              <Upload className="h-4 w-4" />
              <span>বাল্ক ইমপোর্ট (JSON)</span>
            </Button>
            <Link
              to="/admin/questions/new"
              className="inline-flex items-center gap-1.5 rounded-lg gold-btn px-4 py-2 text-sm font-bold whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>নতুন প্রশ্ন যোগ করুন</span>
            </Link>
          </div>
        </div>

        {/* Type-based Quick Add Function Buttons */}
        <div className="border-t border-[#D4A853]/15 pt-4 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#D4A853]">
            ধরন অনুযায়ী নতুন প্রশ্ন যোগ করুন
          </p>
          <QuestionTypeQuickAddBar questionTypes={state.questionTypes} compact />
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input
            aria-label="প্রশ্ন অনুসন্ধান করুন"
            placeholder="প্রশ্নের টেক্সট লিখে খুঁজুন..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
          />
          <Select
            aria-label="শ্রেণি ফিল্টার"
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">সকল শ্রেণি</option>
            {state.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameBn || c.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="ধরন ফিল্টার"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">সকল ধরন</option>
            {state.questionTypes.map((qt) => (
              <option key={qt.id} value={qt.code}>
                {qt.nameBn || qt.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="অবস্থা ফিল্টার"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">সকল অবস্থা</option>
            <option value="published">প্রকাশিত</option>
            <option value="draft">খসড়া</option>
            <option value="archived">সংরক্ষিত (আর্কাইভ)</option>
          </Select>
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setClassFilter('all');
                setStatusFilter('all');
                setTypeFilter('all');
                setSearchText('');
                setPage(1);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>ফিল্টার রিসেট করুন</span>
            </Button>
          </div>
        )}
      </Card>

      {paged.length === 0 ? (
        <EmptyState
          title="কোনো মিল পাওয়া যায়নি"
          description="অনুসন্ধান ফিল্টার পরিবর্তন করুন অথবা নতুন একটি মাস্টার প্রশ্ন যুক্ত করুন।"
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-sm font-semibold text-[#EAC779]">
              <tr>
                <th className="px-4 py-3">প্রশ্ন</th>
                <th className="px-4 py-3">শ্রেণি ও বিষয়</th>
                <th className="px-4 py-3">ধরন</th>
                <th className="px-4 py-3">মান</th>
                <th className="px-4 py-3">অবস্থা</th>
                <th className="px-4 py-3 text-right">কার্যক্রম</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4A853]/15">
              {paged.map((q) => (
                <tr key={q.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 max-w-md">
                    <p className="line-clamp-2 text-sm font-medium text-[#F5EFE2]">{q.prompt}</p>
                    <p className="text-xs text-[#8C95A4] font-mono">
                      {q.id} · {q.language === 'bn' ? 'বাংলা' : 'ইংরেজি'} ·{' '}
                      {getDifficultyLabelBn(q.difficulty)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#C2C8D3]">
                    <div className="text-[#F5EFE2]">{getClassName(q.classId)}</div>
                    <div className="text-[#9DA6B5]">{getSubjectName(q.subjectId)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#C2C8D3]">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#EAC779]">
                      {getQuestionTypeIcon(q.questionTypeCode, 'h-3.5 w-3.5 text-[#D4A853]')}
                      <span>{getTypeName(q.questionTypeCode)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-[#F5EFE2] tabular-nums">
                    {toBanglaDigits(q.marks)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusTag
                      tone={
                        q.status === 'published'
                          ? 'active'
                          : q.status === 'draft'
                          ? 'pending'
                          : 'expired'
                      }
                      label={getQuestionStatusLabelBn(q.status)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewTarget(q)}
                        aria-label={`প্রশ্ন প্রিভিউ দেখুন ${q.id}`}
                        title="প্রিভিউ"
                        className="rounded border border-[#D4A853]/25 bg-[#0A0D12] p-1.5 text-[#C2C8D3] hover:border-[#EAC779] hover:text-[#EAC779] cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(q)}
                        aria-label={`অবস্থা পরিবর্তন করুন ${q.id}`}
                        title={q.status === 'published' ? 'খসড়ায় নিন' : 'প্রকাশ করুন'}
                        className="rounded border border-emerald-500/30 bg-emerald-950/40 p-1.5 text-emerald-300 hover:bg-emerald-900/60 cursor-pointer"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <Link
                        to={`/admin/questions/${q.id}/edit`}
                        aria-label={`প্রশ্ন সম্পাদনা করুন ${q.id}`}
                        title="সম্পাদনা"
                        className="rounded border border-[#D4A853]/25 bg-[#0A0D12] p-1.5 text-[#C2C8D3] hover:border-[#EAC779] hover:text-[#EAC779]"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(q)}
                        aria-label={`প্রশ্ন মুছে ফেলুন ${q.id}`}
                        title="মুছে ফেলুন"
                        className="rounded border border-rose-500/30 bg-rose-950/40 p-1.5 text-rose-300 hover:bg-rose-900/60 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4">
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          questionBankService.adminDeleteQuestion(user, deleteTarget.id);
          bumpRevision();
          pushToast({ title: 'প্রশ্ন মুছে ফেলা হয়েছে', variant: 'info' });
        }}
        title="মাস্টার প্রশ্ন মুছে ফেলবেন?"
        message="মাস্টার প্রশ্ন মুছে ফেললে এটি মূল প্রশ্নব্যাংক থেকে সরে যাবে। তবে পূর্বে তৈরি প্রশ্নপত্রের স্ন্যাপশট অক্ষুণ্ণ থাকবে।"
        confirmLabel="মুছে ফেলুন"
        danger
      />

      {/* Question Preview Modal */}
      <Modal
        open={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        title="প্রশ্ন প্রিভিউ"
        maxWidth="max-w-2xl"
      >
        {previewTarget && (
          <QuestionPreviewContent
            questionTypeLabel={getTypeName(previewTarget.questionTypeCode)}
            classNameLabel={getClassName(previewTarget.classId)}
            subjectNameLabel={getSubjectName(previewTarget.subjectId)}
            question={previewTarget}
          />
        )}
      </Modal>

      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="বাল্ক প্রশ্ন ইমপোর্ট (JSON)"
        description="মূল প্রশ্নব্যাংকে একসাথে একাধিক প্রশ্ন যুক্ত করতে কাঠামোগত JSON অ্যারে পেস্ট করুন।"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <Textarea
            rows={12}
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            className="font-mono text-xs"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              বাতিল
            </Button>
            <Button onClick={handleBulkImport}>প্রশ্ন ইমপোর্ট করুন</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function QuestionPreviewContent({
  questionTypeLabel,
  classNameLabel,
  subjectNameLabel,
  question,
}: {
  questionTypeLabel: string;
  classNameLabel: string;
  subjectNameLabel: string;
  question: Pick<
    Question,
    | 'questionTypeCode'
    | 'marks'
    | 'difficulty'
    | 'prompt'
    | 'stimulus'
    | 'equationLatex'
    | 'imageUrl'
    | 'imageCaption'
    | 'options'
    | 'subParts'
    | 'correctAnswerText'
    | 'explanation'
  >;
}) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D4A853]/20 pb-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded bg-[#D4A853] px-2.5 py-1 text-[#090B0E] font-bold">{questionTypeLabel}</span>
          <span className="rounded border border-[#D4A853]/25 bg-[#12161F] px-2.5 py-1 text-[#C2C8D3]">{classNameLabel}</span>
          <span className="rounded border border-[#D4A853]/25 bg-[#12161F] px-2.5 py-1 text-[#C2C8D3]">{subjectNameLabel}</span>
          <span className="rounded border border-[#D4A853]/25 bg-[#12161F] px-2.5 py-1 text-[#C2C8D3]">
            {getDifficultyLabelBn(question.difficulty)}
          </span>
        </div>
        <span className="font-mono text-sm font-bold text-[#EAC779] tabular-nums">
          মান: {toBanglaDigits(question.marks)}
        </span>
      </div>

      {question.stimulus && (
        <div className="rounded-lg border border-[#D4A853]/25 bg-[#090B10] p-3.5 text-[#E5E0D5] leading-relaxed">
          <p className="text-xs font-semibold text-[#D4A853] mb-1">উদ্দীপক:</p>
          <p>{question.stimulus}</p>
        </div>
      )}

      <p className="text-base font-semibold text-[#F5EFE2] leading-relaxed">{question.prompt}</p>

      {question.equationLatex && (
        <div className="rounded-lg border border-[#D4A853]/30 bg-[#0A0D12] px-4 py-2.5 font-mono text-sm text-[#EAC779]">
          {question.equationLatex}
        </div>
      )}

      {question.imageUrl && (
        <div className="space-y-1.5">
          <img
            src={question.imageUrl}
            alt={question.imageCaption || 'প্রশ্নের চিত্র'}
            className="max-h-56 rounded-lg border border-[#D4A853]/30 bg-[#F5EFE2] p-2"
          />
          {question.imageCaption && (
            <p className="text-xs text-[#9DA6B5]">{question.imageCaption}</p>
          )}
        </div>
      )}

      {question.options && question.options.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {question.options.map((opt) => (
            <div
              key={opt.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                opt.isCorrect
                  ? 'border-emerald-500/45 bg-emerald-950/60 font-semibold text-emerald-200'
                  : 'border-[#D4A853]/20 bg-[#0A0D12] text-[#C2C8D3]'
              }`}
            >
              <span className="font-semibold">{opt.label})</span>
              <span>{opt.text || '—'}</span>
            </div>
          ))}
        </div>
      )}

      {question.subParts && question.subParts.length > 0 && (
        <div className="space-y-2 rounded-lg border border-[#D4A853]/20 bg-[#090B10] p-3.5">
          {question.subParts.map((sp) => (
            <div key={sp.id} className="space-y-1 border-b border-[#D4A853]/15 pb-2 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-[#F5EFE2]">
                  {sp.label}) {sp.prompt || '—'}
                </p>
                <span className="font-mono text-xs font-semibold text-[#D4A853] shrink-0">
                  {toBanglaDigits(sp.marks)}
                </span>
              </div>
              {sp.answer && (
                <p className="text-xs text-emerald-300">
                  উত্তর: {sp.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {(question.correctAnswerText || question.explanation) && (
        <div className="rounded-lg border border-emerald-500/35 bg-emerald-950/40 p-3.5 space-y-1">
          {question.correctAnswerText && (
            <p className="text-sm font-semibold text-emerald-300">
              সঠিক উত্তর: {question.correctAnswerText}
            </p>
          )}
          {question.explanation && (
            <p className="text-sm text-[#C2C8D3] leading-relaxed">
              ব্যাখ্যা: {question.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminQuestionFormPage() {
  const { user, bumpRevision } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const { questionId } = useParams<{ questionId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const state = user?.role === 'admin' ? questionBankService.getAdminDashboardSnapshot(user) : null;
  const existing = questionId && state ? state.questions.find((q) => q.id === questionId) : undefined;

  const validTypeCodes = useMemo(
    () => (state ? state.questionTypes.map((qt) => qt.code) : ['mcq', 'cq', 'short', 'fill_blank', 'true_false', 'math', 'image_based'] as QuestionTypeCode[]),
    [state]
  );

  const requestedType = parseQuestionTypeParam(searchParams.get('type'), validTypeCodes);
  const initialType: QuestionTypeCode = existing?.questionTypeCode || requestedType || 'mcq';
  const initialDefaultMarks =
    existing?.marks ||
    state?.questionTypes.find((qt) => qt.code === initialType)?.defaultMarks ||
    1;

  const [classId, setClassId] = useState(existing?.classId || state?.classes[0]?.id || 'cls-6');
  const [groupId, setGroupId] = useState<string>(existing?.groupId || '');
  const [subjectId, setSubjectId] = useState(existing?.subjectId || 'sub-6-math');
  const [chapterId, setChapterId] = useState(existing?.chapterId || 'ch-6-m1');
  const [topicId, setTopicId] = useState(existing?.topicId || '');
  const [questionTypeCode, setQuestionTypeCode] = useState<QuestionTypeCode>(initialType);
  const [language, setLanguage] = useState<'en' | 'bn'>(existing?.language || 'bn');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(existing?.difficulty || 'medium');
  const [marks, setMarks] = useState<number>(initialDefaultMarks);
  const [status, setStatus] = useState<QuestionStatus>(existing?.status || 'published');
  const [prompt, setPrompt] = useState(existing?.prompt || '');
  const [stimulus, setStimulus] = useState(existing?.stimulus || '');
  const [equationLatex, setEquationLatex] = useState(existing?.equationLatex || '');
  const [mathTarget, setMathTarget] = useState<'equation' | 'prompt'>('equation');
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl || GEOMETRY_TRIANGLE_SVG);
  const [imageCaption, setImageCaption] = useState(existing?.imageCaption || '');
  const [correctAnswerText, setCorrectAnswerText] = useState(existing?.correctAnswerText || '');
  const [explanation, setExplanation] = useState(existing?.explanation || '');
  const [previewOpen, setPreviewOpen] = useState(false);

  const [options, setOptions] = useState<QuestionOption[]>(
    existing?.options || createDefaultMcqOptions('bn')
  );

  const [subParts, setSubParts] = useState<CreativeSubPart[]>(
    existing?.subParts || createDefaultCqSubParts()
  );

  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const equationRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (existing || !state) return;
    const nextType = parseQuestionTypeParam(searchParams.get('type'), validTypeCodes);
    if (nextType && nextType !== questionTypeCode) {
      setQuestionTypeCode(nextType);
      const qt = state.questionTypes.find((t) => t.code === nextType);
      if (qt) setMarks(qt.defaultMarks);
      if (nextType === 'true_false' && !correctAnswerText) {
        setCorrectAnswerText(language === 'en' ? 'True' : 'সত্য');
      }
    }
  }, [searchParams, existing, state, validTypeCodes, questionTypeCode, correctAnswerText, language]);

  if (!user || user.role !== 'admin' || !state) return null;

  const selectedClass = state.classes.find((c) => c.id === classId);
  const classGroups = state.groups.filter((g) => g.classId === classId);
  const classSubjects = state.subjects.filter(
    (s) => s.classId === classId && (!groupId || !s.groupId || s.groupId === groupId)
  );
  const subjectChapters = state.chapters.filter((c) => c.subjectId === subjectId);
  const chapterTopics = state.topics.filter((t) => t.chapterId === chapterId);
  const activeTypeObj = state.questionTypes.find((qt) => qt.code === questionTypeCode);
  const typeMeta = QUESTION_TYPE_META[questionTypeCode];

  const handleSelectQuestionType = (code: QuestionTypeCode) => {
    setQuestionTypeCode(code);
    const qt = state.questionTypes.find((t) => t.code === code);
    if (!existing && qt) {
      setMarks(qt.defaultMarks);
    }
    if (code === 'true_false' && !correctAnswerText.trim()) {
      setCorrectAnswerText(language === 'en' ? 'True' : 'সত্য');
    }
    if (code === 'image_based' && !imageUrl) {
      setImageUrl(GEOMETRY_TRIANGLE_SVG);
    }
    if (!existing) {
      setSearchParams({ type: code }, { replace: true });
    }
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleInsertBlank = () => {
    const el = promptRef.current;
    const next = insertTextSnippet(
      prompt,
      ' ________ ',
      el?.selectionStart ?? prompt.length,
      el?.selectionEnd ?? prompt.length
    );
    setPrompt(next);
    el?.focus();
  };

  const handleInsertMathSymbol = (snippet: string) => {
    if (mathTarget === 'prompt') {
      const el = promptRef.current;
      const next = insertTextSnippet(
        prompt,
        snippet,
        el?.selectionStart ?? prompt.length,
        el?.selectionEnd ?? prompt.length
      );
      setPrompt(next);
      el?.focus();
      return;
    }
    const el = equationRef.current;
    const next = insertTextSnippet(
      equationLatex,
      snippet,
      el?.selectionStart ?? equationLatex.length,
      el?.selectionEnd ?? equationLatex.length
    );
    setEquationLatex(next);
    el?.focus();
  };

  const saveQuestion = (overrideStatus?: QuestionStatus, addAnother = false) => {
    const targetStatus = overrideStatus || status;
    const effectiveTfAnswer =
      questionTypeCode === 'true_false'
        ? correctAnswerText.trim() || (language === 'en' ? 'True' : 'সত্য')
        : correctAnswerText.trim();

    const validationError = validateQuestionDraftByType({
      classId,
      subjectId,
      chapterId,
      questionTypeCode,
      language,
      difficulty,
      marks: Number(marks) || 1,
      status: targetStatus,
      prompt,
      stimulus,
      equationLatex,
      imageUrl,
      correctAnswerText: effectiveTfAnswer,
      options,
      subParts,
    });

    if (validationError) {
      pushToast({ title: validationError, variant: 'error' });
      return;
    }

    const correctOpt = options.find((o) => o.isCorrect);

    questionBankService.adminSaveQuestion(user, {
      id: existing?.id,
      classId,
      groupId: selectedClass?.hasGroups && groupId ? groupId : null,
      subjectId,
      chapterId,
      topicId: topicId || null,
      questionTypeCode,
      language,
      difficulty,
      marks: Number(marks) || 1,
      status: targetStatus,
      prompt: prompt.trim(),
      stimulus: questionTypeCode === 'cq' ? stimulus.trim() : undefined,
      equationLatex: questionTypeCode === 'math' ? equationLatex.trim() : undefined,
      imageUrl: questionTypeCode === 'image_based' ? imageUrl.trim() : undefined,
      imageCaption: questionTypeCode === 'image_based' ? imageCaption.trim() : undefined,
      options: questionTypeCode === 'mcq' ? options : undefined,
      subParts: questionTypeCode === 'cq' ? subParts : undefined,
      correctAnswerText:
        questionTypeCode === 'mcq' && correctOpt
          ? `${correctOpt.label}) ${correctOpt.text}`
          : effectiveTfAnswer,
      explanation: explanation.trim(),
    });

    bumpRevision();

    if (addAnother && !existing) {
      setPrompt('');
      setStimulus('');
      setEquationLatex('');
      setImageCaption('');
      setCorrectAnswerText(questionTypeCode === 'true_false' ? (language === 'en' ? 'True' : 'সত্য') : '');
      setExplanation('');
      setOptions(createDefaultMcqOptions(language === 'en' ? 'en' : 'bn'));
      setSubParts(createDefaultCqSubParts());
      pushToast({
        title: `${activeTypeObj?.nameBn || 'প্রশ্ন'} সংরক্ষিত হয়েছে`,
        description: 'একই ধরন ও অধ্যায়ে পরবর্তী প্রশ্ন যোগ করার জন্য ফর্ম প্রস্তুত।',
        variant: 'success',
      });
      return;
    }

    pushToast({
      title: existing
        ? 'প্রশ্ন হালনাগাদ হয়েছে'
        : targetStatus === 'draft'
        ? 'প্রশ্ন খসড়া হিসেবে সংরক্ষিত হয়েছে'
        : 'নতুন প্রশ্ন প্রকাশিত হয়েছে',
      variant: 'success',
    });
    navigate('/admin/questions');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveQuestion();
  };

  return (
    <div className="max-w-5xl space-y-6">
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold gold-text-gradient">
            {existing ? 'মাস্টার প্রশ্ন সম্পাদনা' : 'ধরন অনুযায়ী নতুন মাস্টার প্রশ্ন যোগ করুন'}
          </h1>
          <p className="mt-1 text-sm text-[#B8C0CE]">
            বর্তমান ধরন: <span className="font-semibold text-[#EAC779]">{activeTypeObj?.nameBn}</span> — {typeMeta.helperTextBn}
          </p>
        </div>
        <Link
          to="/admin/questions"
          className="inline-flex items-center rounded-lg gold-outline-btn px-3.5 py-2 text-sm font-semibold whitespace-nowrap"
        >
          ← প্রশ্ন তালিকায় ফিরুন
        </Link>
      </Card>

      {/* Type Selector Function Buttons */}
      <Card className="p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-[#F5EFE2]">
            ১. প্রশ্নের ধরন নির্বাচন করুন
          </h2>
          <span className="text-xs font-medium text-[#9DA6B5]">
            ধরন পরিবর্তন করলে সংশ্লিষ্ট ইনপুট ও ফাংশন বাটন স্বয়ংক্রিয়ভাবে চালু হবে
          </span>
        </div>
        <div
          role="group"
          aria-label="প্রশ্নের ধরন নির্বাচন বাটনসমূহ"
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7"
        >
          {state.questionTypes
            .filter((qt) => qt.isActive)
            .map((qt) => {
              const selected = questionTypeCode === qt.code;
              return (
                <button
                  key={qt.id}
                  type="button"
                  onClick={() => handleSelectQuestionType(qt.code)}
                  aria-pressed={selected}
                  className={`flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-all cursor-pointer ${
                    selected
                      ? 'gold-btn'
                      : 'border-[#D4A853]/28 bg-[#0A0D12] text-[#E5E0D5] hover:border-[#EAC779] hover:bg-[#141822]'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className={selected ? 'text-[#090B0E]' : 'text-[#EAC779]'}>
                      {getQuestionTypeIcon(qt.code, 'h-4 w-4')}
                    </span>
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        selected ? 'text-[#090B0E]/80 font-bold' : 'text-[#9DA6B5]'
                      }`}
                    >
                      {toBanglaDigits(qt.defaultMarks)} মান
                    </span>
                  </div>
                  <span className="text-xs font-semibold leading-snug">{qt.nameBn}</span>
                </button>
              );
            })}
        </div>
      </Card>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Academic Hierarchy */}
          <div className="space-y-3">
            <h2 className="font-display text-base font-bold text-[#F5EFE2]">
              ২. শ্রেণি, বিষয় ও অধ্যায় নির্ধারণ
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <FormField label="শ্রেণি" htmlFor="qf-class" required>
                <Select
                  id="qf-class"
                  value={classId}
                  onChange={(e) => {
                    const nextCls = e.target.value;
                    setClassId(nextCls);
                    const nextGrp = state.groups.find((g) => g.classId === nextCls);
                    setGroupId(nextGrp?.id || '');
                    const firstSub = state.subjects.find((s) => s.classId === nextCls);
                    setSubjectId(firstSub?.id || '');
                    const firstCh = firstSub
                      ? state.chapters.find((c) => c.subjectId === firstSub.id)
                      : undefined;
                    setChapterId(firstCh?.id || '');
                    setTopicId('');
                  }}
                >
                  {state.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameBn || c.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              {selectedClass?.hasGroups && (
                <FormField label="বিভাগ" htmlFor="qf-group">
                  <Select
                    id="qf-group"
                    value={groupId}
                    onChange={(e) => {
                      const nextGrp = e.target.value;
                      setGroupId(nextGrp);
                      const firstSub = state.subjects.find(
                        (s) => s.classId === classId && (!nextGrp || !s.groupId || s.groupId === nextGrp)
                      );
                      if (firstSub) {
                        setSubjectId(firstSub.id);
                        const firstCh = state.chapters.find((c) => c.subjectId === firstSub.id);
                        setChapterId(firstCh?.id || '');
                      }
                    }}
                  >
                    <option value="">সকল বিভাগ</option>
                    {classGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nameBn || g.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              <FormField label="বিষয়" htmlFor="qf-subject" required>
                <Select
                  id="qf-subject"
                  value={subjectId}
                  onChange={(e) => {
                    const nextSub = e.target.value;
                    setSubjectId(nextSub);
                    const firstCh = state.chapters.find((c) => c.subjectId === nextSub);
                    setChapterId(firstCh?.id || '');
                    setTopicId('');
                  }}
                >
                  {classSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameBn || s.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="অধ্যায়" htmlFor="qf-chapter" required>
                <Select
                  id="qf-chapter"
                  value={chapterId}
                  onChange={(e) => {
                    setChapterId(e.target.value);
                    setTopicId('');
                  }}
                >
                  {subjectChapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      অধ্যায় {toBanglaDigits(c.chapterNumber)}: {c.nameBn || c.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="টপিক" htmlFor="qf-topic">
                <Select id="qf-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                  <option value="">নির্বাচিত নয়</option>
                  {chapterTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nameBn || t.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </div>

          {/* Language, Difficulty, Marks & Status Controls */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-[#D4A853]/25 bg-[#0A0D12] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-[#E5E0D5]">ভাষা</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { val: 'bn' as const, label: 'বাংলা' },
                  { val: 'en' as const, label: 'ইংরেজি' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setLanguage(opt.val)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-all cursor-pointer ${
                      language === opt.val
                        ? 'gold-btn'
                        : 'border-[#D4A853]/25 bg-[#12161F] text-[#C2C8D3] hover:border-[#EAC779]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-[#E5E0D5]">কঠিনতার স্তর</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['easy', 'medium', 'hard'] as QuestionDifficulty[]).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-all cursor-pointer ${
                      difficulty === diff
                        ? 'gold-btn'
                        : 'border-[#D4A853]/25 bg-[#12161F] text-[#C2C8D3] hover:border-[#EAC779]'
                    }`}
                  >
                    {getDifficultyLabelBn(diff)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="qf-marks" className="block text-sm font-medium text-[#E5E0D5]">
                নম্বর (মান)
              </label>
              <div className="flex items-center gap-1.5">
                <Input
                  id="qf-marks"
                  type="number"
                  min={1}
                  max={100}
                  value={marks}
                  onChange={(e) => setMarks(Number(e.target.value))}
                  className="!w-16 shrink-0 font-mono px-2.5 text-center"
                />
                <div className="flex items-center gap-1">
                  {typeMeta.marksPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMarks(preset)}
                      className={`rounded border px-2 py-2 text-xs font-semibold tabular-nums cursor-pointer ${
                        marks === preset
                          ? 'gold-btn'
                          : 'border-[#D4A853]/25 bg-[#12161F] text-[#C2C8D3] hover:border-[#EAC779]'
                      }`}
                    >
                      {toBanglaDigits(preset)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <FormField label="প্রকাশনা অবস্থা" htmlFor="qf-status">
              <Select
                id="qf-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as QuestionStatus)}
              >
                <option value="published">প্রকাশিত</option>
                <option value="draft">খসড়া</option>
                <option value="archived">সংরক্ষিত</option>
              </Select>
            </FormField>
          </div>

          {/* CQ Stimulus */}
          {questionTypeCode === 'cq' && (
            <FormField label="সৃজনশীল প্রশ্নের উদ্দীপক" htmlFor="qf-stem" required>
              <Textarea
                id="qf-stem"
                rows={3}
                placeholder="উদ্দীপকের অনুচ্ছেদ বা ঘটনাটি লিখুন..."
                value={stimulus}
                onChange={(e) => setStimulus(e.target.value)}
                required
              />
            </FormField>
          )}

          {/* Prompt + Type-specific helper toolbar */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="qf-prompt" className="block text-sm font-medium text-[#E5E0D5]">
                প্রশ্নের মূল লেখা <span className="text-[#E6C16E]">*</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {questionTypeCode === 'fill_blank' && (
                  <Button variant="outline" size="sm" onClick={handleInsertBlank}>
                    <Plus className="h-3.5 w-3.5" />
                    <span>শূন্যস্থান (________) বসান</span>
                  </Button>
                )}
                {questionTypeCode === 'cq' && !prompt.trim() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrompt('উদ্দীপকের আলোকে নিচের প্রশ্নগুলোর উত্তর দাও:')}
                  >
                    <span>আদর্শ নির্দেশনা বসান</span>
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              ref={promptRef}
              id="qf-prompt"
              rows={3}
              placeholder={
                questionTypeCode === 'fill_blank'
                  ? 'যেমন: বাংলাদেশের জাতীয় কবির নাম ________।'
                  : 'বাংলা বা ইংরেজিতে মূল প্রশ্নটি লিখুন...'
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
            />
          </div>

          {/* Math Equation + Interactive Symbol Palette */}
          {questionTypeCode === 'math' && (
            <div className="space-y-3 rounded-xl border border-[#D4A853]/25 bg-[#0A0D12] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="qf-eq" className="text-sm font-semibold text-[#EAC779]">
                  গাণিতিক সমীকরণ / রাশি ও প্রতীক প্যালেট
                </label>
                <div className="inline-flex rounded-lg border border-[#D4A853]/30 bg-[#07090C] p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setMathTarget('equation')}
                    className={`rounded-md px-2.5 py-1 font-semibold cursor-pointer ${
                      mathTarget === 'equation'
                        ? 'gold-btn'
                        : 'text-[#B8C0CE] hover:text-[#F5EFE2]'
                    }`}
                  >
                    সমীকরণে যোগ
                  </button>
                  <button
                    type="button"
                    onClick={() => setMathTarget('prompt')}
                    className={`rounded-md px-2.5 py-1 font-semibold cursor-pointer ${
                      mathTarget === 'prompt'
                        ? 'gold-btn'
                        : 'text-[#B8C0CE] hover:text-[#F5EFE2]'
                    }`}
                  >
                    প্রশ্নে যোগ
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {MATH_SYMBOL_BUTTONS.map((sym) => (
                  <button
                    key={sym.label}
                    type="button"
                    title={sym.title}
                    aria-label={`প্রতীক ${sym.title} যোগ করুন`}
                    onClick={() => handleInsertMathSymbol(sym.snippet)}
                    className="rounded-md border border-[#D4A853]/30 bg-[#12161F] px-2.5 py-1.5 font-mono text-sm font-semibold text-[#F5EFE2] hover:border-[#EAC779] hover:bg-[#D4A853] hover:text-[#090B0E] transition-colors cursor-pointer"
                  >
                    {sym.label}
                  </button>
                ))}
              </div>

              <Input
                ref={equationRef}
                id="qf-eq"
                className="font-mono"
                placeholder="যেমন: 2x + 5 = 17 অথবা \\frac{a}{b}"
                value={equationLatex}
                onChange={(e) => setEquationLatex(e.target.value)}
              />
            </div>
          )}

          {/* Image-Based Controls */}
          {questionTypeCode === 'image_based' && (
            <div className="space-y-3 rounded-xl border border-[#D4A853]/25 bg-[#0A0D12] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#EAC779]">
                  চিত্র ও ডায়াগ্রাম নির্ধারণ
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={imageUrl === GEOMETRY_TRIANGLE_SVG ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setImageUrl(GEOMETRY_TRIANGLE_SVG)}
                  >
                    জ্যামিতিক ত্রিভুজ চিত্র
                  </Button>
                  <Button
                    variant={imageUrl === PHYSICS_CIRCUIT_SVG ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setImageUrl(PHYSICS_CIRCUIT_SVG)}
                  >
                    পদার্থবিজ্ঞান বর্তনী চিত্র
                  </Button>
                  {imageUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setImageUrl('');
                        setImageCaption('');
                      }}
                    >
                      চিত্র সরান
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="নিজস্ব চিত্র আপলোড করুন" htmlFor="qf-img">
                  <input
                    type="file"
                    id="qf-img"
                    accept="image/*"
                    onChange={handleImageFile}
                    className="block w-full rounded-lg border border-[#D4A853]/28 bg-[#090B10] px-3 py-2 text-sm text-[#C2C8D3]"
                  />
                </FormField>
                <FormField label="অথবা ছবির URL দিন" htmlFor="qf-img-url">
                  <Input
                    id="qf-img-url"
                    placeholder="https://... বা data:image/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </FormField>
              </div>

              <FormField label="চিত্রের ক্যাপশন" htmlFor="qf-img-cap">
                <Input
                  id="qf-img-cap"
                  placeholder="যেমন: চিত্রে ABC একটি সমকোণী ত্রিভুজ"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                />
              </FormField>

              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="চিত্রের প্রিভিউ"
                  className="max-h-44 rounded-lg border border-[#D4A853]/30 bg-[#F5EFE2] p-1.5"
                />
              )}
            </div>
          )}

          {/* MCQ Builder with Add/Remove/Relabel Function Buttons */}
          {questionTypeCode === 'mcq' && (
            <div className="space-y-3 rounded-xl border border-[#D4A853]/25 bg-[#0A0D12] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#EAC779]">
                  বহুনির্বাচনি বিকল্পসমূহ (সঠিক উত্তরটি চিহ্নিত করুন)
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOptions((prev) => relabelMcqOptions(prev, 'bn'))}
                  >
                    ক, খ, গ, ঘ লেবেল
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOptions((prev) => relabelMcqOptions(prev, 'en'))}
                  >
                    A, B, C, D লেবেল
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={options.length >= 6}
                    onClick={() =>
                      setOptions((prev) =>
                        appendMcqOption(prev, language === 'en' ? 'en' : 'bn')
                      )
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>বিকল্প যোগ করুন</span>
                  </Button>
                </div>
              </div>

              {options.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="mcq-correct"
                    checked={opt.isCorrect}
                    onChange={() =>
                      setOptions((prev) =>
                        prev.map((o, i) => ({ ...o, isCorrect: i === idx }))
                      )
                    }
                    aria-label={`বিকল্প ${opt.label} সঠিক হিসেবে চিহ্নিত করুন`}
                    className="h-4 w-4 accent-[#D4A853] cursor-pointer"
                  />
                  <Input
                    aria-label={`বিকল্প ${idx + 1} লেবেল`}
                    className="w-16 text-center font-semibold"
                    value={opt.label}
                    onChange={(e) =>
                      setOptions((prev) =>
                        prev.map((o, i) => (i === idx ? { ...o, label: e.target.value } : o))
                      )
                    }
                  />
                  <Input
                    aria-label={`বিকল্প ${opt.label}-এর লেখা`}
                    placeholder={`বিকল্প ${opt.label}-এর লেখা`}
                    value={opt.text}
                    onChange={(e) =>
                      setOptions((prev) =>
                        prev.map((o, i) => (i === idx ? { ...o, text: e.target.value } : o))
                      )
                    }
                  />
                  <Button
                    variant={opt.isCorrect ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() =>
                      setOptions((prev) =>
                        prev.map((o, i) => ({ ...o, isCorrect: i === idx }))
                      )
                    }
                  >
                    {opt.isCorrect ? 'সঠিক উত্তর' : 'সঠিক ধরুন'}
                  </Button>
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setOptions((prev) => removeMcqOption(prev, idx))}
                      aria-label={`বিকল্প ${opt.label} মুছুন`}
                      className="rounded-lg border border-rose-500/35 bg-rose-950/40 p-2 text-rose-300 hover:bg-rose-900/60 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* CQ Sub-parts Builder with Add/Remove/Sum Function Buttons */}
          {questionTypeCode === 'cq' && (
            <div className="space-y-3 rounded-xl border border-[#D4A853]/25 bg-[#0A0D12] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#EAC779]">
                  সৃজনশীল প্রশ্নের অংশসমূহ ({toBanglaDigits(subParts.length)}টি অংশ · মোট নম্বর{' '}
                  {toBanglaDigits(calculateCqTotalMarks(subParts))})
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const std = createDefaultCqSubParts();
                      setSubParts(std);
                      setMarks(calculateCqTotalMarks(std));
                    }}
                  >
                    ক–ঘ (১০ নম্বর) রিসেট
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMarks(calculateCqTotalMarks(subParts))}
                  >
                    মোট নম্বর সিঙ্ক করুন ({toBanglaDigits(calculateCqTotalMarks(subParts))})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={subParts.length >= 6}
                    onClick={() => setSubParts((prev) => appendCqSubPart(prev))}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>অংশ যোগ করুন</span>
                  </Button>
                </div>
              </div>

              {subParts.map((sp, idx) => (
                <div
                  key={sp.id}
                  className="grid grid-cols-1 gap-2.5 rounded-lg border border-[#D4A853]/20 bg-[#12161F] p-3.5 sm:grid-cols-12"
                >
                  <div className="sm:col-span-2">
                    <Input
                      aria-label={`অংশ ${idx + 1} লেবেল`}
                      value={sp.label}
                      onChange={(e) =>
                        setSubParts((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, label: e.target.value } : p))
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-7">
                    <Input
                      aria-label={`অংশ ${sp.label}-এর প্রশ্ন`}
                      placeholder={`অংশ ${sp.label}-এর প্রশ্ন লিখুন`}
                      value={sp.prompt}
                      onChange={(e) =>
                        setSubParts((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, prompt: e.target.value } : p))
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      aria-label={`অংশ ${sp.label}-এর নম্বর`}
                      type="number"
                      min={1}
                      value={sp.marks}
                      onChange={(e) =>
                        setSubParts((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, marks: Number(e.target.value) } : p
                          )
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    {subParts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSubParts((prev) => removeCqSubPart(prev, idx))}
                        aria-label={`অংশ ${sp.label} মুছুন`}
                        className="rounded-lg border border-rose-500/35 bg-rose-950/40 p-2 text-rose-300 hover:bg-rose-900/60 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="sm:col-span-12">
                    <Input
                      aria-label={`অংশ ${sp.label}-এর নমুনা উত্তর`}
                      placeholder={`অংশ ${sp.label}-এর নমুনা উত্তর লিখুন`}
                      value={sp.answer}
                      onChange={(e) =>
                        setSubParts((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, answer: e.target.value } : p))
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* True / False Interactive Toggle Buttons */}
          {questionTypeCode === 'true_false' && (
            <div className="space-y-2 rounded-xl border border-[#D4A853]/25 bg-[#0A0D12] p-4">
              <p className="text-sm font-semibold text-[#EAC779]">
                সঠিক উত্তর নির্বাচন করুন <span className="text-[#E6C16E]">*</span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                {['সত্য', 'মিথ্যা', 'True', 'False'].map((val) => {
                  const active = (correctAnswerText || 'সত্য') === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCorrectAnswerText(val)}
                      aria-pressed={active}
                      className={`rounded-lg border px-5 py-2 text-sm font-semibold transition-all cursor-pointer ${
                        active
                          ? 'gold-btn'
                          : 'border-[#D4A853]/25 bg-[#12161F] text-[#C2C8D3] hover:border-[#EAC779]'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Correct Answer for Short / Fill Blank / Math / Image-Based */}
          {questionTypeCode !== 'mcq' &&
            questionTypeCode !== 'cq' &&
            questionTypeCode !== 'true_false' && (
              <FormField
                label={
                  questionTypeCode === 'fill_blank'
                    ? 'শূন্যস্থানের সঠিক শব্দ / উত্তর'
                    : 'সঠিক উত্তর'
                }
                htmlFor="qf-ans"
                required={questionTypeCode === 'fill_blank'}
              >
                <Textarea
                  id="qf-ans"
                  rows={2}
                  placeholder={
                    questionTypeCode === 'fill_blank'
                      ? 'শূন্যস্থানে যে সঠিক শব্দ বসবে তা লিখুন...'
                      : 'আদর্শ উত্তর লিখুন...'
                  }
                  value={correctAnswerText}
                  onChange={(e) => setCorrectAnswerText(e.target.value)}
                />
              </FormField>
            )}

          <FormField label="উত্তরের ব্যাখ্যা ও মূল্যায়ন নির্দেশনা" htmlFor="qf-exp">
            <Textarea
              id="qf-exp"
              rows={2}
              placeholder="শিক্ষার্থীর বোঝার সুবিধার্থে সংক্ষিপ্ত ব্যাখ্যা বা সমাধান ধাপ লিখুন..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
            />
          </FormField>

          {/* Form Action Function Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D4A853]/20 pt-4">
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4" />
              <span>লাইভ প্রিভিউ</span>
            </Button>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="outline" onClick={() => navigate('/admin/questions')}>
                বাতিল
              </Button>
              <Button
                variant="outline"
                onClick={() => saveQuestion('draft', false)}
              >
                <Save className="h-4 w-4" />
                <span>খসড়া হিসেবে রাখুন</span>
              </Button>
              {!existing && (
                <Button
                  variant="secondary"
                  onClick={() => saveQuestion(status, true)}
                >
                  <Plus className="h-4 w-4" />
                  <span>সংরক্ষণ ও আরেকটি যোগ করুন</span>
                </Button>
              )}
              <Button type="submit">
                <FileCheck2 className="h-4 w-4" />
                <span>{existing ? 'প্রশ্ন হালনাগাদ করুন' : 'প্রশ্ন প্রকাশ করুন'}</span>
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Live Preview Modal */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="নতুন প্রশ্নের লাইভ প্রিভিউ"
        maxWidth="max-w-2xl"
      >
        <QuestionPreviewContent
          questionTypeLabel={activeTypeObj?.nameBn || questionTypeCode}
          classNameLabel={selectedClass?.nameBn || classId}
          subjectNameLabel={
            state.subjects.find((s) => s.id === subjectId)?.nameBn || subjectId
          }
          question={{
            questionTypeCode,
            marks,
            difficulty,
            prompt: prompt || 'এখানে প্রশ্নের মূল লেখা দেখাবে...',
            stimulus: questionTypeCode === 'cq' ? stimulus : undefined,
            equationLatex: questionTypeCode === 'math' ? equationLatex : undefined,
            imageUrl: questionTypeCode === 'image_based' ? imageUrl : undefined,
            imageCaption: questionTypeCode === 'image_based' ? imageCaption : undefined,
            options: questionTypeCode === 'mcq' ? options : undefined,
            subParts: questionTypeCode === 'cq' ? subParts : undefined,
            correctAnswerText:
              questionTypeCode === 'mcq'
                ? (() => {
                    const c = options.find((o) => o.isCorrect);
                    return c ? `${c.label}) ${c.text}` : '';
                  })()
                : correctAnswerText,
            explanation,
          }}
        />
      </Modal>
    </div>
  );
}
