import type {
  CreativeSubPart,
  QuestionDifficulty,
  QuestionOption,
  QuestionStatus,
  QuestionTypeCode,
} from '../types/domain';

export const BENGALI_OPTION_LABELS = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'];
export const ENGLISH_OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const MATH_SYMBOL_BUTTONS: Array<{ label: string; snippet: string; title: string }> = [
  { label: '×', snippet: ' × ', title: 'গুণ চিহ্ন' },
  { label: '÷', snippet: ' ÷ ', title: 'ভাগ চিহ্ন' },
  { label: '±', snippet: ' ± ', title: 'প্লাস-মাইনাস' },
  { label: '√', snippet: '√()', title: 'বর্গমূল' },
  { label: 'x²', snippet: '^2', title: 'বর্গ (Square)' },
  { label: 'xⁿ', snippet: '^n', title: 'ঘাত (Power)' },
  { label: 'a/b', snippet: '\\frac{a}{b}', title: 'ভগ্নাংশ' },
  { label: 'π', snippet: 'π', title: 'পাই (Pi)' },
  { label: 'θ', snippet: 'θ', title: 'থিটা (Theta)' },
  { label: '°', snippet: '°', title: 'ডিগ্রি' },
  { label: '∠', snippet: '∠', title: 'কোণ চিহ্ন' },
  { label: '△', snippet: '△', title: 'ত্রিভুজ চিহ্ন' },
  { label: '≤', snippet: ' ≤ ', title: 'ক্ষুদ্রতর বা সমান' },
  { label: '≥', snippet: ' ≥ ', title: 'বৃহত্তর বা সমান' },
  { label: '≠', snippet: ' ≠ ', title: 'সমান নয়' },
  { label: '∑', snippet: '∑', title: 'সমষ্টি (Sigma)' },
];

export const QUESTION_TYPE_META: Record<
  QuestionTypeCode,
  {
    shortLabelBn: string;
    helperTextBn: string;
    marksPresets: number[];
  }
> = {
  mcq: {
    shortLabelBn: 'বহুনির্বাচনি (MCQ)',
    helperTextBn: '২ থেকে ৬টি বিকল্প যুক্ত করুন এবং সঠিক উত্তর চিহ্নিত করুন।',
    marksPresets: [1, 2],
  },
  cq: {
    shortLabelBn: 'সৃজনশীল (CQ)',
    helperTextBn: 'উদ্দীপকসহ ক, খ, গ, ঘ অংশ ও প্রতিটি অংশের নম্বর যুক্ত করুন।',
    marksPresets: [10, 8],
  },
  short: {
    shortLabelBn: 'সংক্ষিপ্ত প্রশ্ন',
    helperTextBn: 'সংক্ষিপ্ত প্রশ্ন, আদর্শ উত্তর এবং মূল্যায়ন নির্দেশনা লিখুন।',
    marksPresets: [2, 3, 5],
  },
  fill_blank: {
    shortLabelBn: 'শূন্যস্থান পূরণ',
    helperTextBn: 'প্রশ্নের উপযুক্ত স্থানে ________ ব্যবহার করে সঠিক শব্দটি লিখুন।',
    marksPresets: [1, 2],
  },
  true_false: {
    shortLabelBn: 'সত্য / মিথ্যা',
    helperTextBn: 'বিবৃতি লিখুন এবং সঠিক উত্তর সত্য নাকি মিথ্যা তা নির্বাচন করুন।',
    marksPresets: [1],
  },
  math: {
    shortLabelBn: 'গাণিতিক সমস্যা',
    helperTextBn: 'গাণিতিক প্রতীক প্যালেট ব্যবহার করে সমীকরণ ও সমাধান ধাপ যুক্ত করুন।',
    marksPresets: [2, 4, 5],
  },
  image_based: {
    shortLabelBn: 'চিত্রভিত্তিক প্রশ্ন',
    helperTextBn: 'চিত্র আপলোড করুন বা বিল্ট-ইন ডায়াগ্রাম বেছে নিয়ে প্রশ্ন তৈরি করুন।',
    marksPresets: [2, 4, 5],
  },
  broad: {
    shortLabelBn: 'রচনামূলক / বর্ণনামূলক',
    helperTextBn: 'বিস্তারিত বর্ণনামূলক বা রচনামূলক প্রশ্ন ও মূল্যায়ন নির্দেশনা লিখুন।',
    marksPresets: [5, 8, 10],
  },
  matching: {
    shortLabelBn: 'মিলকরণ (Matching)',
    helperTextBn: 'বাম ও ডান কলামের উপাদান এবং সঠিক মিলকরণ উত্তর যুক্ত করুন।',
    marksPresets: [4, 5],
  },
};

export function createDefaultMcqOptions(style: 'bn' | 'en' = 'bn'): QuestionOption[] {
  const labels = style === 'en' ? ENGLISH_OPTION_LABELS : BENGALI_OPTION_LABELS;
  return [0, 1, 2, 3].map((idx) => ({
    id: `opt-${idx + 1}`,
    label: labels[idx],
    text: '',
    isCorrect: idx === 0,
  }));
}

export function relabelMcqOptions(options: QuestionOption[], style: 'bn' | 'en'): QuestionOption[] {
  const labels = style === 'en' ? ENGLISH_OPTION_LABELS : BENGALI_OPTION_LABELS;
  return options.map((opt, idx) => ({
    ...opt,
    label: labels[idx] || String(idx + 1),
  }));
}

