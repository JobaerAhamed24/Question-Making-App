import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Eye,
  FilePlus2,
  Heart,
  Search,
} from 'lucide-react';
import {
  AccessRestrictedState,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Pagination,
  Select,
} from '../../components/ui/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getDifficultyLabelBn, toBanglaDigits } from '../../lib/bn';
import { questionBankService } from '../../services/questionBankService';
import { questionService } from '../../services/questionService';
import type { Question } from '../../types/domain';

const PAGE_SIZE = 6;

export function QuestionBankPage({
  mode = 'browse',
}: {
  mode?: 'browse' | 'favorites' | 'saved';
}) {
  const { user, revision, bumpRevision } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const catalogue = questionBankService.getAcademicCatalogue();
  const permittedClassIds = user ? questionBankService.getUserPermittedClasses(user.id) : [];
  const { favoriteIds, savedIds } = useMemo(
    () => (user ? questionBankService.getUserFavoritesAndSaved(user.id) : { favoriteIds: [], savedIds: [] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, revision]
  );

  const [classId, setClassId] = useState<string>(searchParams.get('classId') || 'all');
  const [groupId, setGroupId] = useState<string>('all');
  const [subjectId, setSubjectId] = useState<string>('all');
  const [chapterId, setChapterId] = useState<string>('all');
  const [topicId, setTopicId] = useState<string>('all');
  const [typeCode, setTypeCode] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [marksFilter, setMarksFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'marks_asc' | 'marks_desc'>('newest');
  const [page, setPage] = useState<number>(1);
  const [expandedAnswerIds, setExpandedAnswerIds] = useState<Record<string, boolean>>({});
  const [addToPaperTarget, setAddToPaperTarget] = useState<Question | null>(null);

  const questionQuery = useQuery({
    queryKey: ['question-bank', user?.id, mode, classId, groupId, subjectId, chapterId, topicId, typeCode, difficulty, marksFilter, searchText, page, sortBy, favoriteIds.join(','), savedIds.join(',')],
    enabled: Boolean(user) && (user?.role === 'admin' || permittedClassIds.length > 0),
    queryFn: async () => mode === 'browse'
      ? questionService.listPaginatedQuestions({
          classId, groupId, subjectId, chapterId, topicId, typeCode, difficulty,
          marks: marksFilter, search: searchText, page, pageSize: PAGE_SIZE, sort: sortBy,
        })
      : questionService.listQuestionsByIds(mode === 'favorites' ? favoriteIds : savedIds),
  });
  const allAllowedQuestions = mode === 'browse'
    ? questionQuery.data && 'items' in questionQuery.data ? questionQuery.data.items : []
    : Array.isArray(questionQuery.data) ? questionQuery.data : [];

  const hasAnyAccess = user?.role === 'admin' || permittedClassIds.length > 0;
  const userPapers = user ? questionBankService.getUserPapers(user.id) : [];

  const selectedWrongClass =
    classId !== 'all' && user?.role !== 'admin' && !permittedClassIds.includes(classId);

  const baseList = useMemo(() => {
    if (mode === 'favorites') {
      return allAllowedQuestions.filter((q) => favoriteIds.includes(q.id));
    }
    if (mode === 'saved') {
      return allAllowedQuestions.filter((q) => savedIds.includes(q.id));
    }
    return allAllowedQuestions;
  }, [allAllowedQuestions, favoriteIds, savedIds, mode]);

  const filteredQuestions = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const list = baseList.filter((q) => {
      if (classId !== 'all' && q.classId !== classId) return false;
      if (groupId !== 'all' && q.groupId !== groupId) return false;
      if (subjectId !== 'all' && q.subjectId !== subjectId) return false;
      if (chapterId !== 'all' && q.chapterId !== chapterId) return false;
      if (topicId !== 'all' && q.topicId !== topicId) return false;
      if (typeCode !== 'all' && q.questionTypeCode !== typeCode) return false;
      if (difficulty !== 'all' && q.difficulty !== difficulty) return false;
      if (marksFilter !== 'all' && String(q.marks) !== marksFilter) return false;
      if (query) {
        const hay = `${q.prompt} ${q.stimulus || ''} ${q.correctAnswerText || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'marks_asc') return a.marks - b.marks;
      if (sortBy === 'marks_desc') return b.marks - a.marks;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    baseList,
    classId,
    groupId,
    subjectId,
    chapterId,
    topicId,
    typeCode,
    difficulty,
    marksFilter,
    searchText,
    sortBy,
  ]);

  if (!user) return null;

  const totalPages = mode === 'browse' && questionQuery.data && 'totalPages' in questionQuery.data
    ? Math.max(1, questionQuery.data.totalPages)
    : Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedQuestions = mode === 'browse'
    ? filteredQuestions
    : filteredQuestions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const availableSubjects = catalogue.subjects.filter(
    (s) => classId === 'all' || s.classId === classId
  );
  const availableChapters = catalogue.chapters.filter(
    (c) => subjectId === 'all' || c.subjectId === subjectId
  );
  const availableTopics = catalogue.topics.filter(
    (t) => chapterId === 'all' || t.chapterId === chapterId
  );

  const getClassName = (id: string) => catalogue.classes.find((c) => c.id === id)?.nameBn || id;
  const getSubjectName = (id: string) => catalogue.subjects.find((s) => s.id === id)?.nameBn || id;
  const getChapterName = (id: string) => catalogue.chapters.find((c) => c.id === id)?.nameBn || id;
  const getTypeName = (code: string) =>
    catalogue.questionTypes.find((qt) => qt.code === code)?.nameBn || code;

  const handleToggleFavorite = (qId: string) => {
    try {
      questionBankService.toggleFavorite(user, qId);
      bumpRevision();
    } catch (err) {
      pushToast({
        title: 'প্রবেশাধিকার সীমাবদ্ধ',
        description: err instanceof Error ? err.message : 'পছন্দসই তালিকা হালনাগাদ করা যায়নি।',
        variant: 'error',
      });
    }
  };

  const handleToggleSaved = (qId: string) => {
    try {
      questionBankService.toggleSaved(user, qId);
      bumpRevision();
    } catch (err) {
      pushToast({
        title: 'প্রবেশাধিকার সীমাবদ্ধ',
        description: err instanceof Error ? err.message : 'সংরক্ষিত প্রশ্ন তালিকা হালনাগাদ করা যায়নি।',
        variant: 'error',
      });
    }
  };

  const handleAppendToExistingPaper = (paperId: string) => {
    if (!addToPaperTarget) return;
    try {
      const paper = questionBankService.getPaperById(paperId, user);
      const nextItem = questionBankService.buildSnapshotItemFromQuestion(
        addToPaperTarget,
        paper.items.length
      );
      questionBankService.savePaper(user, {
        ...paper,
        items: [...paper.items, nextItem],
      });
      setAddToPaperTarget(null);
      bumpRevision();
      pushToast({
        title: 'প্রশ্নপত্রে যুক্ত হয়েছে',
        description: `"${paper.title}" প্রশ্নপত্রে প্রশ্নটি যুক্ত করা হয়েছে।`,
        variant: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'প্রশ্ন যুক্ত করা যায়নি',
        description: err instanceof Error ? err.message : 'প্রশ্ন যুক্ত করার সময় ত্রুটি ঘটেছে।',
        variant: 'error',
      });
    }
  };

  if (!hasAnyAccess) {
    return (
      <div className="space-y-6 font-bangla">
        <Card className="p-5">
          <h1 className="font-display text-2xl font-bold gold-text-gradient">প্রশ্নব্যাংক</h1>
          <p className="mt-1 text-base text-[#B8C0CE]">
            শ্রেণি, বিষয়, অধ্যায় ও টপিক অনুযায়ী যাচাইকৃত প্রশ্ন ব্রাউজ করুন।
          </p>
        </Card>
        <AccessRestrictedState
          title="সক্রিয় শ্রেণি সাবস্ক্রিপশন প্রয়োজন"
          description="আপনার অ্যাকাউন্টে বর্তমানে কোনো সক্রিয় শ্রেণির সাবস্ক্রিপশন নেই। প্রশ্নব্যাংকের প্রশ্ন, উত্তর ও ব্যাখ্যা দেখতে এক বা একাধিক শ্রেণির প্ল্যান সাবস্ক্রাইব করুন। আপনার পূর্বের সংরক্ষিত প্রশ্নপত্রসমূহ «আমার প্রশ্নপত্র» অংশে অক্ষত রয়েছে।"
          action={
            <>
              <Link
                to="/dashboard/payments/new"
                className="rounded-lg gold-btn px-5 py-2.5 text-sm font-bold"
              >
                শ্রেণি প্ল্যান সাবস্ক্রাইব করুন
              </Link>
              <Link
                to="/dashboard/papers"
                className="rounded-lg gold-outline-btn px-5 py-2.5 text-sm font-semibold"
              >
                আমার সংরক্ষিত প্রশ্নপত্র দেখুন
              </Link>
            </>
          }
        />
      </div>
    );
  }

  if (questionQuery.isLoading) {
    return <Card className="p-8 text-center text-sm text-[#B8C0CE]">প্রশ্নগুলো লোড হচ্ছে…</Card>;
  }
  if (questionQuery.isError) {
    return <EmptyState title="প্রশ্ন লোড করা যায়নি" description={questionQuery.error instanceof Error ? questionQuery.error.message : 'পরে আবার চেষ্টা করুন।'} />;
  }

  const totalResults = mode === 'browse' && questionQuery.data && 'total' in questionQuery.data
    ? questionQuery.data.total
    : filteredQuestions.length;
  const pageHeading =
    mode === 'favorites'
      ? 'পছন্দসই প্রশ্নসমূহ'
      : mode === 'saved'
      ? 'সংরক্ষিত প্রশ্নসমূহ'
      : 'প্রশ্নব্যাংক';

  return (
    <div className="space-y-6 font-bangla">
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold gold-text-gradient">{pageHeading}</h1>
          <p className="mt-1 text-base text-[#B8C0CE] tabular-nums">
            অনুমোদিত শ্রেণি ({user.role === 'admin' ? 'সকল শ্রেণি' : permittedClassIds.map(getClassName).join(', ')}) থেকে{' '}
            {toBanglaDigits(totalResults)}টি প্রশ্ন পাওয়া গেছে
          </p>
        </div>
        <Link
          to="/dashboard/papers/new"
          className="inline-flex items-center gap-2 rounded-lg gold-btn px-4 py-2 text-sm font-bold whitespace-nowrap self-start"
        >
          <FilePlus2 className="h-4 w-4" />
          <span>নতুন প্রশ্নপত্র তৈরি</span>
        </Link>
      </Card>

      {/* ফিল্টার প্যানেল */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C95A4]" />
            <Input
              aria-label="প্রশ্ন অনুসন্ধান"
              placeholder="প্রশ্ন, উদ্দীপক বা উত্তর দিয়ে খুঁজুন..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <Select
            aria-label="শ্রেণি অনুযায়ী ফিল্টার"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setGroupId('all');
              setSubjectId('all');
              setChapterId('all');
              setTopicId('all');
              setPage(1);
            }}
          >
            <option value="all">সকল অনুমোদিত শ্রেণি</option>
            {catalogue.classes.map((c) => {
              const permitted = user.role === 'admin' || permittedClassIds.includes(c.id);
              return (
                <option key={c.id} value={c.id}>
                  {c.nameBn} {permitted ? '' : '(তালাবদ্ধ)'}
                </option>
              );
            })}
          </Select>

          <Select
            aria-label="ক্রম সাজানো"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="newest">সাজান: সাম্প্রতিক আগে</option>
            <option value="marks_asc">নম্বর: কম থেকে বেশি</option>
            <option value="marks_desc">নম্বর: বেশি থেকে কম</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Select
            aria-label="বিভাগ অনুযায়ী ফিল্টার"
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">সকল বিভাগ</option>
            {catalogue.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nameBn}
              </option>
            ))}
          </Select>

          <Select
            aria-label="বিষয় অনুযায়ী ফিল্টার"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setChapterId('all');
              setTopicId('all');
              setPage(1);
            }}
          >
            <option value="all">সকল বিষয়</option>
            {availableSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameBn}
              </option>
            ))}
          </Select>

          <Select
            aria-label="অধ্যায় অনুযায়ী ফিল্টার"
            value={chapterId}
            onChange={(e) => {
              setChapterId(e.target.value);
              setTopicId('all');
              setPage(1);
            }}
          >
            <option value="all">সকল অধ্যায়</option>
            {availableChapters.map((c) => (
              <option key={c.id} value={c.id}>
                অধ্যায় {toBanglaDigits(c.chapterNumber)}: {c.nameBn}
              </option>
            ))}
          </Select>

          <Select
            aria-label="টপিক অনুযায়ী ফিল্টার"
            value={topicId}
            onChange={(e) => {
              setTopicId(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">সকল টপিক</option>
            {availableTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nameBn}
              </option>
            ))}
          </Select>

          <Select
            aria-label="প্রশ্নের ধরন অনুযায়ী ফিল্টার"
            value={typeCode}
            onChange={(e) => {
              setTypeCode(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">সকল ধরন</option>
            {catalogue.questionTypes.map((qt) => (
              <option key={qt.id} value={qt.code}>
                {qt.nameBn}
              </option>
            ))}
          </Select>

          <div className="flex gap-2">
            <Select
              aria-label="কঠিনতার স্তর"
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">স্তর</option>
              <option value="easy">সহজ</option>
              <option value="medium">মধ্যম</option>
              <option value="hard">কঠিন</option>
            </Select>
            <Select
              aria-label="নম্বর অনুযায়ী ফিল্টার"
              value={marksFilter}
              onChange={(e) => {
                setMarksFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">নম্বর</option>
              <option value="1">১</option>
              <option value="2">২</option>
              <option value="4">৪</option>
              <option value="10">১০</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* অনুপযুক্ত শ্রেণির প্রবেশাধিকার বাধা */}
      {selectedWrongClass ? (
        <AccessRestrictedState
          title={`${getClassName(classId)}-এর জন্য সক্রিয় সাবস্ক্রিপশন নেই`}
          description={`আপনার বর্তমান সাবস্ক্রিপশনে কেবলমাত্র ${permittedClassIds
            .map(getClassName)
            .join(', ')} অন্তর্ভুক্ত রয়েছে। সক্রিয় প্ল্যান ছাড়া ${getClassName(
            classId
          )}-এর প্রশ্ন ও উত্তর দেখা সম্পূর্ণ সীমাবদ্ধ।`}
          action={
            <>
              <Button variant="outline" onClick={() => setClassId('all')}>
                আমার অনুমোদিত শ্রেণি দেখুন
              </Button>
              <Link
                to="/dashboard/payments/new"
                className="rounded-lg gold-btn px-4 py-2 text-sm font-bold"
              >
                প্ল্যান আপগ্রেড করুন
              </Link>
            </>
          }
        />
      ) : pagedQuestions.length === 0 ? (
        <EmptyState
          title={
            mode === 'favorites'
              ? 'কোনো পছন্দসই প্রশ্ন নেই'
              : mode === 'saved'
              ? 'কোনো সংরক্ষিত প্রশ্ন নেই'
              : 'ফিল্টারের সাথে কোনো প্রশ্ন মেলেনি'
          }
          description="অনুসন্ধান শব্দ মুছে ফেলুন অথবা অন্য বিষয় ও অধ্যায় নির্বাচন করে চেষ্টা করুন।"
          action={
            <Button
              variant="outline"
              onClick={() => {
                setClassId('all');
                setGroupId('all');
                setSubjectId('all');
                setChapterId('all');
                setTopicId('all');
                setTypeCode('all');
                setDifficulty('all');
                setMarksFilter('all');
                setSearchText('');
              }}
            >
              সকল ফিল্টার রিসেট করুন
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {pagedQuestions.map((q) => {
            const isFav = favoriteIds.includes(q.id);
            const isSaved = savedIds.includes(q.id);
            const isAnsOpen = !!expandedAnswerIds[q.id];

            return (
              <Card key={q.id} className="p-5 space-y-3">
                {/* মেটাডাটা লাইন */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#9DA6B5]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-[#F5EFE2]">{getClassName(q.classId)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{getSubjectName(q.subjectId)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{getChapterName(q.chapterId)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#EAC779] font-medium">{getTypeName(q.questionTypeCode)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{getDifficultyLabelBn(q.difficulty)}</span>
                  </div>
                  <span className="font-mono font-semibold text-[#EAC779] tabular-nums">
                    {toBanglaDigits(q.marks)} নম্বর
                  </span>
                </div>

                {/* উদ্দীপক ও প্রশ্ন */}
                {q.stimulus && (
                  <p className="rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-3 text-base text-[#E5E0D5] leading-relaxed">
                    {q.stimulus}
                  </p>
                )}

                <p className="text-base font-medium text-[#F5EFE2] leading-relaxed">{q.prompt}</p>

                {q.equationLatex && (
                  <p className="font-mono text-sm text-[#EAC779] bg-[#0A0D12] px-3 py-1.5 rounded-lg border border-[#D4A853]/25 inline-block">
                    {q.equationLatex}
                  </p>
                )}

                {q.imageUrl && (
                  <div className="pt-1">
                    <img
                      src={q.imageUrl}
                      alt={q.imageCaption || 'প্রশ্নের চিত্র'}
                      referrerPolicy="no-referrer"
                      className="max-h-48 rounded-lg border border-[#D4A853]/30 bg-[#F5EFE2] p-1.5 object-contain"
                    />
                  </div>
                )}

                {/* বহুনির্বাচনি অপশন */}
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1 text-sm text-[#E5E0D5]">
                    {q.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`rounded-lg border px-3 py-1.5 ${
                          isAnsOpen && opt.isCorrect
                            ? 'border-emerald-500/45 bg-emerald-950/60 text-emerald-200 font-medium'
                            : 'border-[#D4A853]/20 bg-[#0A0D12]'
                        }`}
                      >
                        <span className="font-semibold mr-1.5 text-[#D4A853]">({opt.label})</span>
                        <span>{opt.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* সৃজনশীল উপ-প্রশ্ন */}
                {q.subParts && q.subParts.length > 0 && (
                  <div className="space-y-1.5 border-t border-[#D4A853]/15 pt-2 text-sm text-[#E5E0D5]">
                    {q.subParts.map((sp) => (
                      <div key={sp.id} className="flex justify-between gap-3">
                        <span>
                          <span className="font-semibold text-[#EAC779]">{sp.label})</span> {sp.prompt}
                        </span>
                        <span className="text-sm text-[#9DA6B5] tabular-nums">[{toBanglaDigits(sp.marks)}]</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* উত্তর ও ব্যাখ্যা */}
                {isAnsOpen && (
                  <div className="rounded-lg border border-emerald-500/35 bg-emerald-950/40 p-3.5 text-sm space-y-1.5">
                    {q.correctAnswerText && (
                      <p className="text-emerald-200">
                        <span className="font-semibold">উত্তর: </span>
                        {q.correctAnswerText}
                      </p>
                    )}
                    {q.subParts && q.subParts.length > 0 && (
                      <ul className="space-y-1 text-emerald-200/90 text-sm">
                        {q.subParts.map((sp) => (
                          <li key={sp.id}>
                            <span className="font-semibold">{sp.label})</span> {sp.answer}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.explanation && (
                      <p className="text-sm text-[#C2C8D3] leading-relaxed">
                        <span className="font-semibold text-[#EAC779]">ব্যাখ্যা: </span>
                        {q.explanation}
                      </p>
                    )}
                  </div>
                )}

                {/* অ্যাকশন টুলবার */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#D4A853]/15 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setExpandedAnswerIds((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                      }
                    >
                      {isAnsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      <span>{isAnsOpen ? 'উত্তর লুকান' : 'উত্তর ও ব্যাখ্যা দেখুন'}</span>
                    </Button>

                    <Link
                      to={`/dashboard/questions/${q.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg gold-outline-btn px-3 py-1.5 text-sm font-medium"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#D4A853]" />
                      <span>বিস্তারিত</span>
                    </Link>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(q.id)}
                      aria-label={isFav ? 'পছন্দসই থেকে সরান' : 'পছন্দসইয়ে যোগ করুন'}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                        isFav
                          ? 'border-rose-500/40 bg-rose-950/60 text-rose-300'
                          : 'border-[#D4A853]/28 bg-[#0A0D12] text-[#C2C8D3] hover:border-[#EAC779]'
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                      <span>{isFav ? 'পছন্দসই' : 'পছন্দ করুন'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleSaved(q.id)}
                      aria-label={isSaved ? 'সংরক্ষিত থেকে সরান' : 'প্রশ্ন সংরক্ষণ করুন'}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                        isSaved
                          ? 'border-[#D4A853]/50 bg-[#D4A853]/20 text-[#EAC779]'
                          : 'border-[#D4A853]/28 bg-[#0A0D12] text-[#C2C8D3] hover:border-[#EAC779]'
                      }`}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
                      <span>{isSaved ? 'সংরক্ষিত' : 'সংরক্ষণ'}</span>
                    </button>

                    <Button size="sm" onClick={() => setAddToPaperTarget(q)}>
                      <FilePlus2 className="h-3.5 w-3.5" />
                      <span>প্রশ্নপত্রে যোগ করুন</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}

          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* প্রশ্নপত্রে যোগ করার মোডাল */}
      <Modal
        open={!!addToPaperTarget}
        onClose={() => setAddToPaperTarget(null)}
        title="প্রশ্নপত্রে প্রশ্ন যুক্ত করুন"
        description="প্রশ্নটি আপনার সংরক্ষিত কোনো প্রশ্নপত্রে যোগ করুন অথবা এটি দিয়ে নতুন প্রশ্নপত্র শুরু করুন।"
      >
        <div className="space-y-4 font-bangla">
          {userPapers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#EAC779]">আপনার সংরক্ষিত প্রশ্নপত্রসমূহ</p>
              <div className="divide-y divide-[#D4A853]/15 rounded-lg border border-[#D4A853]/25 bg-[#090B10]">
                {userPapers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#F5EFE2]">{p.title}</p>
                      <p className="text-sm text-[#9DA6B5] tabular-nums">{toBanglaDigits(p.items.length)}টি প্রশ্ন</p>
                    </div>
                    <Button size="sm" onClick={() => handleAppendToExistingPaper(p.id)}>
                      যুক্ত করুন
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-[#D4A853]/20 pt-3 flex justify-between items-center">
            <span className="text-sm text-[#B8C0CE]">অথবা একদম নতুন প্রশ্নপত্র তৈরি করুন</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!addToPaperTarget) return;
                navigate(
                  `/dashboard/papers/new?seedQuestionId=${addToPaperTarget.id}&classId=${addToPaperTarget.classId}&subjectId=${addToPaperTarget.subjectId}`
                );
              }}
            >
              নতুন প্রশ্নপত্র শুরু করুন
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function QuestionDetailPage({ questionId }: { questionId: string }) {
  const { user, bumpRevision } = useAuth();
  const { pushToast } = useToast();
  const catalogue = questionBankService.getAcademicCatalogue();
  const detailQuery = useQuery({
    queryKey: ['question-detail', user?.id, questionId],
    queryFn: () => questionService.getQuestionById(questionId),
    enabled: Boolean(user),
  });

  if (!user) return null;
  if (detailQuery.isLoading) return <Card className="p-8 text-center text-sm text-[#B8C0CE]">প্রশ্ন লোড হচ্ছে…</Card>;
  if (detailQuery.isError || !detailQuery.data) {
    return (
      <AccessRestrictedState
        title="প্রশ্নটি পাওয়া যাচ্ছে না"
        description="প্রশ্নটি আপনার সক্রিয় সাবস্ক্রিপশনের অন্তর্ভুক্ত নাও হতে পারে, অথবা এটি সরানো হয়েছে।"
        action={<Link to="/dashboard/payments/new" className="rounded-lg gold-btn px-4 py-2 text-sm font-bold">সাবস্ক্রিপশন দেখুন</Link>}
      />
    );
  }
  const result = detailQuery.data;

  if (!result.hasAccess) {
    const clsName = catalogue.classes.find((c) => c.id === result.question.classId)?.nameBn || 'এই শ্রেণি';
    return (
      <AccessRestrictedState
        title={`${clsName}-এর জন্য সাবস্ক্রিপশন প্রয়োজন`}
        description="সংশ্লিষ্ট শ্রেণির সক্রিয় সাবস্ক্রিপশন ছাড়া সংরক্ষিত প্রশ্ন, বহুনির্বাচনি অপশন, উত্তর এবং ব্যাখ্যা দেখা যাবে না।"
        action={
          <Link
            to="/dashboard/payments/new"
            className="rounded-lg gold-btn px-4 py-2 text-sm font-bold"
          >
            আনলক করতে সাবস্ক্রাইব করুন
          </Link>
        }
      />
    );
  }

  const q = result.question as Question;
  const { favoriteIds, savedIds } = questionBankService.getUserFavoritesAndSaved(user.id);
  const isFav = favoriteIds.includes(q.id);
  const isSaved = savedIds.includes(q.id);

  const getClassName = (id: string) => catalogue.classes.find((c) => c.id === id)?.nameBn || id;
  const getSubjectName = (id: string) => catalogue.subjects.find((s) => s.id === id)?.nameBn || id;
  const getChapterName = (id: string) => catalogue.chapters.find((c) => c.id === id)?.nameBn || id;

  return (
    <div className="max-w-3xl space-y-6 font-bangla">
      <div className="flex items-center justify-between gap-4">
        <Link to="/dashboard/questions" className="text-base font-medium text-[#EAC779] hover:underline">
          ← প্রশ্নব্যাংকে ফিরে যান
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              questionBankService.toggleFavorite(user, q.id);
              bumpRevision();
              pushToast({ title: isFav ? 'পছন্দসই থেকে সরানো হয়েছে' : 'পছন্দসইয়ে যোগ করা হয়েছে', variant: 'info' });
            }}
          >
            <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current text-rose-400' : ''}`} />
            <span>{isFav ? 'পছন্দসই' : 'পছন্দ করুন'}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              questionBankService.toggleSaved(user, q.id);
              bumpRevision();
              pushToast({ title: isSaved ? 'সংরক্ষিত থেকে সরানো হয়েছে' : 'প্রশ্ন সংরক্ষণ করা হয়েছে', variant: 'info' });
            }}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current text-[#EAC779]' : ''}`} />
            <span>{isSaved ? 'সংরক্ষিত' : 'সংরক্ষণ'}</span>
          </Button>
        </div>
      </div>

      <Card className="p-6 space-y-5">
        <div className="text-sm text-[#9DA6B5]">
          {getClassName(q.classId)} · {getSubjectName(q.subjectId)} · {getChapterName(q.chapterId)} ·{' '}
          <span>{getDifficultyLabelBn(q.difficulty)}</span> ·{' '}
          <span className="font-semibold text-[#EAC779]">{toBanglaDigits(q.marks)} নম্বর</span>
        </div>

        {q.stimulus && (
          <div className="rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-4 text-base text-[#E5E0D5] leading-relaxed">
            {q.stimulus}
          </div>
        )}

        <h1 className="text-lg font-semibold text-[#F5EFE2] leading-relaxed">{q.prompt}</h1>

        {q.imageUrl && (
          <img
            src={q.imageUrl}
            alt={q.imageCaption || 'প্রশ্নের চিত্র'}
            referrerPolicy="no-referrer"
            className="max-h-60 rounded-lg border border-[#D4A853]/30 p-2 bg-[#F5EFE2]"
          />
        )}

        {q.options && (
          <div className="space-y-2">
            {q.options.map((opt) => (
              <div
                key={opt.id}
                className={`rounded-lg border px-4 py-2.5 text-base ${
                  opt.isCorrect
                    ? 'border-emerald-500/45 bg-emerald-950/60 font-medium text-emerald-200'
                    : 'border-[#D4A853]/20 bg-[#0A0D12] text-[#E5E0D5]'
                }`}
              >
                ({opt.label}) {opt.text}
              </div>
            ))}
          </div>
        )}

        {q.subParts && (
          <div className="space-y-3 border-t border-[#D4A853]/15 pt-4">
            {q.subParts.map((sp) => (
              <div key={sp.id} className="rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-3 text-base space-y-1">
                <div className="flex justify-between font-medium text-[#F5EFE2]">
                  <span>
                    {sp.label}) {sp.prompt}
                  </span>
                  <span className="text-sm text-[#D4A853]">[{toBanglaDigits(sp.marks)}]</span>
                </div>
                <p className="text-sm text-emerald-300">উত্তর: {sp.answer}</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-emerald-500/35 bg-emerald-950/40 p-4 space-y-1.5 text-base">
          {q.correctAnswerText && (
            <p className="text-emerald-200">
              <span className="font-semibold">উত্তর: </span>
              {q.correctAnswerText}
            </p>
          )}
          {q.explanation && (
            <p className="text-[#C2C8D3] leading-relaxed">
              <span className="font-semibold text-[#EAC779]">ব্যাখ্যা: </span>
              {q.explanation}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
