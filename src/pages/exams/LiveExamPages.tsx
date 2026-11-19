import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Flag,
  Globe,
  Lock,
  Play,
  Plus,
  Search,
  Shuffle,
  Trophy,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  Select,
  StatusTag,
  Textarea,
} from '../../components/ui/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatBnDateTime, toBanglaDigits } from '../../lib/bn';
import { examService, type ExamSummary } from '../../services/examService';
import { questionBankService } from '../../services/questionBankService';
import type {
  ExamAnswerReview,
  ExamAttempt,
  LiveExamComputedStatus,
  LiveExamQuestionPublic,
} from '../../types/domain';

function formatTimerClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}

// --- 1. Live Exams Hub Page ---
export function LiveExamsHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { classes, subjects } = questionBankService.getAcademicCatalogue();

  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [myAttempts, setMyAttempts] = useState<ExamAttempt[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | LiveExamComputedStatus>('all');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [search, setSearch] = useState('');

  // Private Exam Access Modal
  const [privateTarget, setPrivateTarget] = useState<ExamSummary | null>(null);
  const [accessCodeInput, setAccessCodeInput] = useState('');

  const filteredSubjects = useMemo(
    () => (classFilter ? subjects.filter((s) => s.classId === classFilter) : subjects),
    [classFilter, subjects]
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      examService.listExams({
        status: statusFilter,
        classId: classFilter || undefined,
        subjectId: subjectFilter || undefined,
        search,
      }),
      user ? examService.listMyAttempts(user.id) : Promise.resolve({ attempts: [] }),
    ]).then(([exRes, attRes]) => {
      if (!active) return;
      setExams(exRes.exams);
      setMyAttempts(attRes.attempts);
    });
    return () => {
      active = false;
    };
  }, [statusFilter, classFilter, subjectFilter, search, user?.id]);

  const getClassName = (id: string) => classes.find((c) => c.id === id)?.nameBn || id;
  const getSubjectName = (id: string) => subjects.find((s) => s.id === id)?.nameBn || id;

  const handleStartExam = (exam: ExamSummary) => {
    if (exam.accessMode === 'private') {
      setPrivateTarget(exam);
      setAccessCodeInput('');
      return;
    }
    navigate(`/exams/${exam.id}/take`);
  };

  const handleJoinPrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateTarget) return;
    try {
      await examService.getExamForTaking(privateTarget.id, accessCodeInput);
      const id = privateTarget.id;
      const code = encodeURIComponent(accessCodeInput.trim());
      setPrivateTarget(null);
      navigate(`/exams/${id}/take?code=${code}`);
    } catch (err) {
      pushToast({
        title: 'অ্যাক্সেস কোড সঠিক নয়',
        description: err instanceof Error ? err.message : 'সঠিক কোড দিন।',
        variant: 'error',
      });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-8 font-bangla text-[#F3EEE3]">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-[#D4A853]">
            CHORCHHA-STYLE LIVE EXAM ARENA
          </p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold gold-text-gradient">
            লাইভ অনলাইন পরীক্ষা
          </h1>
          <p className="mt-2 text-base text-[#B8C0CE] max-w-2xl">
            প্রশ্নব্যাংক থেকে বাছাইকৃত বহুনির্বাচনি প্রশ্নে সময়সীমা-ভিত্তিক লাইভ পরীক্ষা দিন, তাৎক্ষণিক ফলাফল দেখুন এবং লিডারবোর্ডে অবস্থান তৈরি করুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-2 rounded-lg gold-outline-btn px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
          >
            <Trophy className="h-4 w-4 text-[#EAC779]" />
            <span>লিডারবোর্ড</span>
          </Link>
          <Link
            to="/exams/new"
            className="inline-flex items-center gap-2 rounded-lg gold-btn px-4 py-2.5 text-sm font-bold whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>নতুন পরীক্ষা তৈরি করুন</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#8C95A4]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="পরীক্ষা খুঁজুন..."
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | LiveExamComputedStatus)}
          >
            <option value="all">সকল অবস্থা</option>
            <option value="live">চলমান (Live)</option>
            <option value="upcoming">আসন্ন (Upcoming)</option>
            <option value="ended">সমাপ্ত (Ended)</option>
          </Select>
          <Select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setSubjectFilter('');
            }}
          >
            <option value="">সকল শ্রেণি</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameBn}
              </option>
            ))}
          </Select>
          <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="">সকল বিষয়</option>
            {filteredSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameBn}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Exams Grid */}
      {exams.length === 0 ? (
        <EmptyState
          title="কোনো পরীক্ষা পাওয়া যায়নি"
          description="ফিল্টার পরিবর্তন করুন অথবা প্রশ্নব্যাংক থেকে নতুন লাইভ পরীক্ষা তৈরি করুন।"
          icon={<BookOpen className="h-5 w-5" />}
          action={
            <Link to="/exams/new" className="rounded-lg gold-btn px-4 py-2 text-sm font-bold">
              পরীক্ষা তৈরি করুন
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {exams.map((exam) => {
            const existingAttempt = myAttempts.find((a) => a.examId === exam.id);
            const statusTone =
              exam.computedStatus === 'live'
                ? 'active'
                : exam.computedStatus === 'upcoming'
                ? 'pending'
                : 'draft';
            const statusText =
              exam.computedStatus === 'live'
                ? 'চলমান লাইভ'
                : exam.computedStatus === 'upcoming'
                ? 'আসন্ন পরীক্ষা'
                : 'সমাপ্ত';

            return (
              <Card key={exam.id} className="p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-[#D4A853] font-semibold">
                      <span>{getClassName(exam.classId)}</span>
                      <span>•</span>
                      <span>{getSubjectName(exam.subjectId)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {exam.accessMode === 'private' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-300 font-semibold">
                          <Lock className="h-3.5 w-3.5" />
                          <span>প্রাইভেট</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-[#9DA6B5]">
                          <Globe className="h-3.5 w-3.5" />
                          <span>পাবলিক</span>
                        </span>
                      )}
                      <StatusTag tone={statusTone} label={statusText} />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-[#F5EFE2]">{exam.title}</h2>
                    <p className="mt-1.5 text-sm text-[#B8C0CE] leading-relaxed">
                      {exam.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-3 text-center tabular-nums">
                    <div>
                      <p className="text-base font-bold text-[#EAC779]">
                        {toBanglaDigits(exam.questionIds.length)}টি
                      </p>
                      <p className="text-[11px] text-[#9DA6B5]">মোট MCQ</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-[#F5EFE2]">
                        {toBanglaDigits(exam.durationMinutes)} মি.
                      </p>
                      <p className="text-[11px] text-[#9DA6B5]">সময়সীমা</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-[#F5EFE2]">
                        {toBanglaDigits(exam.totalMarks)}
                      </p>
                      <p className="text-[11px] text-[#9DA6B5]">পূর্ণমান</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-[#C2C8D3]">
                        {exam.negativeMarkingPerWrong > 0
                          ? `-${toBanglaDigits(exam.negativeMarkingPerWrong)}`
                          : 'নেই'}
                      </p>
                      <p className="text-[11px] text-[#9DA6B5]">নেগেটিভ মার্ক</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D4A853]/15 pt-3 text-xs text-[#9DA6B5]">
                  <div className="space-y-0.5 tabular-nums">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#D4A853]" />
                      <span>শেষ: {formatBnDateTime(exam.endsAt)}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-[#D4A853]" />
                      <span>অংশগ্রহণ: {toBanglaDigits(exam.participantCount)} জন</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {existingAttempt && (
                      <Link
                        to={`/exams/${exam.id}/result/${existingAttempt.id}`}
                        className="rounded-lg gold-outline-btn px-3.5 py-2 text-xs font-semibold text-[#EAC779]"
                      >
                        আপনার ফলাফল ({toBanglaDigits(existingAttempt.finalScore)})
                      </Link>
                    )}

                    {exam.computedStatus === 'live' ? (
                      <Button size="sm" onClick={() => handleStartExam(exam)}>
                        <Play className="h-3.5 w-3.5" />
                        <span>{existingAttempt ? 'পুনরায় দিন' : 'পরীক্ষায় অংশ নিন'}</span>
                      </Button>
                    ) : exam.computedStatus === 'upcoming' ? (
                      <span className="text-xs font-semibold text-amber-300">
                        শুরু: {formatBnDateTime(exam.startsAt)}
                      </span>
                    ) : (
                      <span className="text-xs text-[#8C95A4]">সময় শেষ</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Private Exam Access Modal */}
      {privateTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <Card className="w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#EAC779]">
                <Lock className="h-5 w-5" />
                <h2 className="text-lg font-bold">প্রাইভেট পরীক্ষার কোড</h2>
              </div>
              <button
                type="button"
                onClick={() => setPrivateTarget(null)}
                className="text-[#9DA6B5] hover:text-[#F5EFE2]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-[#B8C0CE]">{privateTarget.title}</p>
            <form onSubmit={handleJoinPrivate} className="space-y-4">
              <FormField label="অ্যাক্সেস কোড" htmlFor="priv-code" required>
                <Input
                  id="priv-code"
                  value={accessCodeInput}
                  onChange={(e) => setAccessCodeInput(e.target.value)}
                  placeholder="যেমন: MATH2026"
                  autoFocus
                />
              </FormField>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setPrivateTarget(null)}>
                  বাতিল
                </Button>
                <Button type="submit">প্রবেশ করুন</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- 2. Create Live Exam Page ---
export function CreateLiveExamPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { classes, subjects } = questionBankService.getAcademicCatalogue();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState(classes[2]?.id || classes[0]?.id || 'cls-8');
  const [subjectId, setSubjectId] = useState(
    () => subjects.find((s) => s.classId === (classes[2]?.id || classes[0]?.id))?.id || ''
  );
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [marksPerQuestion, setMarksPerQuestion] = useState(1);
  const [negativeMarking, setNegativeMarking] = useState(0.25);
  const [accessMode, setAccessMode] = useState<'public' | 'private'>('public');
  const [accessCode, setAccessCode] = useState('');

  // Default start now, end +48 hours
  const toLocalDt = (ms: number) => {
    const d = new Date(ms - new Date().getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  };
  const [startsAt, setStartsAt] = useState(() => toLocalDt(Date.now() - 60000));
  const [endsAt, setEndsAt] = useState(() => toLocalDt(Date.now() + 48 * 3600 * 1000));

  // Question Bank Selection
  const [bankQuestions, setBankQuestions] = useState<
    Array<{ id: string; classId: string; subjectId: string; difficulty: string; prompt: string }>
  >([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [randomCount, setRandomCount] = useState(10);
  const [bankSearch, setBankSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const classSubjects = useMemo(
    () => subjects.filter((s) => s.classId === classId),
    [classId, subjects]
  );

  useEffect(() => {
    examService
      .listBankMcqsForBuilder({
        classId: classId || undefined,
        subjectId: subjectId || undefined,
        difficulty: difficultyFilter || undefined,
        search: bankSearch,
      })
      .then((res) => setBankQuestions(res.questions));
  }, [classId, subjectId, difficultyFilter, bankSearch]);

  const toggleQuestion = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : prev.length >= 100
        ? prev
        : [...prev, id]
    );
  };

  const handlePickRandom = () => {
    const picked = examService.pickRandomMcqIds(
      { classId, subjectId, difficulty: difficultyFilter || undefined },
      randomCount
    );
    setSelectedIds(picked);
    pushToast({
      title: 'প্রশ্নব্যাংক থেকে র‍্যান্ডম প্রশ্ন বাছাই হয়েছে',
      description: `${toBanglaDigits(picked.length)}টি MCQ স্বয়ংক্রিয়ভাবে যুক্ত করা হয়েছে।`,
      variant: 'success',
    });
  };

  const totalMarks = Number((selectedIds.length * marksPerQuestion).toFixed(2));

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      pushToast({
        title: 'লগইন প্রয়োজন',
        description: 'লাইভ পরীক্ষা তৈরি ও প্রকাশ করতে প্রথমে লগইন করুন।',
        variant: 'warning',
      });
      navigate('/login');
      return;
    }

    setSubmitting(true);
    try {
      await examService.createExam({
        title,
        description,
        classId,
        subjectId,
        questionIds: selectedIds,
        durationMinutes,
        marksPerQuestion,
        negativeMarkingPerWrong: negativeMarking,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        accessMode,
        accessCode,
      });
      pushToast({
        title: 'লাইভ পরীক্ষা প্রকাশিত হয়েছে',
        description: `${toBanglaDigits(selectedIds.length)}টি প্রশ্নসহ পরীক্ষাটি এখন লাইভ তালিকায় যুক্ত হয়েছে।`,
        variant: 'success',
      });
      navigate('/exams');
    } catch (err) {
      pushToast({
        title: 'পরীক্ষা তৈরি করা যায়নি',
        description: err instanceof Error ? err.message : 'সব তথ্য যাচাই করে পুনরায় চেষ্টা করুন।',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-6 font-bangla text-[#F3EEE3]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/exams" className="text-sm font-semibold text-[#EAC779] hover:underline">
            ← লাইভ পরীক্ষা তালিকায় ফিরুন
          </Link>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold gold-text-gradient">
            নতুন লাইভ পরীক্ষা কনফিগারেশন
          </h1>
          <p className="mt-1 text-sm text-[#B8C0CE]">
            কেন্দ্রীয় প্রশ্নব্যাংক থেকে ম্যানুয়াল বা র‍্যান্ডম (১০–১০০টি MCQ) প্রশ্ন নির্বাচন করে লাইভ পরীক্ষা তৈরি করুন।
          </p>
        </div>

        {!user && (
          <Link
            to="/login"
            className="rounded-lg gold-outline-btn px-4 py-2 text-sm font-semibold text-[#EAC779]"
          >
            প্রকাশ করতে লগইন করুন
          </Link>
        )}
      </div>

      <form onSubmit={handlePublish} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Exam Configuration */}
        <Card className="lg:col-span-5 p-5 space-y-4 h-fit">
          <h2 className="text-lg font-bold text-[#EAC779] border-b border-[#D4A853]/20 pb-2.5">
            ১. পরীক্ষার বিবরণ ও সময়সূচি
          </h2>

          <FormField label="পরীক্ষার শিরোনাম" htmlFor="ex-title" required>
            <Input
              id="ex-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: অষ্টম শ্রেণি গণিত সাপ্তাহিক লাইভ টেস্ট"
            />
          </FormField>

          <FormField label="সংক্ষিপ্ত বিবরণ / নির্দেশনা" htmlFor="ex-desc">
            <Textarea
              id="ex-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="সিলেবাস ও পরীক্ষার্থীদের জন্য নির্দেশনা..."
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="শ্রেণি" htmlFor="ex-class">
              <Select
                id="ex-class"
                value={classId}
                onChange={(e) => {
                  const nextCls = e.target.value;
                  setClassId(nextCls);
                  setSubjectId(subjects.find((s) => s.classId === nextCls)?.id || '');
                }}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameBn}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="বিষয়" htmlFor="ex-sub">
              <Select
                id="ex-sub"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                {classSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameBn}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="সময় (মিনিট)" htmlFor="ex-dur">
              <Input
                id="ex-dur"
                type="number"
                min={1}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) || 15)}
              />
            </FormField>
            <FormField label="প্রশ্ন প্রতি নম্বর" htmlFor="ex-mpq">
              <Input
                id="ex-mpq"
                type="number"
                step="0.5"
                min={0.5}
                value={marksPerQuestion}
                onChange={(e) => setMarksPerQuestion(Number(e.target.value) || 1)}
              />
            </FormField>
            <FormField label="নেগেটিভ মার্ক" htmlFor="ex-neg">
              <Select
                id="ex-neg"
                value={String(negativeMarking)}
                onChange={(e) => setNegativeMarking(Number(e.target.value))}
              >
                <option value="0">নেই (০)</option>
                <option value="0.25">০.২৫ কাটা</option>
                <option value="0.5">০.৫০ কাটা</option>
                <option value="1">১.০০ কাটা</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="শুরুর সময়" htmlFor="ex-start">
              <Input
                id="ex-start"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </FormField>
            <FormField label="সমাপ্তির সময়" htmlFor="ex-end">
              <Input
                id="ex-end"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="অ্যাক্সেস ধরন" htmlFor="ex-access">
              <Select
                id="ex-access"
                value={accessMode}
                onChange={(e) => setAccessMode(e.target.value as 'public' | 'private')}
              >
                <option value="public">পাবলিক (সবার জন্য উন্মুক্ত)</option>
                <option value="private">প্রাইভেট (অ্যাক্সেস কোড সহ)</option>
              </Select>
            </FormField>
            {accessMode === 'private' && (
              <FormField label="অ্যাক্সেস কোড" htmlFor="ex-code" required>
                <Input
                  id="ex-code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="যেমন: BATCH26"
                />
              </FormField>
            )}
          </div>

          {/* Summary Box */}
          <div className="rounded-lg border border-[#D4A853]/30 bg-[#0A0D12] p-4 flex items-center justify-between text-sm tabular-nums">
            <div>
              <p className="text-[#9DA6B5]">নির্বাচিত MCQ: <strong className="text-[#EAC779]">{toBanglaDigits(selectedIds.length)}টি</strong></p>
              <p className="text-[#9DA6B5]">মোট পূর্ণমান: <strong className="text-[#F5EFE2]">{toBanglaDigits(totalMarks)}</strong></p>
            </div>
            <Button type="submit" disabled={submitting || selectedIds.length === 0}>
              {submitting ? 'প্রকাশ হচ্ছে...' : 'পরীক্ষা প্রকাশ করুন'}
            </Button>
          </div>
        </Card>

        {/* Right: Question Bank MCQ Picker & 10-100 Randomizer */}
        <Card className="lg:col-span-7 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D4A853]/20 pb-3">
            <h2 className="text-lg font-bold text-[#EAC779]">
              ২. প্রশ্নব্যাংক থেকে MCQ নির্বাচন (১০–১০০টি)
            </h2>
            <span className="text-xs font-mono text-[#D4A853] tabular-nums">
              নির্বাচিত: {toBanglaDigits(selectedIds.length)} / ১০০
            </span>
          </div>

          {/* Random Selector */}
          <div className="rounded-lg border border-[#D4A853]/25 bg-[#090B10] p-3.5 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <label htmlFor="rand-cnt" className="block text-xs font-semibold text-[#EAC779] mb-1">
                র‍্যান্ডম MCQ সংখ্যা (১০–১০০)
              </label>
              <Input
                id="rand-cnt"
                type="number"
                min={10}
                max={100}
                value={randomCount}
                onChange={(e) => setRandomCount(Math.max(1, Math.min(100, Number(e.target.value) || 10)))}
              />
            </div>
            <div className="w-36">
              <label htmlFor="rand-diff" className="block text-xs font-semibold text-[#EAC779] mb-1">
                কঠিনতা
              </label>
              <Select
                id="rand-diff"
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
              >
                <option value="">সকল</option>
                <option value="easy">সহজ</option>
                <option value="medium">মধ্যম</option>
                <option value="hard">কঠিন</option>
              </Select>
            </div>
            <Button type="button" variant="secondary" onClick={handlePickRandom}>
              <Shuffle className="h-4 w-4 text-[#EAC779]" />
              <span>র‍্যান্ডম বাছাই করুন</span>
            </Button>
          </div>

          {/* Manual Search & Checklist */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#8C95A4]" />
              <Input
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                placeholder="প্রশ্নব্যাংক থেকে প্রশ্ন খুঁজুন..."
                className="pl-9"
              />
            </div>
            {selectedIds.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                সব মুছুন
              </Button>
            )}
          </div>

          <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1">
            {bankQuestions.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#8C95A4]">
                এই ফিল্টারে কোনো MCQ পাওয়া যায়নি। উপরের "র‍্যান্ডম বাছাই করুন" বাটনে ক্লিক করলে অন্যান্য শ্রেণির প্রশ্নসহ ১০–১০০টি বাছাই করা যাবে।
              </p>
            ) : (
              bankQuestions.map((q) => {
                const checked = selectedIds.includes(q.id);
                return (
                  <label
                    key={q.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      checked
                        ? 'border-[#EAC779] bg-[#D4A853]/12'
                        : 'border-[#D4A853]/15 bg-[#0A0D12] hover:border-[#D4A853]/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleQuestion(q.id)}
                      className="mt-1 accent-[#D4A853] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#F5EFE2] leading-snug">{q.prompt}</p>
                      <p className="mt-1 text-xs text-[#9DA6B5]">
                        কঠিনতা: {q.difficulty === 'easy' ? 'সহজ' : q.difficulty === 'hard' ? 'কঠিন' : 'মধ্যম'}
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </Card>
      </form>
    </div>
  );
}

// --- 3. Take Live Exam Page (Chorchha-style, Answer-Stripped) ---
export function TakeLiveExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pushToast } = useToast();

  const [exam, setExam] = useState<ExamSummary | null>(null);
  const [questions, setQuestions] = useState<LiveExamQuestionPublic[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const [guestName, setGuestName] = useState('');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submittedRef = useRef(false);

  useEffect(() => {
    if (!examId) return;
    let active = true;
    const code = searchParams.get('code') ?? undefined;
    examService
      .getExamForTaking(examId, code)
      .then((res) => {
        if (!active) return;
        setExam(res.exam);
        setQuestions(res.questions);
        const durSec = res.exam.durationMinutes * 60;
        setTotalSeconds(durSec);
        setSecondsLeft(durSec);
      })
      .catch((err) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'পরীক্ষা লোড করা যায়নি।');
        }
      });
    return () => {
      active = false;
    };
  }, [examId, searchParams]);

  const performSubmit = async () => {
    if (!exam || submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    try {
      const elapsed = Math.max(1, totalSeconds - secondsLeft);
      const result = await examService.submitExamAttempt(
        exam.id,
        answers,
        elapsed,
        guestName
      );
      pushToast({
        title: 'পরীক্ষা সফলভাবে জমা হয়েছে',
        description: `আপনার স্কোর: ${toBanglaDigits(result.attempt.finalScore)} / ${toBanglaDigits(
          result.attempt.totalMarks
        )}`,
        variant: 'success',
      });
      navigate(`/exams/${exam.id}/result/${result.attempt.id}`, { replace: true });
    } catch (err) {
      submittedRef.current = false;
      setIsSubmitting(false);
      pushToast({
        title: 'জমা দিতে ব্যর্থ',
        description: err instanceof Error ? err.message : 'পুনরায় চেষ্টা করুন।',
        variant: 'error',
      });
    }
  };

  // Live countdown timer
  useEffect(() => {
    if (!exam || questions.length === 0 || loadError) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          void performSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam?.id, questions.length, loadError]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 font-bangla">
        <EmptyState
          title="পরীক্ষায় প্রবেশ করা যাচ্ছে না"
          description={loadError}
          icon={<AlertTriangle className="h-5 w-5" />}
          action={
            <Link to="/exams" className="rounded-lg gold-btn px-4 py-2 text-sm font-bold">
              পরীক্ষার তালিকায় ফিরুন
            </Link>
          }
        />
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-[#B8C0CE] font-bangla">
        পরীক্ষার প্রশ্ন প্রস্তুত করা হচ্ছে...
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.values(markedForReview).filter(Boolean).length;
  const isLowTime = secondsLeft <= 120;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-5 font-bangla text-[#F3EEE3]">
      {/* Sticky Exam Top Bar */}
      <Card className="sticky top-[70px] z-30 p-4 border-[#D4A853]/35 bg-[#0B0E14]/95 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-[#F5EFE2] truncate">{exam.title}</h1>
            <p className="text-xs text-[#9DA6B5] tabular-nums">
              উত্তরিত: {toBanglaDigits(answeredCount)} / {toBanglaDigits(questions.length)} • রিভিউ চিহ্নিত: {toBanglaDigits(markedCount)}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 font-mono text-base font-bold tabular-nums ${
                isLowTime
                  ? 'border-rose-500/60 bg-rose-500/15 text-rose-300'
                  : 'border-[#D4A853]/40 bg-[#121620] text-[#EAC779]'
              }`}
              aria-live="polite"
            >
              <Clock className="h-4 w-4 shrink-0" />
              <span>{formatTimerClock(secondsLeft)}</span>
            </div>

            <Button
              variant="primary"
              onClick={() => setShowConfirmSubmit(true)}
              disabled={isSubmitting}
            >
              <span>জমা দিন</span>
            </Button>
          </div>
        </div>
      </Card>

      {!user && (
        <Card className="p-3.5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[#B8C0CE]">
            অতিথি হিসেবে পরীক্ষা দিচ্ছেন। ফলাফলের জন্য আপনার নাম লিখুন (ঐচ্ছিক):
          </span>
          <Input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="আপনার নাম লিখুন..."
            className="max-w-xs"
          />
        </Card>
      )}

      {/* Main Split: Question Area + Palette */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Question Card */}
        <Card className="lg:col-span-8 p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2 border-b border-[#D4A853]/15 pb-3">
              <span className="text-sm font-bold text-[#EAC779] tabular-nums">
                প্রশ্ন {toBanglaDigits(currentIdx + 1)} / {toBanglaDigits(questions.length)}
              </span>
              <div className="flex items-center gap-3 text-xs text-[#9DA6B5] tabular-nums">
                <span>মান: {toBanglaDigits(exam.marksPerQuestion)}</span>
                {markedForReview[currentQuestion.id] && (
                  <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                    <Flag className="h-3.5 w-3.5" />
                    <span>রিভিউয়ের জন্য চিহ্নিত</span>
                  </span>
                )}
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[#F5EFE2] leading-snug">
              {currentQuestion.prompt}
            </h2>

            {currentQuestion.equationLatex && (
              <p className="rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] px-4 py-2 font-mono text-sm text-[#EAC779]">
                {currentQuestion.equationLatex}
              </p>
            )}

            <div className="space-y-3 pt-1">
              {currentQuestion.options.map((opt) => {
                const selected = answers[currentQuestion.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [currentQuestion.id]: opt.id,
                      }))
                    }
                    className={`w-full text-left rounded-xl border px-4 py-3.5 flex items-center gap-3.5 transition-colors ${
                      selected
                        ? 'border-[#EAC779] bg-[#D4A853]/15 text-[#F5EFE2]'
                        : 'border-[#D4A853]/20 bg-[#0A0D12] text-[#C2C8D3] hover:border-[#D4A853]/50'
                    }`}
                  >
                    <span
                      className={`h-7 w-7 rounded-md font-bold text-sm flex items-center justify-center shrink-0 ${
                        selected
                          ? 'bg-[#EAC779] text-[#090B0E]'
                          : 'border border-[#D4A853]/40 text-[#EAC779]'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="text-base font-medium flex-1">{opt.text}</span>
                    {selected && <Check className="h-5 w-5 text-[#EAC779] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D4A853]/20 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setMarkedForReview((prev) => ({
                    ...prev,
                    [currentQuestion.id]: !prev[currentQuestion.id],
                  }))
                }
              >
                <Flag className="h-3.5 w-3.5 text-amber-300" />
                <span>
                  {markedForReview[currentQuestion.id] ? 'রিভিউ সরান' : 'রিভিউ চিহ্নিত করুন'}
                </span>
              </Button>
              {answers[currentQuestion.id] && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setAnswers((prev) => {
                      const copy = { ...prev };
                      delete copy[currentQuestion.id];
                      return copy;
                    })
                  }
                >
                  উত্তর মুছুন
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>পূর্ববর্তী</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                disabled={currentIdx >= questions.length - 1}
              >
                <span>পরবর্তী</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Right: Question Navigator Palette */}
        <Card className="lg:col-span-4 p-5 space-y-4 h-fit">
          <h2 className="text-base font-bold text-[#EAC779] border-b border-[#D4A853]/20 pb-2.5">
            প্রশ্ন নেভিগেটর
          </h2>

          <div className="grid grid-cols-5 gap-2 tabular-nums">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.id]);
              const isMarked = Boolean(markedForReview[q.id]);
              const isCurrent = idx === currentIdx;

              let btnClass = 'border-[#D4A853]/25 bg-[#0A0D12] text-[#B8C0CE]';
              if (isAnswered && isMarked) {
                btnClass = 'border-amber-400 bg-emerald-500/20 text-emerald-200';
              } else if (isAnswered) {
                btnClass = 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300';
              } else if (isMarked) {
                btnClass = 'border-amber-400/70 bg-amber-500/15 text-amber-200';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`relative h-10 rounded-lg border font-mono text-sm font-bold transition-all ${btnClass} ${
                    isCurrent ? 'ring-2 ring-[#EAC779] ring-offset-2 ring-offset-[#0E1117]' : ''
                  }`}
                >
                  {toBanglaDigits(idx + 1)}
                  {isMarked && (
                    <Flag className="h-2.5 w-2.5 text-amber-300 absolute top-1 right-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Dual-coded legend (icon + border/fill + text) */}
          <div className="space-y-2 border-t border-[#D4A853]/15 pt-3 text-xs text-[#B8C0CE]">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded border border-emerald-500/60 bg-emerald-500/20" />
                <span>উত্তর দেওয়া হয়েছে</span>
              </span>
              <span className="font-mono tabular-nums">{toBanglaDigits(answeredCount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Flag className="h-3.5 w-3.5 text-amber-300" />
                <span>রিভিউয়ের জন্য চিহ্নিত</span>
              </span>
              <span className="font-mono tabular-nums">{toBanglaDigits(markedCount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded border border-[#D4A853]/25 bg-[#0A0D12]" />
                <span>বাকি আছে</span>
              </span>
              <span className="font-mono tabular-nums">
                {toBanglaDigits(questions.length - answeredCount)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Submit Confirmation Modal */}
      {showConfirmSubmit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <Card className="w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold text-[#F5EFE2]">পরীক্ষা জমা দিতে নিশ্চিত?</h2>
            <div className="rounded-lg border border-[#D4A853]/25 bg-[#0A0D12] p-4 space-y-1.5 text-sm tabular-nums">
              <p>মোট প্রশ্ন: <strong>{toBanglaDigits(questions.length)}টি</strong></p>
              <p>উত্তর দিয়েছেন: <strong className="text-emerald-400">{toBanglaDigits(answeredCount)}টি</strong></p>
              <p>অনুত্তরিত: <strong className="text-amber-300">{toBanglaDigits(questions.length - answeredCount)}টি</strong></p>
              <p>রিভিউ চিহ্নিত: <strong>{toBanglaDigits(markedCount)}টি</strong></p>
            </div>
            <p className="text-xs text-[#9DA6B5]">
              জমা দেওয়ার পর আপনার স্কোর, র‍্যাংক এবং সঠিক উত্তর ও ব্যাখ্যা দেখতে পারবেন।
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowConfirmSubmit(false)}
                disabled={isSubmitting}
              >
                ফিরে যান
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={performSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'জমা হচ্ছে...' : 'হ্যাঁ, জমা দিন'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- 4. Exam Result & Answer Review Page ---
export function ExamResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [data, setData] = useState<{
    exam: ExamSummary;
    attempt: ExamAttempt;
    reviews: ExamAnswerReview[];
    rank: number;
    totalParticipants: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    let active = true;
    examService
      .getAttemptResult(attemptId)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'ফলাফল লোড করা যায়নি।');
      });
    return () => {
      active = false;
    };
  }, [attemptId]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title="ফলাফল পাওয়া যায়নি"
          description={error}
          icon={<Award className="h-5 w-5" />}
          action={
            <Link to="/exams" className="rounded-lg gold-btn px-4 py-2 text-sm font-bold">
              লাইভ পরীক্ষায় ফিরুন
            </Link>
          }
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-[#B8C0CE] font-bangla">
        ফলাফল বিশ্লেষণ লোড হচ্ছে...
      </div>
    );
  }

  const { exam, attempt, reviews, rank, totalParticipants } = data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-8 font-bangla text-[#F3EEE3]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/exams" className="text-sm font-semibold text-[#EAC779] hover:underline">
            ← সকল লাইভ পরীক্ষা
          </Link>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold gold-text-gradient">
            পরীক্ষার ফলাফল ও উত্তর বিশ্লেষণ
          </h1>
          <p className="mt-1 text-sm text-[#B8C0CE]">{exam.title}</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-2 rounded-lg gold-btn px-4 py-2 text-sm font-bold"
          >
            <Trophy className="h-4 w-4" />
            <span>লিডারবোর্ড দেখুন</span>
          </Link>
        </div>
      </div>

      {/* Score & Rank Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 tabular-nums">
        <Card className="p-4 lg:col-span-2 bg-[#0B0F17] border-[#EAC779]/45">
          <p className="text-xs text-[#9DA6B5]">চূড়ান্ত প্রাপ্ত নম্বর</p>
          <p className="mt-1 text-3xl font-bold gold-text-gradient">
            {toBanglaDigits(attempt.finalScore)} / {toBanglaDigits(attempt.totalMarks)}
          </p>
          {attempt.negativeDeducted > 0 && (
            <p className="mt-1 text-xs text-rose-300">
              নেগেটিভ মার্কিং কর্তন: -{toBanglaDigits(attempt.negativeDeducted)}
            </p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#9DA6B5]">নির্ভুলতা</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {toBanglaDigits(attempt.accuracyPercent)}%
          </p>
          <p className="mt-1 text-xs text-[#9DA6B5]">
            সঠিক: {toBanglaDigits(attempt.correctCount)} • ভুল: {toBanglaDigits(attempt.wrongCount)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#9DA6B5]">এই পরীক্ষায় অবস্থান</p>
          <p className="mt-1 text-2xl font-bold text-[#EAC779]">
            #{toBanglaDigits(rank)} / {toBanglaDigits(totalParticipants)}
          </p>
          <p className="mt-1 text-xs text-[#9DA6B5]">
            অনুত্তরিত: {toBanglaDigits(attempt.unansweredCount)}টি
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#9DA6B5]">ব্যয়িত সময়</p>
          <p className="mt-1 text-2xl font-bold font-mono text-[#F5EFE2]">
            {formatTimerClock(attempt.timeTakenSeconds)}
          </p>
          <p className="mt-1 text-xs text-[#9DA6B5]">মোট {toBanglaDigits(exam.durationMinutes)} মি.</p>
        </Card>
      </div>

      {/* Answer Key & Explanation Review (Unlocked post-submission) */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#EAC779]">
          প্রশ্নভিত্তিক উত্তর ও ব্যাখ্যা ({toBanglaDigits(reviews.length)}টি)
        </h2>

        {reviews.map((rev, idx) => {
          const unanswered = rev.selectedOptionId === null;
          return (
            <Card key={rev.questionId} className="p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#F5EFE2]">
                  {toBanglaDigits(idx + 1)}. {rev.prompt}
                </h3>
                {unanswered ? (
                  <StatusTag tone="draft" label="অনুত্তরিত" />
                ) : rev.isCorrect ? (
                  <StatusTag tone="active" label="সঠিক" />
                ) : (
                  <StatusTag tone="expired" label="ভুল" />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {rev.options.map((opt) => {
                  const isCorrectOpt = opt.id === rev.correctOptionId;
                  const isSelectedWrong = opt.id === rev.selectedOptionId && !isCorrectOpt;

                  return (
                    <div
                      key={opt.id}
                      className={`rounded-lg border px-3.5 py-2.5 flex items-center justify-between gap-2 text-sm ${
                        isCorrectOpt
                          ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                          : isSelectedWrong
                          ? 'border-rose-500/60 bg-rose-500/15 text-rose-200'
                          : 'border-[#D4A853]/15 bg-[#0A0D12] text-[#B8C0CE]'
                      }`}
                    >
                      <span>
                        <strong className="mr-2">{opt.label})</strong>
                        {opt.text}
                      </span>
                      {isCorrectOpt && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                      {isSelectedWrong && <XCircle className="h-4 w-4 text-rose-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {rev.explanation && (
                <div className="rounded-lg border border-[#D4A853]/25 bg-[#0A0D12] px-4 py-2.5 text-sm text-[#C2C8D3]">
                  <strong className="text-[#EAC779]">ব্যাখ্যা: </strong>
                  {rev.explanation}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
