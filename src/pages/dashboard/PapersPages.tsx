import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
  FileText,
  GripVertical,
  Lock,
  Plus,
  Printer,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { PaperPreviewSheet } from '../../components/domain/PaperPreviewSheet';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FormField,
  Input,
  Select,
  Textarea,
} from '../../components/ui/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatBnDate, getDifficultyLabelBn, toBanglaDigits } from '../../lib/bn';
import { generatePaperDocxBlob, triggerBlobDownload } from '../../lib/docxExport';
import { calculatePaperTotalMarks, canUserAddQuestionToPaper } from '../../lib/rules';
import { platformService } from '../../services/platformService';
import { questionBankService } from '../../services/questionBankService';
import type { Question, QuestionPaper, QuestionPaperItem } from '../../types/domain';

export function MyPapersPage() {
  const { user, revision, bumpRevision } = useAuth();
  const { pushToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<QuestionPaper | null>(null);

  const catalogue = questionBankService.getAcademicCatalogue();
  const papers = useMemo(() => {
    if (!user) return [];
    const legacy = questionBankService.getUserPapers(user.id);
    const studio = platformService.listStudioPapers(user.id);
    const map = new Map<string, QuestionPaper>();
    [...studio, ...legacy].forEach((p) => {
      if (!map.has(p.id)) map.set(p.id, p);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, revision]);

  if (!user) return null;

  const permittedClasses = questionBankService.getUserPermittedClasses(user.id);
  const canCreateNew = user.role === 'admin' || permittedClasses.length > 0;
  const getClassName = (id: string) => catalogue.classes.find((c) => c.id === id)?.nameBn || id;
  const getSubjectName = (id: string) => catalogue.subjects.find((s) => s.id === id)?.nameBn || id;

  return (
    <div className="space-y-6 font-bangla">
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold gold-text-gradient">আমার প্রশ্নপত্রসমূহ</h1>
          <p className="mt-1 text-base text-[#B8C0CE]">
            সংরক্ষিত প্রশ্নপত্রে প্রশ্নের স্থায়ী স্ন্যাপশট সংরক্ষিত থাকে, যা সাবস্ক্রিপশনের মেয়াদ শেষ হওয়ার পরও দেখা ও এক্সপোর্ট করা যায়।
          </p>
        </div>
        {canCreateNew ? (
          <Link
            to="/dashboard/papers/new"
            className="inline-flex items-center gap-2 rounded-lg gold-btn px-4 py-2 text-sm font-bold whitespace-nowrap self-start"
          >
            <Plus className="h-4 w-4" />
            <span>নতুন প্রশ্নপত্র তৈরি করুন</span>
          </Link>
        ) : (
          <Link
            to="/dashboard/payments/new"
            className="inline-flex items-center gap-2 rounded-lg gold-outline-btn px-4 py-2 text-sm font-semibold whitespace-nowrap self-start"
          >
            <Lock className="h-4 w-4 text-[#D4A853]" />
            <span>নতুন প্রশ্নপত্র তৈরি করতে নবায়ন করুন</span>
          </Link>
        )}
      </Card>

      {papers.length === 0 ? (
        <EmptyState
          title="কোনো সংরক্ষিত প্রশ্নপত্র নেই"
          description="প্রশ্নপত্র জেনারেটর ব্যবহার করে প্রশ্ন বাছাই করুন, নম্বর বণ্টন করুন এবং পিডিএফ বা ওয়ার্ড আকারে ডাউনলোড করুন।"
          icon={<FileText className="h-5 w-5" />}
          action={
            canCreateNew ? (
              <Link
                to="/dashboard/papers/new"
                className="rounded-lg gold-btn px-4 py-2 text-sm font-bold"
              >
                প্রথম প্রশ্নপত্র তৈরি করুন
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {papers.map((paper) => (
            <Card key={paper.id} className="p-5 flex flex-col justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-[#D4A853] tabular-nums">
                  {getClassName(paper.classId)} · {getSubjectName(paper.subjectId)} · হালনাগাদ{' '}
                  {formatBnDate(paper.updatedAt)}
                </p>
                <h2 className="mt-1 font-display text-lg font-bold text-[#F5EFE2]">
                  {paper.title}
                </h2>
                <p className="text-sm text-[#B8C0CE]">
                  {paper.examName} · {paper.schoolName}
                </p>
                <p className="mt-2 text-sm font-medium text-[#E5E0D5] tabular-nums">
                  {toBanglaDigits(paper.items.length)}টি প্রশ্ন · মোট {toBanglaDigits(calculatePaperTotalMarks(paper.items))} নম্বর ·{' '}
                  {toBanglaDigits(paper.durationMinutes)} মিনিট
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-[#D4A853]/15 pt-3">
                <Link
                  to={`/paper-editor/${paper.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg gold-btn px-3 py-1.5 text-sm font-bold"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>ডকুমেন্ট এডিটর ও OMR</span>
                </Link>
                {!paper.id.startsWith('paper-studio') && (
                  <Link
                    to={`/dashboard/papers/${paper.id}/preview`}
                    className="inline-flex items-center gap-1.5 rounded-lg gold-outline-btn px-3 py-1.5 text-sm font-medium"
                  >
                    <span>দ্রুত প্রিভিউ</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setDeleteTarget(paper)}
                  aria-label={`প্রশ্নপত্র ${paper.title} মুছুন`}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-950/40 px-2.5 py-1.5 text-sm font-medium text-rose-300 hover:bg-rose-900/60 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>মুছুন</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.id.startsWith('paper-studio')) {
            platformService.deleteStudioPaper(deleteTarget.id);
          } else {
            questionBankService.deletePaper(user, deleteTarget.id);
          }
          bumpRevision();
          pushToast({ title: 'প্রশ্নপত্র মুছে ফেলা হয়েছে', variant: 'info' });
        }}
        title="প্রশ্নপত্র মুছে ফেলুন"
        message={`আপনি কি নিশ্চিতভাবে "${deleteTarget?.title}" প্রশ্নপত্রটি স্থায়ীভাবে মুছে ফেলতে চান?`}
        confirmLabel="প্রশ্নপত্র মুছুন"
        danger
      />
    </div>
  );
}

export function PaperBuilderPage() {
  const { user, bumpRevision } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const { paperId } = useParams<{ paperId: string }>();
  const [searchParams] = useSearchParams();

  const catalogue = questionBankService.getAcademicCatalogue();
  const permittedClasses = user ? questionBankService.getUserPermittedClasses(user.id) : [];

  const existingPaper = useMemo(() => {
    if (!paperId || !user) return null;
    try {
      return questionBankService.getPaperById(paperId, user);
    } catch {
      return null;
    }
  }, [paperId, user]);

  const initialClassId =
    existingPaper?.classId ||
    searchParams.get('classId') ||
    permittedClasses[0] ||
    catalogue.classes[0]?.id ||
    'cls-6';

  const initialSubjectId =
    existingPaper?.subjectId ||
    searchParams.get('subjectId') ||
    catalogue.subjects.find((s) => s.classId === initialClassId)?.id ||
    catalogue.subjects[0]?.id ||
    '';

  const initialSeedItems: QuestionPaperItem[] = useMemo(() => {
    if (existingPaper) return existingPaper.items;
    const seedId = searchParams.get('seedQuestionId');
    if (seedId && user) {
      try {
        const res = questionBankService.getQuestionByIdForUser(seedId, user);
        if (res.hasAccess) {
          return [questionBankService.buildSnapshotItemFromQuestion(res.question as Question, 0)];
        }
      } catch {
        // ignore invalid seed
      }
    }
    return [];
  }, [existingPaper, searchParams, user]);

  const [title, setTitle] = useState(existingPaper?.title || 'অধ্যায়ভিত্তিক মূল্যায়ন পরীক্ষা');
  const [examName, setExamName] = useState(existingPaper?.examName || 'অনুশীলন পরীক্ষা — ২০২৬');
  const [classId, setClassId] = useState(initialClassId);
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [schoolName, setSchoolName] = useState(
    existingPaper?.schoolName || user?.institution || 'মডেল একাডেমি'
  );
  const [schoolLogoDataUrl, setSchoolLogoDataUrl] = useState<string | undefined>(
    existingPaper?.schoolLogoDataUrl
  );
  const [examDate, setExamDate] = useState(
    existingPaper?.examDate || new Date().toISOString().slice(0, 10)
  );
  const [durationMinutes, setDurationMinutes] = useState(existingPaper?.durationMinutes || 60);
  const [instructions, setInstructions] = useState(
    existingPaper?.instructions ||
      'সকল প্রশ্নের স্পষ্ট উত্তর দাও। ডান পাশের সংখ্যা প্রশ্নের পূর্ণমান জ্ঞাপক।'
  );
  const [includeStudentFields, setIncludeStudentFields] = useState(
    existingPaper ? existingPaper.includeStudentFields : true
  );
  const [includeHeaderFooter, setIncludeHeaderFooter] = useState(
    existingPaper ? existingPaper.includeHeaderFooter : true
  );
  const [includePageNumbers, setIncludePageNumbers] = useState(
    existingPaper ? existingPaper.includePageNumbers : true
  );
  const [items, setItems] = useState<QuestionPaperItem[]>(initialSeedItems);
  const [showLivePreview, setShowLivePreview] = useState(false);

  const [pickerChapter, setPickerChapter] = useState('all');
  const [pickerType, setPickerType] = useState('all');
  const [pickerSearch, setPickerSearch] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Backend custom paper generator state
  const [genChapters, setGenChapters] = useState<string[]>([]);
  const [genDifficulty, setGenDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [genMcqCount, setGenMcqCount] = useState<number>(1);
  const [genShortCount, setGenShortCount] = useState<number>(0);
  const [genCqCount, setGenCqCount] = useState<number>(0);
  const [genMathCount, setGenMathCount] = useState<number>(0);
  const [genShuffle, setGenShuffle] = useState<boolean>(true);
  const [genBusy, setGenBusy] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);

  if (!user) return null;

  const userSubscriptions = questionBankService.getUserSubscriptions(user.id);
  const canAddQuestionsForClass = canUserAddQuestionToPaper(
    userSubscriptions,
    user.id,
    user.role,
    classId
  );

  const accessibleQuestions = canAddQuestionsForClass
    ? questionBankService
        .listQuestionsForUser(user)
        .filter((q) => {
          if (q.classId !== classId) return false;
          if (subjectId && q.subjectId !== subjectId) return false;
          if (pickerChapter !== 'all' && q.chapterId !== pickerChapter) return false;
          if (pickerType !== 'all' && q.questionTypeCode !== pickerType) return false;
          if (
            pickerSearch.trim() &&
            !q.prompt.toLowerCase().includes(pickerSearch.trim().toLowerCase())
          ) {
            return false;
          }
          return true;
        })
    : [];

  const availableSubjects = catalogue.subjects.filter((s) => s.classId === classId);
  const availableChapters = catalogue.chapters.filter((c) => c.subjectId === subjectId);
  const totalMarks = calculatePaperTotalMarks(items);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSchoolLogoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddQuestion = (q: Question) => {
    if (!canAddQuestionsForClass) {
      pushToast({
        title: 'সাবস্ক্রিপশন প্রয়োজন',
        description: 'মেয়াদোত্তীর্ণ বা সাবস্ক্রিপশনবিহীন ব্যবহারকারী নতুন প্রশ্ন যুক্ত করতে পারবেন না।',
        variant: 'error',
      });
      return;
    }
    const nextItem = questionBankService.buildSnapshotItemFromQuestion(q, items.length);
    setItems((prev) => [...prev, nextItem]);
  };

  const handleMoveItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= items.length || fromIdx === toIdx) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next.map((item, idx) => ({ ...item, orderIndex: idx }));
    });
  };

  const handleMarksChange = (itemId: string, val: number) => {
    const safeMarks = Number.isFinite(val) ? Math.max(0, val) : 0;
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, customMarks: safeMarks } : item))
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) =>
      prev
        .filter((item) => item.id !== itemId)
        .map((item, idx) => ({ ...item, orderIndex: idx }))
    );
  };

  const buildDraftObject = (): Omit<QuestionPaper, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & {
    id?: string;
  } => ({
    id: existingPaper?.id,
    title: title.trim() || 'শিরোনামহীন প্রশ্নপত্র',
    examName: examName.trim() || 'পরীক্ষা',
    classId,
    subjectId,
    schoolName: schoolName.trim() || 'মডেল স্কুল',
    schoolLogoDataUrl,
    examDate,
    durationMinutes: Number(durationMinutes) || 60,
    instructions: instructions.trim(),
    includeStudentFields,
    includeHeaderFooter,
    includePageNumbers,
    items,
  });

  const handleSavePaper = (andPreview = false) => {
    try {
      const saved = questionBankService.savePaper(user, buildDraftObject());
      bumpRevision();
      pushToast({
        title: existingPaper ? 'প্রশ্নপত্র হালনাগাদ হয়েছে' : 'প্রশ্নপত্র সংরক্ষিত হয়েছে',
        description: `"${saved.title}" স্থায়ী স্ন্যাপশটসহ সংরক্ষণ করা হয়েছে।`,
        variant: 'success',
      });
      if (andPreview) {
        navigate(`/dashboard/papers/${saved.id}/preview`);
      } else if (!existingPaper) {
        navigate(`/dashboard/papers/${saved.id}`);
      }
    } catch (err) {
      pushToast({
        title: 'প্রশ্নপত্র সংরক্ষণ করা যায়নি',
        description: err instanceof Error ? err.message : 'তথ্য যাচাইয়ে ত্রুটি হয়েছে।',
        variant: 'error',
      });
    }
  };

  const handleServerAutoGenerate = async () => {
    setGenError(null);
    setGenBusy(true);
    try {
      const generatedPaper = await questionBankService.generateCustomPaperAsync({
        title: title.trim() || `${getClassName(classId)} — ${getSubjectName(subjectId)}`,
        examName: examName.trim() || 'কাস্টম মূল্যায়ন পরীক্ষা',
        schoolName: schoolName.trim() || user.institution || 'মডেল একাডেমি',
        schoolLogoDataUrl,
        classId,
        subjectId,
        chapterIds: genChapters.length > 0 ? genChapters : undefined,
        difficulty: genDifficulty,
        durationMinutes: Number(durationMinutes) || 60,
        instructions: instructions.trim(),
        includeStudentFields,
        includeHeaderFooter,
        includePageNumbers,
        shuffle: genShuffle,
        requirements: [
          { questionTypeCode: 'mcq', count: Math.max(0, Number(genMcqCount) || 0) },
          { questionTypeCode: 'short', count: Math.max(0, Number(genShortCount) || 0) },
          { questionTypeCode: 'cq', count: Math.max(0, Number(genCqCount) || 0) },
          { questionTypeCode: 'math', count: Math.max(0, Number(genMathCount) || 0) },
        ],
      });
      bumpRevision();
      pushToast({
        title: 'স্বয়ংক্রিয় প্রশ্নপত্র তৈরি হয়েছে',
        description: `ডাটাবেজ থেকে ${toBanglaDigits(generatedPaper.items.length)}টি প্রশ্নসহ "${generatedPaper.title}" তৈরি হয়েছে।`,
        variant: 'success',
      });
      navigate(`/dashboard/papers/${generatedPaper.id}/preview`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'প্রশ্নপত্র তৈরি করা যায়নি।';
      setGenError(msg);
      pushToast({
        title: 'স্বয়ংক্রিয় প্রশ্নপত্র তৈরি হয়নি',
        description: msg,
        variant: 'error',
      });
    } finally {
      setGenBusy(false);
    }
  };

  const getClassName = (id: string) => catalogue.classes.find((c) => c.id === id)?.nameBn || id;
  const getSubjectName = (id: string) => catalogue.subjects.find((s) => s.id === id)?.nameBn || id;
  const getTypeName = (code: string) =>
    catalogue.questionTypes.find((qt) => qt.code === code)?.nameBn || code;

  const previewPaperModel: QuestionPaper = {
    ...buildDraftObject(),
    id: existingPaper?.id || 'preview-draft',
    userId: user.id,
    createdAt: existingPaper?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6 font-bangla">
      {/* হেডার বার */}
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold gold-text-gradient">
            {existingPaper ? 'প্রশ্নপত্র সম্পাদনা করুন' : 'প্রশ্নপত্র জেনারেটর'}
          </h1>
          <p className="mt-1 text-base text-[#B8C0CE] tabular-nums">
            {toBanglaDigits(items.length)}টি প্রশ্ন নির্বাচিত · মোট নম্বর:{' '}
            <span className="font-semibold text-[#EAC779]">{toBanglaDigits(totalMarks)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setShowLivePreview((v) => !v)}>
            <Eye className="h-4 w-4" />
            <span>{showLivePreview ? 'সম্পাদনায় ফিরুন' : 'লাইভ প্রিভিউ'}</span>
          </Button>
          <Button variant="outline" onClick={() => handleSavePaper(false)}>
            <Save className="h-4 w-4" />
            <span>{existingPaper ? 'হালনাগাদ করুন' : 'খসড়া সংরক্ষণ'}</span>
          </Button>
          <Button onClick={() => handleSavePaper(true)}>
            <Printer className="h-4 w-4" />
            <span>সংরক্ষণ ও এক্সপোর্ট</span>
          </Button>
        </div>
      </Card>

      {showLivePreview ? (
        <div className="rounded-xl border border-[#D4A853]/30 bg-[#0A0D12] p-4 sm:p-6">
          <PaperPreviewSheet
            paper={previewPaperModel}
            classNameLabel={getClassName(classId)}
            subjectNameLabel={getSubjectName(subjectId)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* বাম কলাম: পরীক্ষার তথ্য ও নির্বাচিত প্রশ্নের ক্রম */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-5 space-y-4">
              <h2 className="font-display text-base font-bold text-[#EAC779]">
                ১. পরীক্ষার প্রশ্নপত্রের বিবরণ
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="প্রশ্নপত্রের শিরোনাম" htmlFor="pb-title" required>
                  <Input id="pb-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </FormField>
                <FormField label="পরীক্ষার নাম" htmlFor="pb-exam" required>
                  <Input id="pb-exam" value={examName} onChange={(e) => setExamName(e.target.value)} />
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="শ্রেণি" htmlFor="pb-class" required>
                  <Select
                    id="pb-class"
                    value={classId}
                    onChange={(e) => {
                      const nextClass = e.target.value;
                      setClassId(nextClass);
                      const firstSubj = catalogue.subjects.find((s) => s.classId === nextClass);
                      setSubjectId(firstSubj?.id || '');
                      setPickerChapter('all');
                    }}
                  >
                    {catalogue.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameBn}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="বিষয়" htmlFor="pb-subject" required>
                  <Select
                    id="pb-subject"
                    value={subjectId}
                    onChange={(e) => {
                      setSubjectId(e.target.value);
                      setPickerChapter('all');
                    }}
                  >
                    {availableSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameBn}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="বিদ্যালয় / প্রতিষ্ঠানের নাম" htmlFor="pb-school" required>
                  <Input id="pb-school" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
                </FormField>
                <FormField label="পরীক্ষার তারিখ" htmlFor="pb-date">
                  <Input id="pb-date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
                </FormField>
                <FormField label="সময় (মিনিট)" htmlFor="pb-dur">
                  <Input
                    id="pb-dur"
                    type="number"
                    min={10}
                    max={300}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-start">
                <FormField label="প্রতিষ্ঠানের লোগো (ঐচ্ছিক)" htmlFor="pb-logo">
                  <input
                    id="pb-logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="block w-full text-sm text-[#B8C0CE] file:mr-3 file:rounded-lg file:border file:border-[#D4A853]/35 file:bg-[#12161F] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#EAC779]"
                  />
                </FormField>
                {schoolLogoDataUrl && (
                  <div className="flex items-center gap-3 pt-5">
                    <img src={schoolLogoDataUrl} alt="লোগো প্রিভিউ" className="h-10 w-10 object-contain rounded border border-[#D4A853]/30 bg-white p-0.5" />
                    <button
                      type="button"
                      onClick={() => setSchoolLogoDataUrl(undefined)}
                      className="text-sm text-rose-400 hover:underline cursor-pointer"
                    >
                      লোগো সরান
                    </button>
                  </div>
                )}
              </div>

              <FormField label="পরীক্ষার নির্দেশনা" htmlFor="pb-inst">
                <Textarea
                  id="pb-inst"
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </FormField>

              <div className="flex flex-wrap gap-5 pt-1 text-sm text-[#C2C8D3]">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeStudentFields}
                    onChange={(e) => setIncludeStudentFields(e.target.checked)}
                    className="accent-[#D4A853]"
                  />
                  <span>শিক্ষার্থীর নাম ও রোল ঘর যুক্ত করুন</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHeaderFooter}
                    onChange={(e) => setIncludeHeaderFooter(e.target.checked)}
                    className="accent-[#D4A853]"
                  />
                  <span>হেডার / ফুটার</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePageNumbers}
                    onChange={(e) => setIncludePageNumbers(e.target.checked)}
                    className="accent-[#D4A853]"
                  />
                  <span>পৃষ্ঠা নম্বর</span>
                </label>
              </div>
            </Card>

            {/* নির্বাচিত প্রশ্ন ও ক্রম পুনর্বিন্যাস */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-[#F5EFE2]">
                  ২. নির্বাচিত প্রশ্নসমূহ ({toBanglaDigits(items.length)})
                </h2>
                <span className="text-sm font-semibold text-[#EAC779] tabular-nums">
                  মোট: {toBanglaDigits(totalMarks)} নম্বর
                </span>
              </div>

              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#D4A853]/30 p-8 text-center text-base text-[#8C95A4]">
                  আপনার প্রশ্নপত্র তৈরি করতে ডান পাশের প্রশ্নব্যাংক তালিকা থেকে প্রশ্ন যুক্ত করুন।
                </div>
              ) : (
                <div className="space-y-2.5">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => setDraggedIndex(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedIndex !== null) {
                          handleMoveItem(draggedIndex, idx);
                          setDraggedIndex(null);
                        }
                      }}
                      className="flex items-start gap-3 rounded-lg border border-[#D4A853]/25 bg-[#0A0D12] p-3"
                    >
                      <span
                        title="ক্রম পরিবর্তন করতে টেনে নিন"
                        className="mt-1 cursor-grab text-[#8C95A4] hover:text-[#EAC779]"
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[#D4A853]">
                          প্রশ্ন {toBanglaDigits(idx + 1)} · {getTypeName(item.snapshot.questionTypeCode)}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-base text-[#F5EFE2]">
                          {item.snapshot.prompt}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <label htmlFor={`marks-${item.id}`} className="sr-only">
                          প্রশ্ন {toBanglaDigits(idx + 1)}-এর নম্বর
                        </label>
                        <input
                          id={`marks-${item.id}`}
                          type="number"
                          min={0}
                          max={100}
                          value={item.customMarks}
                          onChange={(e) => handleMarksChange(item.id, Number(e.target.value))}
                          className="w-16 rounded border border-[#D4A853]/30 bg-[#12161F] px-2 py-1 text-right font-mono text-sm text-[#F5EFE2] tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => handleMoveItem(idx, idx - 1)}
                          disabled={idx === 0}
                          aria-label={`প্রশ্ন ${toBanglaDigits(idx + 1)} উপরে নিন`}
                          className="rounded border border-[#D4A853]/25 bg-[#12161F] p-1.5 text-[#C2C8D3] hover:border-[#EAC779] disabled:opacity-40 cursor-pointer"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveItem(idx, idx + 1)}
                          disabled={idx === items.length - 1}
                          aria-label={`প্রশ্ন ${toBanglaDigits(idx + 1)} নিচে নিন`}
                          className="rounded border border-[#D4A853]/25 bg-[#12161F] p-1.5 text-[#C2C8D3] hover:border-[#EAC779] disabled:opacity-40 cursor-pointer"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          aria-label={`প্রশ্ন ${toBanglaDigits(idx + 1)} সরান`}
                          className="rounded border border-rose-500/35 bg-rose-950/40 p-1.5 text-rose-300 hover:bg-rose-900/60 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ডান কলাম: প্রশ্নব্যাংক পিকার */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 space-y-4">
              <div>
                <h2 className="font-display text-base font-bold text-[#EAC779]">
                  ৩. প্রশ্নব্যাংক থেকে প্রশ্ন যুক্ত করুন
                </h2>
                <p className="mt-0.5 text-sm text-[#9DA6B5]">
                  ফিল্টারকৃত: {getClassName(classId)} · {getSubjectName(subjectId)}
                </p>
              </div>

              {!canAddQuestionsForClass ? (
                <div className="rounded-lg border border-[#D4A853]/40 bg-[#2A200E]/50 p-4 text-sm text-[#F2D184] space-y-2">
                  <p className="font-semibold">শ্রেণির সাবস্ক্রিপশন প্রয়োজন</p>
                  <p className="text-[#E5E0D5]">
                    {getClassName(classId)}-এর জন্য আপনার কোনো সক্রিয় সাবস্ক্রিপশন নেই। মেয়াদোত্তীর্ণ বা সাবস্ক্রিপশনবিহীন অবস্থায় প্রশ্নব্যাংক থেকে নতুন প্রশ্ন যুক্ত করা যাবে না; তবে পূর্বের প্রশ্নপত্র সম্পাদনা ও এক্সপোর্ট করা যাবে।
                  </p>
                  <Link
                    to="/dashboard/payments/new"
                    className="inline-block font-semibold text-[#EAC779] hover:underline"
                  >
                    সাবস্ক্রাইব বা নবায়ন করুন →
                  </Link>
                </div>
              ) : (
                <>
                  {/* সার্ভার-নিয়ন্ত্রিত কাস্টম অটো-জেনারেটর */}
                  <div className="rounded-lg border border-[#D4A853]/30 bg-[#0A0D12] p-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#EAC779]">
                        <Sparkles className="h-4 w-4" />
                        <span>স্বয়ংক্রিয় কাস্টম জেনারেটর (ডাটাবেজ)</span>
                      </p>
                      <label className="inline-flex items-center gap-1.5 text-xs text-[#C2C8D3] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={genShuffle}
                          onChange={(e) => setGenShuffle(e.target.checked)}
                          className="accent-[#D4A853]"
                        />
                        <span>এলোমেলো ক্রম</span>
                      </label>
                    </div>

                    {availableChapters.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs text-[#9DA6B5]">
                          অধ্যায় বাছাই (খালি রাখলে সব অধ্যায়):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {availableChapters.map((c) => {
                            const selected = genChapters.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() =>
                                  setGenChapters((prev) =>
                                    selected ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                                  )
                                }
                                className={`rounded border px-2 py-1 text-xs cursor-pointer transition-colors ${
                                  selected
                                    ? 'border-[#EAC779] bg-[#D4A853]/20 text-[#EAC779] font-semibold'
                                    : 'border-[#D4A853]/20 bg-[#12161F] text-[#B8C0CE] hover:border-[#D4A853]/50'
                                }`}
                              >
                                অধ্যায় {toBanglaDigits(c.chapterNumber)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div>
                        <label htmlFor="gen-mcq" className="block text-[11px] text-[#9DA6B5]">MCQ</label>
                        <Input
                          id="gen-mcq"
                          type="number"
                          min={0}
                          max={100}
                          value={genMcqCount}
                          onChange={(e) => setGenMcqCount(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label htmlFor="gen-short" className="block text-[11px] text-[#9DA6B5]">সংক্ষিপ্ত</label>
                        <Input
                          id="gen-short"
                          type="number"
                          min={0}
                          max={50}
                          value={genShortCount}
                          onChange={(e) => setGenShortCount(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label htmlFor="gen-cq" className="block text-[11px] text-[#9DA6B5]">সৃজনশীল</label>
                        <Input
                          id="gen-cq"
                          type="number"
                          min={0}
                          max={30}
                          value={genCqCount}
                          onChange={(e) => setGenCqCount(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label htmlFor="gen-math" className="block text-[11px] text-[#9DA6B5]">গণিত</label>
                        <Input
                          id="gen-math"
                          type="number"
                          min={0}
                          max={30}
                          value={genMathCount}
                          onChange={(e) => setGenMathCount(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Select
                        aria-label="জটিলতার স্তর"
                        value={genDifficulty}
                        onChange={(e) => setGenDifficulty(e.target.value as typeof genDifficulty)}
                        className="sm:w-36"
                      >
                        <option value="all">সকল স্তর</option>
                        <option value="easy">সহজ</option>
                        <option value="medium">মধ্যম</option>
                        <option value="hard">কঠিন</option>
                      </Select>
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={genBusy}
                        onClick={handleServerAutoGenerate}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{genBusy ? 'তৈরি হচ্ছে...' : 'সার্ভার থেকে তৈরি করুন'}</span>
                      </Button>
                    </div>

                    {genError && (
                      <div
                        role="alert"
                        className="rounded border border-rose-500/40 bg-rose-950/60 px-2.5 py-2 text-xs text-rose-200"
                      >
                        {genError}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <Input
                      aria-label="প্রশ্ন অনুসন্ধান"
                      placeholder="প্রশ্ন খুঁজুন..."
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        aria-label="অধ্যায় অনুযায়ী ফিল্টার"
                        value={pickerChapter}
                        onChange={(e) => setPickerChapter(e.target.value)}
                      >
                        <option value="all">সকল অধ্যায়</option>
                        {availableChapters.map((c) => (
                          <option key={c.id} value={c.id}>
                            অধ্যায় {toBanglaDigits(c.chapterNumber)}: {c.nameBn}
                          </option>
                        ))}
                      </Select>
                      <Select
                        aria-label="ধরন অনুযায়ী ফিল্টার"
                        value={pickerType}
                        onChange={(e) => setPickerType(e.target.value)}
                      >
                        <option value="all">সকল ধরন</option>
                        {catalogue.questionTypes.map((qt) => (
                          <option key={qt.id} value={qt.code}>
                            {qt.nameBn}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="max-h-[540px] overflow-y-auto space-y-2.5 pr-1">
                    {accessibleQuestions.length === 0 ? (
                      <p className="py-8 text-center text-sm text-[#8C95A4]">
                        এই শ্রেণি ও বিষয়ের জন্য কোনো প্রকাশিত প্রশ্ন পাওয়া যায়নি।
                      </p>
                    ) : (
                      accessibleQuestions.map((q) => {
                        const alreadyAdded = items.some((i) => i.sourceQuestionId === q.id);
                        return (
                          <div
                            key={q.id}
                            className="rounded-lg border border-[#D4A853]/20 bg-[#0A0D12] p-3 space-y-2 hover:border-[#EAC779]/60"
                          >
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-[#EAC779]">
                                {getTypeName(q.questionTypeCode)} · {getDifficultyLabelBn(q.difficulty)}
                              </span>
                              <span className="font-mono font-semibold text-[#F5EFE2] tabular-nums">
                                {toBanglaDigits(q.marks)} নম্বর
                              </span>
                            </div>
                            <p className="line-clamp-2 text-sm text-[#E5E0D5] leading-relaxed">
                              {q.prompt}
                            </p>
                            <Button
                              size="sm"
                              variant={alreadyAdded ? 'outline' : 'secondary'}
                              className="w-full"
                              onClick={() => handleAddQuestion(q)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>{alreadyAdded ? 'আরেকটি কপি যোগ করুন' : 'প্রশ্নপত্রে যোগ করুন'}</span>
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export function PaperPreviewPage() {
  const { user, bumpRevision } = useAuth();
  const { pushToast } = useToast();
  const { paperId } = useParams<{ paperId: string }>();
  const [includeAnswerKey, setIncludeAnswerKey] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  const catalogue = questionBankService.getAcademicCatalogue();

  if (!user || !paperId) return null;

  let paper: QuestionPaper;
  try {
    paper = questionBankService.getPaperById(paperId, user);
  } catch (err) {
    return (
      <EmptyState
        title="প্রশ্নপত্র পাওয়া যায়নি"
        description={err instanceof Error ? err.message : 'প্রশ্নপত্রটি লোড করা যায়নি।'}
        action={
          <Link to="/dashboard/papers" className="text-base font-medium text-[#EAC779] hover:underline">
            আমার প্রশ্নপত্রে ফিরে যান
          </Link>
        }
      />
    );
  }

  const classNameLabel = catalogue.classes.find((c) => c.id === paper.classId)?.nameBn || paper.classId;
  const subjectNameLabel =
    catalogue.subjects.find((s) => s.id === paper.subjectId)?.nameBn || paper.subjectId;

  const handlePrintPdf = () => {
    questionBankService.recordExport(user, paper, 'pdf', includeAnswerKey);
    bumpRevision();
    window.print();
  };

  const handleExportDocx = async () => {
    setExportingDocx(true);
    try {
      const blob = await generatePaperDocxBlob(
        paper,
        classNameLabel,
        subjectNameLabel,
        includeAnswerKey
      );
      const safeFile = paper.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'question-paper';
      triggerBlobDownload(blob, `${safeFile}.docx`);
      questionBankService.recordExport(user, paper, 'docx', includeAnswerKey);
      bumpRevision();
      pushToast({
        title: 'ওয়ার্ড ডকুমেন্ট ডাউনলোড হয়েছে',
        description: `প্রশ্নপত্র স্ন্যাপশট থেকে ${safeFile}.docx তৈরি করা হয়েছে।`,
        variant: 'success',
      });
    } catch {
      pushToast({
        title: 'এক্সপোর্ট ব্যর্থ হয়েছে',
        description: 'ওয়ার্ড ডকুমেন্ট তৈরি করা সম্ভব হয়নি।',
        variant: 'error',
      });
    } finally {
      setExportingDocx(false);
    }
  };

  return (
    <div className="space-y-6 font-bangla">
      <Card className="no-print flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/dashboard/papers" className="text-base font-medium text-[#EAC779] hover:underline">
            ← প্রশ্নপত্রে ফিরে যান
          </Link>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-[#E5E0D5] cursor-pointer">
            <input
              type="checkbox"
              checked={includeAnswerKey}
              onChange={(e) => setIncludeAnswerKey(e.target.checked)}
              className="accent-[#D4A853]"
            />
            <span>উত্তরপত্র সংযুক্ত করুন</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={`/dashboard/papers/${paper.id}`}
            className="rounded-lg gold-outline-btn px-3.5 py-2 text-sm font-semibold"
          >
            প্রশ্নপত্র সম্পাদনা
          </Link>
          <Button variant="outline" size="sm" onClick={handlePrintPdf}>
            <Printer className="h-4 w-4" />
            <span>প্রিন্ট / পিডিএফ সংরক্ষণ</span>
          </Button>
          <Button size="sm" onClick={handleExportDocx} disabled={exportingDocx}>
            <Download className="h-4 w-4" />
            <span>{exportingDocx ? 'তৈরি হচ্ছে...' : 'ওয়ার্ড (.docx) এক্সপোর্ট'}</span>
          </Button>
        </div>
      </Card>

      <div className="rounded-xl border border-[#D4A853]/30 bg-[#0A0D12] p-3 sm:p-6">
        <PaperPreviewSheet
          paper={paper}
          classNameLabel={classNameLabel}
          subjectNameLabel={subjectNameLabel}
          showAnswerKey={includeAnswerKey}
        />
      </div>
    </div>
  );
}
