import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Layers,
  Lock,
} from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  Select,
  StatusTag,
} from '../../components/ui/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  formatBnDate,
  formatBnDateTime,
  getPaymentStatusLabelBn,
  getRoleLabelBn,
  toBanglaDigits,
} from '../../lib/bn';
import {
  calculatePaperTotalMarks,
  canUserAddQuestionToPaper,
  getRemainingDays,
  isSubscriptionCurrentlyActive,
} from '../../lib/rules';
import { buildClassDisplayCards, EDUCATION_LEVEL_LABELS } from '../../data/curriculumData';
import { profileSchema, type ProfileFormValues } from '../../lib/validations';
import { questionBankService } from '../../services/questionBankService';
import type { EducationLevel } from '../../types/domain';

export function DashboardOverviewPage() {
  const { user, bumpRevision } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const catalogue = questionBankService.getAcademicCatalogue();
  const { classes, subjects, chapters, questionTypes } = catalogue;

  const subscriptions = useMemo(
    () => (user ? questionBankService.getUserSubscriptions(user.id) : []),
    [user]
  );
  const permittedClassIds = useMemo(
    () => (user ? questionBankService.getUserPermittedClasses(user.id) : []),
    [user]
  );

  const defaultClassId = permittedClassIds[0] || classes[0]?.id || 'cls-6';
  const [paperTitle, setPaperTitle] = useState('শ্রেণি মূল্যায়ন পরীক্ষা');
  const [selectedClassId, setSelectedClassId] = useState(defaultClassId);
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    () => subjects.find((s) => s.classId === defaultClassId)?.id || subjects[0]?.id || ''
  );
  const [selectedChapterId, setSelectedChapterId] = useState('all');
  const [selectedTypeCode, setSelectedTypeCode] = useState('all');
  const [questionCount, setQuestionCount] = useState(5);

  if (!user) return null;

  const activeSubs = subscriptions.filter((s) => isSubscriptionCurrentlyActive(s));
  const papers = questionBankService.getUserPapers(user.id);
  const payments = questionBankService.getUserPayments(user.id);
  const { favoriteIds, savedIds } = questionBankService.getUserFavoritesAndSaved(user.id);

  const isAdmin = user.role === 'admin';
  const effectiveClassIds = isAdmin ? classes.map((c) => c.id) : permittedClassIds;
  const primaryActiveSub = activeSubs[0];
  const latestPayment = payments[0];
  const hasExpiredSub = !isAdmin && !primaryActiveSub && subscriptions.length > 0;

  const getClassName = (id: string) => classes.find((c) => c.id === id)?.nameBn || id;
  const getSubjectName = (id: string) => subjects.find((s) => s.id === id)?.nameBn || id;

  const classSubjects = subjects.filter((s) => s.classId === selectedClassId);
  const subjectChapters = chapters.filter((c) => c.subjectId === selectedSubjectId);

  const hasSelectedClassAccess = canUserAddQuestionToPaper(
    subscriptions,
    user.id,
    user.role,
    selectedClassId
  );

  const matchingQuestions = hasSelectedClassAccess
    ? questionBankService.listQuestionsForUser(user).filter((q) => {
        if (q.classId !== selectedClassId) return false;
        if (selectedSubjectId && q.subjectId !== selectedSubjectId) return false;
        if (selectedChapterId !== 'all' && q.chapterId !== selectedChapterId) return false;
        if (selectedTypeCode !== 'all' && q.questionTypeCode !== selectedTypeCode) return false;
        return true;
      })
    : [];

  const handleQuickGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSelectedClassAccess) {
      pushToast({
        title: 'নির্বাচিত শ্রেণিতে সাবস্ক্রিপশন নেই',
        description: 'এই শ্রেণির প্রশ্নপত্র তৈরি করতে অনুগ্রহ করে একটি প্ল্যান সাবস্ক্রাইব করুন।',
        variant: 'warning',
      });
      navigate('/dashboard/payments/new');
      return;
    }

    if (matchingQuestions.length === 0) {
      pushToast({
        title: 'কোনো প্রশ্ন পাওয়া যায়নি',
        description: 'পূর্ণ প্রশ্নপত্র জেনারেটর থেকে অন্য অধ্যায় বা ধরন বাছাই করুন।',
        variant: 'info',
      });
      navigate(`/dashboard/papers/new?classId=${selectedClassId}&subjectId=${selectedSubjectId}`);
      return;
    }

    const count = Math.max(1, Math.min(50, Number(questionCount) || 5));
    const chosen = matchingQuestions.slice(0, count);
    const items = chosen.map((q, idx) =>
      questionBankService.buildSnapshotItemFromQuestion(q, idx)
    );

    const saved = questionBankService.savePaper(user, {
      title: paperTitle.trim() || `${getClassName(selectedClassId)} — ${getSubjectName(selectedSubjectId)}`,
      examName: '১ ক্লিকে তৈরি অনুশীলন পরীক্ষা',
      classId: selectedClassId,
      subjectId: selectedSubjectId,
      schoolName: user.institution || 'মডেল একাডেমি',
      examDate: new Date().toISOString().slice(0, 10),
      durationMinutes: Math.max(20, chosen.length * 5),
      instructions: 'সকল প্রশ্নের স্পষ্ট উত্তর দাও। ডান পাশের সংখ্যা প্রশ্নের পূর্ণমান জ্ঞাপক।',
      includeStudentFields: true,
      includeHeaderFooter: true,
      includePageNumbers: true,
      items,
    });

    bumpRevision();
    pushToast({
      title: '১ ক্লিকে প্রশ্নপত্র তৈরি হয়েছে',
      description: `${toBanglaDigits(chosen.length)}টি প্রশ্নসহ "${saved.title}" প্রস্তুত।`,
      variant: 'success',
    });
    navigate(`/dashboard/papers/${saved.id}/preview`);
  };

  return (
    <div className="space-y-8 font-bangla">
      {/* সারসংক্ষেপ পরিসংখ্যান গ্রিড */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-medium text-[#9DA6B5]">সাবস্ক্রিপশন অবস্থা</p>
          <div className="mt-2">
            {isAdmin ? (
              <StatusTag tone="active" label="অ্যাডমিন পূর্ণ প্রবেশাধিকার" />
            ) : primaryActiveSub ? (
              <StatusTag tone="active" label="সক্রিয় সাবস্ক্রিপশন" />
            ) : hasExpiredSub ? (
              <StatusTag tone="expired" label="মেয়াদোত্তীর্ণ" />
            ) : (
              <StatusTag tone="draft" label="সক্রিয় প্ল্যান নেই" />
            )}
          </div>
          <p className="mt-2.5 text-sm text-[#B8C0CE] tabular-nums">
            {isAdmin
              ? 'সকল শ্রেণির প্রশ্ন ও পরীক্ষায় অবাধ প্রবেশাধিকার'
              : primaryActiveSub
              ? `মেয়াদ শেষ ${formatBnDate(primaryActiveSub.expiresAt)} (${toBanglaDigits(getRemainingDays(primaryActiveSub.expiresAt))} দিন বাকি)`
              : hasExpiredSub
              ? 'প্রশ্নব্যাংক চালু করতে পুনরায় নবায়ন করুন'
              : 'প্রশ্ন দেখতে একটি শ্রেণির প্ল্যান বেছে নিন'}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-medium text-[#9DA6B5]">সাবস্ক্রাইবকৃত শ্রেণি</p>
          <p className="mt-2 font-display text-2xl font-bold gold-text-gradient tabular-nums">
            {toBanglaDigits(effectiveClassIds.length)}
          </p>
          <p className="mt-1 truncate text-sm text-[#B8C0CE]">
            {effectiveClassIds.length > 0
              ? effectiveClassIds.map(getClassName).join(', ')
              : 'কোনো সক্রিয় শ্রেণি নেই'}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-medium text-[#9DA6B5]">সংরক্ষিত প্রশ্নপত্র</p>
          <p className="mt-2 font-display text-2xl font-bold gold-text-gradient tabular-nums">
            {toBanglaDigits(papers.length)}
          </p>
          <p className="mt-1 text-sm text-[#B8C0CE]">
            {toBanglaDigits(favoriteIds.length)}টি পছন্দসই · {toBanglaDigits(savedIds.length)}টি বুকমার্ক
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-medium text-[#9DA6B5]">সর্বশেষ পেমেন্ট অবস্থা</p>
          <div className="mt-2">
            {latestPayment ? (
              <StatusTag
                tone={
                  latestPayment.status === 'approved'
                    ? 'active'
                    : latestPayment.status === 'pending'
                    ? 'pending'
                    : 'expired'
                }
                label={getPaymentStatusLabelBn(latestPayment.status)}
              />
            ) : (
              <span className="text-sm font-medium text-[#C2C8D3]">এখনো কোনো পেমেন্ট নেই</span>
            )}
          </div>
          <p className="mt-2.5 truncate text-sm text-[#B8C0CE] tabular-nums">
            {latestPayment
              ? `${latestPayment.planNameSnapshot} · ৳${toBanglaDigits(latestPayment.submittedAmountBdt)}`
              : 'প্রস্তুত হলে ম্যানুয়াল পেমেন্ট জমা দিন'}
          </p>
        </Card>
      </div>

      {/* কেন্দ্রস্থিত ১-ক্লিকে প্রশ্নপত্র তৈরির উইন্ডো কার্ড — Obsidian & Gold Studio */}
      <div className="mx-auto max-w-[600px] obsidian-chamfer overflow-hidden rounded-xl">
        {/* উইন্ডো টপ বার */}
        <div className="flex items-center justify-between border-b border-[#D4A853]/20 bg-[#090B10] px-4 py-2.5">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-[#FF5F56]" />
            <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
            <span className="h-3 w-3 rounded-full bg-[#27C93F]" />
          </div>
          <span className="text-xs font-medium text-[#D4A853]">
            স্বাগতম, {user.fullName}
          </span>
        </div>

        {/* অবসিডিয়ান-গোল্ড হিরো ব্যানার */}
        <div className="border-b border-[#D4A853]/20 bg-[radial-gradient(ellipse_at_top,rgba(212,168,83,0.18),transparent_70%)] px-6 py-7 text-center">
          <h1 className="font-display text-2xl sm:text-[28px] font-bold tracking-tight gold-text-gradient">
            ১ ক্লিকে প্রশ্ন তৈরীর সফটওয়্যার!
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#C2C8D3]">
            কয়েক সেকেন্ডেই অধ্যায়ভিত্তিক মানসম্মত প্রশ্নপত্র তৈরি করুন — সময় ও শ্রম বাঁচান!
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/dashboard/payments/new"
              className="rounded-lg gold-btn px-4 py-2 text-sm font-bold whitespace-nowrap"
            >
              সাবস্ক্রাইব করুন
            </Link>
            <Link
              to="/dashboard/questions"
              className="rounded-lg gold-outline-btn px-4 py-2 text-sm font-semibold whitespace-nowrap"
            >
              প্রশ্নব্যাংক দেখুন
            </Link>
          </div>
        </div>

        {/* প্রশ্নপত্র তৈরির ফর্ম */}
        <form onSubmit={handleQuickGenerate} className="p-6 space-y-3.5 bg-[#0D1016]">
          {/* স্ট্যাটাস ও উন্নত এডিটর লিংক */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[#D4A853]/25 bg-[#090B10] px-3.5 py-2.5 text-sm">
            <span className="text-[#C2C8D3] truncate">
              {isAdmin
                ? 'অ্যাডমিন পূর্ণ প্রবেশাধিকার সক্রিয়'
                : primaryActiveSub
                ? `সক্রিয় মেয়াদ শেষ ${formatBnDate(primaryActiveSub.expiresAt)}`
                : hasExpiredSub
                ? 'সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে'
                : 'বর্তমানে কোনো সক্রিয় প্ল্যান নেই'}
            </span>
            <Link
              to="/dashboard/papers/new"
              className="text-sm font-semibold text-[#EAC779] hover:underline whitespace-nowrap shrink-0"
            >
              পূর্ণ জেনারেটর →
            </Link>
          </div>

          <div>
            <label htmlFor="qg-title" className="sr-only">
              প্রশ্নপত্রের শিরোনাম
            </label>
            <Input
              id="qg-title"
              placeholder="শ্রেণি পরীক্ষা / প্রশ্নপত্রের শিরোনাম"
              value={paperTitle}
              onChange={(e) => setPaperTitle(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="qg-class" className="sr-only">
              শ্রেণি নির্বাচন করুন
            </label>
            <Select
              id="qg-class"
              value={selectedClassId}
              onChange={(e) => {
                const nextClass = e.target.value;
                setSelectedClassId(nextClass);
                const firstSub = subjects.find((s) => s.classId === nextClass);
                setSelectedSubjectId(firstSub?.id || '');
                setSelectedChapterId('all');
              }}
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.nameBn}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="qg-subject" className="sr-only">
              বিষয় নির্বাচন করুন
            </label>
            <Select
              id="qg-subject"
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedChapterId('all');
              }}
            >
              {classSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nameBn}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="qg-chapter" className="sr-only">
              অধ্যায় নির্বাচন করুন
            </label>
            <Select
              id="qg-chapter"
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
            >
              <option value="all">সকল অধ্যায়</option>
              {subjectChapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  অধ্যায় {toBanglaDigits(ch.chapterNumber)} — {ch.nameBn}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="qg-type" className="sr-only">
                প্রশ্নের ধরন
              </label>
              <Select
                id="qg-type"
                value={selectedTypeCode}
                onChange={(e) => setSelectedTypeCode(e.target.value)}
              >
                <option value="all">সকল ধরন</option>
                {questionTypes.map((qt) => (
                  <option key={qt.id} value={qt.code}>
                    {qt.nameBn}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="qg-count" className="sr-only">
                প্রশ্নের সংখ্যা
              </label>
              <Input
                id="qg-count"
                type="number"
                min={1}
                max={50}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                placeholder="প্রশ্নের সংখ্যা (যেমন: ৫)"
              />
            </div>
          </div>

          {/* সাবস্ক্রিপশন যাচাই স্ট্রিপ */}
          {!hasSelectedClassAccess ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[#D4A853]/45 bg-[#2A200E]/55 px-3.5 py-2.5">
              <span className="text-sm font-medium text-[#F2D184]">
                সিলেক্টেড শ্রেণিতে সাবস্ক্রিপশন নেই
              </span>
              <Link
                to="/dashboard/payments/new"
                className="rounded gold-btn px-3 py-1.5 text-sm font-bold whitespace-nowrap"
              >
                সাবস্ক্রাইব
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/35 bg-emerald-950/45 px-3.5 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  সক্রিয় এক্সেস · {toBanglaDigits(matchingQuestions.length)}টি প্রশ্ন প্রস্তুত
                </span>
              </span>
              <Link
                to={`/dashboard/questions?classId=${selectedClassId}`}
                className="text-sm font-semibold text-emerald-300 hover:underline whitespace-nowrap"
              >
                প্রশ্ন দেখুন
              </Link>
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg gold-btn px-4 py-2.5 text-base font-bold cursor-pointer"
          >
            প্রশ্ন তৈরি করুন
          </button>
        </form>
      </div>

      {/* সাম্প্রতিক প্রশ্নপত্র ও শ্রেণি সুবিধাসমূহ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#F5EFE2]">সাম্প্রতিক প্রশ্নপত্র</h2>
            <Link to="/dashboard/papers" className="text-sm font-semibold text-[#EAC779] hover:underline">
              সকল প্রশ্নপত্র দেখুন →
            </Link>
          </div>

          {papers.length === 0 ? (
            <EmptyState
              title="এখনো কোনো প্রশ্নপত্র তৈরি হয়নি"
              description="উপরের ১-ক্লিক জেনারেটর ব্যবহার করে অথবা প্রশ্নব্যাংক থেকে বাছাই করে প্রশ্নপত্র তৈরি করুন।"
              icon={<FileText className="h-5 w-5" />}
              action={
                permittedClassIds.length > 0 ? (
                  <Link
                    to="/dashboard/papers/new"
                    className="inline-flex items-center gap-1.5 rounded-lg gold-btn px-4 py-2 text-sm font-bold"
                  >
                    <span>প্রথম প্রশ্নপত্র তৈরি করুন</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <Card className="divide-y divide-[#D4A853]/15">
              {papers.slice(0, 4).map((paper) => (
                <div key={paper.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <Link
                      to={`/dashboard/papers/${paper.id}/preview`}
                      className="block truncate text-base font-semibold text-[#F5EFE2] hover:text-[#EAC779]"
                    >
                      {paper.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-[#9DA6B5] tabular-nums">
                      {getClassName(paper.classId)} · {getSubjectName(paper.subjectId)} ·{' '}
                      {toBanglaDigits(paper.items.length)}টি প্রশ্ন · মোট {toBanglaDigits(calculatePaperTotalMarks(paper.items))} নম্বর
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/dashboard/papers/${paper.id}/preview`}
                      className="rounded-lg gold-outline-btn px-2.5 py-1 text-sm font-medium"
                    >
                      প্রিভিউ
                    </Link>
                    <Link
                      to={`/dashboard/papers/${paper.id}`}
                      className="rounded-lg gold-outline-btn px-2.5 py-1 text-sm font-medium"
                    >
                      সম্পাদনা
                    </Link>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>

        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#F5EFE2]">শ্রেণি-ভিত্তিক প্রবেশাধিকার</h2>
            <Link to="/dashboard/classes" className="text-sm font-semibold text-[#EAC779] hover:underline">
              বিস্তারিত →
            </Link>
          </div>
          <Card className="divide-y divide-[#D4A853]/15">
            {classes.map((cls) => {
              const allowed = user.role === 'admin' || permittedClassIds.includes(cls.id);
              return (
                <div key={cls.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-base font-semibold text-[#F5EFE2]">{cls.nameBn}</p>
                    <p className="text-sm text-[#9DA6B5]">
                      {allowed ? 'প্রশ্নব্যাংক ও প্রশ্নপত্র তৈরির পূর্ণ সুবিধা' : 'এই শ্রেণির জন্য সাবস্ক্রিপশন প্রয়োজন'}
                    </p>
                  </div>
                  {allowed ? (
                    <Link
                      to={`/dashboard/questions?classId=${cls.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-950/50 px-3 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-900/60 whitespace-nowrap"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>প্রশ্ন দেখুন</span>
                    </Link>
                  ) : (
                    <Link
                      to="/dashboard/payments/new"
                      className="inline-flex items-center gap-1 rounded-lg border border-[#D4A853]/25 bg-[#0A0D12] px-3 py-1.5 text-sm font-medium text-[#9DA6B5] hover:border-[#EAC779] hover:text-[#EAC779] whitespace-nowrap"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>তালাবদ্ধ</span>
                    </Link>
                  )}
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}

export function MyClassesPage() {
  const { user } = useAuth();
  if (!user) return null;
  const permitted = questionBankService.getUserPermittedClasses(user.id);
  const { classes, subjects } = questionBankService.getAcademicCatalogue();
  const sortedClasses = classes
    .filter((c) => c.isActive)
    .slice()
    .sort((a, b) => a.levelOrder - b.levelOrder);

  return (
    <div className="space-y-6 font-bangla">
      <Card className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold gold-text-gradient">আমার শ্রেণিসমূহ (শ্রেণি ১–১২)</h1>
          <p className="mt-1 text-base text-[#B8C0CE]">
            প্রাথমিক, মাধ্যমিক ও উচ্চ মাধ্যমিক স্তরের শ্রেণিসমূহ এবং আপনার সক্রিয় সাবস্ক্রিপশন অবস্থা দেখুন।
          </p>
        </div>
        <Link
          to="/dashboard/curriculum"
          className="inline-flex items-center gap-2 rounded-lg gold-btn px-4 py-2.5 text-sm font-bold whitespace-nowrap shrink-0"
        >
          <Layers className="h-4 w-4" />
          <span>সম্পূর্ণ পাঠ্যক্রম ও বিভাগ দেখুন</span>
        </Link>
      </Card>

      {(['primary', 'secondary', 'higher_secondary'] as EducationLevel[]).map((levelKey) => {
        const meta = EDUCATION_LEVEL_LABELS[levelKey];
        const levelCards = buildClassDisplayCards(sortedClasses).filter(
          (card) => card.educationLevel === levelKey
        );
        if (levelCards.length === 0) return null;

        return (
          <div key={levelKey} className="space-y-3">
            <div className="flex items-baseline justify-between border-b border-[#D4A853]/18 pb-2">
              <div className="flex items-baseline gap-2.5">
                <h2 className="font-display text-lg font-bold text-[#EAC779]">{meta.nameBn}</h2>
                <span className="text-xs text-[#9DA6B5]">
                  {meta.name} · {meta.rangeLabelBn}
                </span>
              </div>
              <span className="text-xs font-mono text-[#D4A853] tabular-nums">
                {toBanglaDigits(levelCards.length)} কার্ড
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {levelCards.map((card) => {
                const hasAccess =
                  user.role === 'admin' ||
                  card.memberClassIds.some((id) => permitted.includes(id));
                const clsSubjects = subjects.filter(
                  (s) => s.classId === card.primaryClass.id && s.isActive
                );
                return (
                  <Card key={card.id} className="p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-display text-lg font-bold text-[#F5EFE2]">
                            {card.nameBn}
                          </h3>
                          <p className="text-xs text-[#8C95A4]">
                            {card.name} · {card.hasGroups ? '৩টি বিভাগ সমর্থিত' : 'সাধারণ পাঠ্যক্রম'}
                          </p>
                        </div>
                        {hasAccess ? (
                          <StatusTag tone="active" label="সাবস্ক্রাইবকৃত" />
                        ) : (
                          <StatusTag tone="draft" label="সাবস্ক্রিপশন নেই" />
                        )}
                      </div>

                      <div className="mt-4 border-t border-[#D4A853]/15 pt-3">
                        <p className="text-sm font-semibold text-[#EAC779] tabular-nums">
                          অন্তর্ভুক্ত বিষয়সমূহ ({toBanglaDigits(clsSubjects.length)}টি)
                        </p>
                        <p className="mt-1 text-xs text-[#B8C0CE] leading-relaxed">
                          {clsSubjects.map((s) => s.nameBn).join(' · ')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      {hasAccess ? (
                        <Link
                          to={`/dashboard/questions?classId=${card.primaryClass.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg gold-btn px-4 py-2 text-xs font-bold"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>প্রশ্ন দেখুন</span>
                        </Link>
                      ) : (
                        <Link
                          to="/dashboard/payments/new"
                          className="inline-flex items-center gap-1.5 rounded-lg gold-outline-btn px-4 py-2 text-xs font-semibold"
                        >
                          <Lock className="h-3.5 w-3.5 text-[#D4A853]" />
                          <span>আনলক করতে সাবস্ক্রাইব</span>
                        </Link>
                      )}
                      <Link
                        to="/dashboard/curriculum"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#D4A853]/25 bg-[#0A0D12] px-3 py-2 text-xs font-semibold text-[#C2C8D3] hover:border-[#EAC779]"
                      >
                        <span>বিষয় তালিকা</span>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DownloadsPage() {
  const { user } = useAuth();
  if (!user) return null;
  const exports = questionBankService.getUserExports(user.id);

  return (
    <div className="space-y-6 font-bangla">
      <Card className="p-5">
        <h1 className="font-display text-2xl font-bold gold-text-gradient">ডাউনলোড ও এক্সপোর্ট ইতিহাস</h1>
        <p className="mt-1 text-base text-[#B8C0CE]">
          আপনার ডাউনলোডকৃত পিডিএফ ও ওয়ার্ড (.docx) প্রশ্নপত্রসমূহ। সাবস্ক্রিপশনের মেয়াদ শেষ হলেও সংরক্ষিত প্রশ্নপত্র এক্সপোর্ট করা যায়।
        </p>
      </Card>

      {exports.length === 0 ? (
        <EmptyState
          title="এখনো কোনো ফাইল এক্সপোর্ট করা হয়নি"
          description="যেকোনো প্রশ্নপত্রের প্রিভিউ খুলে প্রিন্ট / পিডিএফ বা ওয়ার্ড (.docx) এক্সপোর্ট বাটনে ক্লিক করুন।"
          icon={<Download className="h-5 w-5" />}
          action={
            <Link
              to="/dashboard/papers"
              className="rounded-lg gold-btn px-4 py-2 text-sm font-bold"
            >
              আমার প্রশ্নপত্রে যান
            </Link>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-sm font-semibold text-[#EAC779]">
              <tr>
                <th className="px-4 py-3">প্রশ্নপত্রের শিরোনাম</th>
                <th className="px-4 py-3">ফরম্যাট</th>
                <th className="px-4 py-3">উত্তরপত্র</th>
                <th className="px-4 py-3">এক্সপোর্টের সময়</th>
                <th className="px-4 py-3 text-right">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4A853]/15">
              {exports.map((exp) => (
                <tr key={exp.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-[#F5EFE2]">{exp.paperTitle}</td>
                  <td className="px-4 py-3 font-mono text-sm uppercase text-[#D4A853]">{exp.format}</td>
                  <td className="px-4 py-3 text-sm text-[#B8C0CE]">
                    {exp.includedAnswerKey ? 'উত্তরপত্রসহ' : 'শুধুমাত্র প্রশ্ন'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#9DA6B5] tabular-nums">
                    {formatBnDateTime(exp.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/dashboard/papers/${exp.paperId}/preview`}
                      className="text-sm font-semibold text-[#EAC779] hover:underline"
                    >
                      প্রিভিউ দেখুন
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export function ProfileSettingsPage() {
  const { user, updateProfile } = useAuth();
  const { pushToast } = useToast();
  const { classes } = questionBankService.getAcademicCatalogue();
  const [savedNotice, setSavedNotice] = useState(false);

  const [classId, setClassId] = useState(user?.classId || 'cls-8');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [privacy, setPrivacy] = useState({
    showProfilePublicly: user?.privacySettings?.showProfilePublicly ?? true,
    showSchool: user?.privacySettings?.showSchool ?? true,
    showExamHistory: user?.privacySettings?.showExamHistory ?? true,
    showSubjectPerformance: user?.privacySettings?.showSubjectPerformance ?? true,
    showAchievements: user?.privacySettings?.showAchievements ?? true,
  });
  const [statsView, setStatsView] = useState<Awaited<
    ReturnType<typeof import('../../services/profileService').profileService.getStudentPublicProfile>
  >['profile'] | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      institution: user?.institution || '',
      preferredLanguage: user?.preferredLanguage || 'bn',
    },
  });

  React.useEffect(() => {
    if (!user) return;
    import('../../services/profileService').then(({ profileService }) => {
      profileService.getStudentPublicProfile(user.id).then((res) => setStatsView(res.profile));
    });
  }, [user?.id]);

  if (!user) return null;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setAvatarUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateProfile({
        ...data,
        classId,
        bio,
        avatarUrl,
        privacySettings: privacy,
      });
      setSavedNotice(true);
      pushToast({ title: 'প্রোফাইল ও গোপনীয়তা হালনাগাদ হয়েছে', variant: 'success' });
    } catch (err) {
      pushToast({
        title: 'হালনাগাদ ব্যর্থ হয়েছে',
        description: err instanceof Error ? err.message : 'পুনরায় চেষ্টা করুন।',
        variant: 'error',
      });
    }
  };

  return (
    <div className="max-w-4xl space-y-6 font-bangla">
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold gold-text-gradient">
            শিক্ষার্থী প্রোফাইল ও গোপনীয়তা সেটিংস
          </h1>
          <p className="mt-1 text-sm text-[#B8C0CE]">
            ব্যক্তিগত তথ্য, প্রোফাইল ছবি, পরীক্ষার পরিসংখ্যান এবং পাবলিক প্রোফাইলের দৃশ্যমানতা নিয়ন্ত্রণ করুন।
          </p>
        </div>
        <Link
          to={`/students/${user.id}`}
          className="rounded-lg gold-outline-btn px-4 py-2 text-xs font-semibold text-[#EAC779] whitespace-nowrap"
        >
          পাবলিক প্রোফাইল দেখুন →
        </Link>
      </Card>

      {/* Personal Performance Overview */}
      {statsView && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 tabular-nums">
          <Card className="p-4">
            <p className="text-xs text-[#9DA6B5]">অংশগ্রহণকৃত পরীক্ষা</p>
            <p className="mt-1 text-2xl font-bold text-[#F5EFE2]">
              {toBanglaDigits(statsView.stats.examsParticipated)}টি
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-[#9DA6B5]">মোট অর্জিত নম্বর</p>
            <p className="mt-1 text-2xl font-bold gold-text-gradient">
              {toBanglaDigits(statsView.stats.totalScore)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-[#9DA6B5]">গড় পারফরম্যান্স</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">
              {toBanglaDigits(statsView.stats.averagePercent)}%
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-[#9DA6B5]">লিডারবোর্ড অবস্থান</p>
            <p className="mt-1 text-2xl font-bold text-[#EAC779]">
              {statsView.stats.leaderboardRank
                ? `#${toBanglaDigits(statsView.stats.leaderboardRank)}`
                : '—'}
            </p>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Profile Edit Form */}
        <Card className="lg:col-span-7 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Avatar Picker */}
            <div className="flex items-center gap-4 pb-2 border-b border-[#D4A853]/15">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user.fullName}
                  className="h-16 w-16 rounded-full object-cover border border-[#D4A853]/60 shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-full border border-[#D4A853]/50 bg-[#141822] text-xl font-bold text-[#EAC779] flex items-center justify-center shrink-0">
                  {user.fullName.slice(0, 1)}
                </div>
              )}
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-[#F5EFE2]">প্রোফাইল ছবি</p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-md border border-[#D4A853]/40 bg-[#121620] px-3 py-1.5 text-xs font-semibold text-[#EAC779] hover:border-[#EAC779]">
                    ছবি আপলোড করুন
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="sr-only"
                    />
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="text-xs text-rose-300 hover:underline"
                    >
                      ছবি সরান
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="ইমেইল ঠিকানা" htmlFor="prof-email">
                <Input id="prof-email" value={user.email} disabled />
              </FormField>
              <FormField label="অ্যাকাউন্টের ভূমিকা" htmlFor="prof-role">
                <Input id="prof-role" value={getRoleLabelBn(user.role)} disabled />
              </FormField>
            </div>

            <FormField label="পূর্ণ নাম" htmlFor="prof-name" error={errors.fullName?.message} required>
              <Input id="prof-name" {...register('fullName')} />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="মোবাইল নম্বর" htmlFor="prof-phone" error={errors.phone?.message} required>
                <Input id="prof-phone" {...register('phone')} />
              </FormField>
              <FormField label="শ্রেণি" htmlFor="prof-class">
                <Select
                  id="prof-class"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameBn}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="বিদ্যালয় / প্রতিষ্ঠান" htmlFor="prof-inst" error={errors.institution?.message}>
                <Input id="prof-inst" placeholder="আপনার প্রতিষ্ঠানের নাম" {...register('institution')} />
              </FormField>
              <FormField label="পছন্দের ভাষা" htmlFor="prof-lang" error={errors.preferredLanguage?.message}>
                <Select id="prof-lang" {...register('preferredLanguage')}>
                  <option value="bn">বাংলা</option>
                  <option value="en">English (ইংরেজি)</option>
                </Select>
              </FormField>
            </div>

            <FormField label="সংক্ষিপ্ত পরিচিতি (Bio)" htmlFor="prof-bio">
              <Input
                id="prof-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="আপনার পছন্দের বিষয় বা লক্ষ্য..."
              />
            </FormField>

            {/* Privacy Controls */}
            <div className="rounded-xl border border-[#D4A853]/25 bg-[#0A0D12] p-4 space-y-2.5">
              <p className="text-sm font-bold text-[#EAC779]">পাবলিক প্রোফাইল গোপনীয়তা সেটিংস</p>
              <div className="space-y-2 text-sm text-[#E5E0D5]">
                {[
                  { key: 'showProfilePublicly' as const, label: 'পাবলিক প্রোফাইল সবার জন্য দৃশ্যমান রাখুন' },
                  { key: 'showSchool' as const, label: 'বিদ্যালয় / প্রতিষ্ঠানের নাম দেখান' },
                  { key: 'showSubjectPerformance' as const, label: 'বিষয়ভিত্তিক পারফরম্যান্স দেখান' },
                  { key: 'showExamHistory' as const, label: 'সাম্প্রতিক পরীক্ষার ইতিহাস দেখান' },
                  { key: 'showAchievements' as const, label: 'অর্জিত ব্যাজ ও সম্মাননা দেখান' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacy[item.key]}
                      onChange={(e) =>
                        setPrivacy((prev) => ({ ...prev, [item.key]: e.target.checked }))
                      }
                      className="accent-[#D4A853]"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {savedNotice && (
              <p className="text-sm font-medium text-emerald-400">
                আপনার প্রোফাইল ও গোপনীয়তা পরিবর্তনসমূহ সংরক্ষিত হয়েছে।
              </p>
            )}

            <div className="pt-2">
              <Button type="submit">পরিবর্তন সংরক্ষণ করুন</Button>
            </div>
          </form>
        </Card>

        {/* Right Column: Achievements & Recent Exam History */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-5 space-y-3">
            <h2 className="text-base font-bold text-[#EAC779] border-b border-[#D4A853]/15 pb-2">
              অর্জিত সম্মাননা ({toBanglaDigits(statsView?.achievements.length ?? 0)})
            </h2>
            {!statsView || statsView.achievements.length === 0 ? (
              <p className="text-sm text-[#9DA6B5]">
                লাইভ পরীক্ষায় অংশগ্রহণ করে প্রথম অর্জন আনলক করুন।
              </p>
            ) : (
              <div className="space-y-2.5">
                {statsView.achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className="rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-3"
                  >
                    <p className="text-sm font-bold text-[#F5EFE2]">{ach.title}</p>
                    <p className="text-xs text-[#9DA6B5] mt-0.5">{ach.description}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#D4A853]/15 pb-2">
              <h2 className="text-base font-bold text-[#EAC779]">সাম্প্রতিক লাইভ পরীক্ষা</h2>
              <Link to="/exams" className="text-xs font-semibold text-[#EAC779] hover:underline">
                নতুন পরীক্ষা →
              </Link>
            </div>
            {!statsView || statsView.examHistory.length === 0 ? (
              <p className="text-sm text-[#9DA6B5]">এখনো কোনো লাইভ পরীক্ষায় অংশ নেওয়া হয়নি।</p>
            ) : (
              <div className="space-y-2.5 text-sm tabular-nums">
                {statsView.examHistory.slice(0, 5).map((h) => (
                  <Link
                    key={h.attemptId}
                    to={`/exams/${h.examId}/result/${h.attemptId}`}
                    className="block rounded-lg border border-[#D4A853]/15 bg-[#0A0D12] p-3 hover:border-[#EAC779]/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#F5EFE2] truncate">{h.examTitle}</span>
                      <span className="font-bold text-[#EAC779] shrink-0">
                        {toBanglaDigits(h.finalScore)}/{toBanglaDigits(h.totalMarks)}
                      </span>
                    </div>
                    <p className="text-xs text-[#9DA6B5] mt-0.5">
                      {h.subjectName} • নির্ভুলতা {toBanglaDigits(h.accuracyPercent)}%
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