export function appendMcqOption(options: QuestionOption[], style: 'bn' | 'en'): QuestionOption[] {
  if (options.length >= 6) return options;
  const labels = style === 'en' ? ENGLISH_OPTION_LABELS : BENGALI_OPTION_LABELS;
  const idx = options.length;
  return [
    ...options,
    {
      id: `opt-${Date.now()}-${idx + 1}`,
      label: labels[idx] || String(idx + 1),
      text: '',
      isCorrect: false,
    },
  ];
}

export function removeMcqOption(options: QuestionOption[], indexToRemove: number): QuestionOption[] {
  if (options.length <= 2) return options;
  const next = options.filter((_, idx) => idx !== indexToRemove);
  if (!next.some((o) => o.isCorrect) && next.length > 0) {
    next[0] = { ...next[0], isCorrect: true };
  }
  return next;
}

export function createDefaultCqSubParts(): CreativeSubPart[] {
  return [
    { id: 'sp-a', label: 'ক', prompt: '', marks: 1, answer: '' },
    { id: 'sp-b', label: 'খ', prompt: '', marks: 2, answer: '' },
    { id: 'sp-c', label: 'গ', prompt: '', marks: 3, answer: '' },
    { id: 'sp-d', label: 'ঘ', prompt: '', marks: 4, answer: '' },
  ];
}

export function appendCqSubPart(subParts: CreativeSubPart[]): CreativeSubPart[] {
  if (subParts.length >= 6) return subParts;
  const idx = subParts.length;
  return [
    ...subParts,
    {
      id: `sp-${Date.now()}-${idx + 1}`,
      label: BENGALI_OPTION_LABELS[idx] || String(idx + 1),
      prompt: '',
      marks: 2,
      answer: '',
    },
  ];
}

export function removeCqSubPart(subParts: CreativeSubPart[], indexToRemove: number): CreativeSubPart[] {
  if (subParts.length <= 1) return subParts;
  return subParts.filter((_, idx) => idx !== indexToRemove);
}

export function calculateCqTotalMarks(subParts: CreativeSubPart[]): number {
  return subParts.reduce((sum, part) => sum + (Number.isFinite(part.marks) ? Math.max(0, part.marks) : 0), 0);
}

export function insertTextSnippet(
  current: string,
  snippet: string,
  selectionStart?: number | null,
  selectionEnd?: number | null
): string {
  const start = typeof selectionStart === 'number' ? selectionStart : current.length;
  const end = typeof selectionEnd === 'number' ? selectionEnd : start;
  return current.slice(0, start) + snippet + current.slice(end);
}

export interface QuestionDraftInput {
  classId: string;
  subjectId: string;
  chapterId: string;
  questionTypeCode: QuestionTypeCode;
  language: 'en' | 'bn';
  difficulty: QuestionDifficulty;
  marks: number;
  status: QuestionStatus;
  prompt: string;
  stimulus: string;
  equationLatex: string;
  imageUrl: string;
  correctAnswerText: string;
  options: QuestionOption[];
  subParts: CreativeSubPart[];
}

export function validateQuestionDraftByType(draft: QuestionDraftInput): string | null {
  if (!draft.classId || !draft.subjectId || !draft.chapterId) {
    return 'শ্রেণি, বিষয় এবং অধ্যায় নির্বাচন করুন।';
  }
  if (!draft.prompt.trim()) {
    return 'প্রশ্নের মূল লেখা প্রদান করা আবশ্যক।';
  }
  if (!Number.isFinite(draft.marks) || draft.marks < 1) {
    return 'প্রশ্নের নম্বর কমপক্ষে ১ হতে হবে।';
  }

  switch (draft.questionTypeCode) {
    case 'mcq': {
      if (draft.options.length < 2) {
        return 'বহুনির্বাচনি প্রশ্নে কমপক্ষে ২টি বিকল্প থাকতে হবে।';
      }
      if (draft.options.some((o) => !o.text.trim())) {
        return 'বহুনির্বাচনির প্রতিটি বিকল্পের লেখা পূরণ করুন।';
      }
      if (!draft.options.some((o) => o.isCorrect)) {
        return 'সঠিক বহুনির্বাচনি বিকল্প নির্বাচন করুন।';
      }
      return null;
    }
    case 'cq': {
      if (!draft.stimulus.trim()) {
        return 'সৃজনশীল প্রশ্নের জন্য উদ্দীপক প্রদান করুন।';
      }
      if (draft.subParts.length === 0 || draft.subParts.some((sp) => !sp.prompt.trim())) {
        return 'সৃজনশীল প্রশ্নের প্রতিটি অংশের প্রশ্ন পূরণ করুন।';
      }
      return null;
    }
    case 'fill_blank': {
      if (!draft.correctAnswerText.trim()) {
        return 'শূন্যস্থান পূরণের সঠিক উত্তর লিখুন।';
      }
      return null;
    }
    case 'true_false': {
      if (!draft.correctAnswerText.trim()) {
        return 'সত্য বা মিথ্যা উত্তর নির্বাচন করুন।';
      }
      return null;
    }
    case 'math': {
      if (!draft.equationLatex.trim() && !draft.correctAnswerText.trim()) {
        return 'গাণিতিক প্রশ্নের জন্য সমীকরণ অথবা সঠিক উত্তর প্রদান করুন।';
      }
      return null;
    }
    case 'image_based': {
      if (!draft.imageUrl.trim()) {
        return 'চিত্রভিত্তিক প্রশ্নের জন্য একটি চিত্র নির্বাচন বা আপলোড করুন।';
      }
      return null;
    }
    case 'short':
    default:
      return null;
  }
}

export function parseQuestionTypeParam(
  param: string | null,
  validCodes: QuestionTypeCode[]
): QuestionTypeCode | null {
  if (!param) return null;
  return validCodes.includes(param as QuestionTypeCode) ? (param as QuestionTypeCode) : null;
}
