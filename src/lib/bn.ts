import type { PaymentStatus, QuestionDifficulty, QuestionStatus } from '../types/domain';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBanglaDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

export function formatBnNumber(value: number): string {
  return toBanglaDigits(value.toLocaleString('en-US'));
}

export function formatBnDate(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return String(isoOrDate);
  return toBanglaDigits(date.toLocaleDateString('en-GB'));
}

export function formatBnDateTime(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return String(isoOrDate);
  const d = date.toLocaleDateString('en-GB');
  const t = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return toBanglaDigits(`${d}, ${t}`);
}

export function getPaymentStatusLabelBn(status: PaymentStatus): string {
  switch (status) {
    case 'approved':
      return 'অনুমোদিত';
    case 'pending':
      return 'অপেক্ষমাণ';
    case 'rejected':
      return 'বাতিলকৃত';
  }
}

export function getQuestionStatusLabelBn(status: QuestionStatus): string {
  switch (status) {
    case 'published':
      return 'প্রকাশিত';
    case 'draft':
      return 'খসড়া';
    case 'archived':
      return 'সংরক্ষিত (আর্কাইভ)';
  }
}

export function getDifficultyLabelBn(diff: QuestionDifficulty): string {
  switch (diff) {
    case 'easy':
      return 'সহজ';
    case 'medium':
      return 'মধ্যম';
    case 'hard':
      return 'কঠিন';
  }
}

export function getRoleLabelBn(role: 'student' | 'admin'): string {
  return role === 'admin' ? 'অ্যাডমিন' : 'শিক্ষার্থী';
}

export const EDUCATION_BOARD_LABELS_BN: Record<string, { bn: string; en: string }> = {
  dhaka: { bn: 'ঢাকা বোর্ড', en: 'Dhaka Board' },
  chattogram: { bn: 'চট্টগ্রাম বোর্ড', en: 'Chattogram Board' },
  cumilla: { bn: 'কুমিল্লা বোর্ড', en: 'Cumilla Board' },
  rajshahi: { bn: 'রাজশাহী বোর্ড', en: 'Rajshahi Board' },
  jashore: { bn: 'যশোর বোর্ড', en: 'Jashore Board' },
  barishal: { bn: 'বরিশাল বোর্ড', en: 'Barishal Board' },
  sylhet: { bn: 'সিলেট বোর্ড', en: 'Sylhet Board' },
  dinajpur: { bn: 'দিনাজপুর বোর্ড', en: 'Dinajpur Board' },
  mymensingh: { bn: 'ময়মনসিংহ বোর্ড', en: 'Mymensingh Board' },
};

export const QUESTION_TYPE_LABELS_BN: Record<string, string> = {
  mcq: 'বহুনির্বাচনী (MCQ)',
  short: 'সংক্ষিপ্ত প্রশ্ন',
  cq: 'সৃজনশীল (CQ)',
  broad: 'রচনামূলক / বড় প্রশ্ন',
  fill_blank: 'শূন্যস্থান পূরণ',
  true_false: 'সত্য / মিথ্যা',
  matching: 'মিলকরণ (Matching)',
  math: 'গাণিতিক সমস্যা',
  image_based: 'চিত্রভিত্তিক প্রশ্ন',
};

export const BREADCRUMB_LABELS_BN: Record<string, string> = {
  classes: 'আমার শ্রেণিসমূহ',
  questions: 'প্রশ্নব্যাংক',
  favorites: 'পছন্দসই প্রশ্ন',
  saved: 'সংরক্ষিত প্রশ্ন',
  papers: 'আমার প্রশ্নপত্র',
  new: 'নতুন তৈরি',
  preview: 'প্রিভিউ ও এক্সপোর্ট',
  editor: 'প্রশ্নপত্র এডিটর',
  subscription: 'সাবস্ক্রিপশন',
  payments: 'পেমেন্ট ইতিহাস',
  downloads: 'ডাউনলোড',
  profile: 'প্রোফাইল সেটিংস',
  academic: 'একাডেমিক কাঠামো',
  admission: 'ভর্তি পরীক্ষা ব্যবস্থাপনা',
  learning: 'লার্নিং হাব ব্যবস্থাপনা',
  'kids-games': 'কিডস গেম ব্যবস্থাপনা',
  plans: 'সাবস্ক্রিপশন প্ল্যান',
  subscribers: 'সাবস্ক্রাইবার তালিকা',
  users: 'ব্যবহারকারী ও ভূমিকা',
  website: 'ওয়েবসাইট কনটেন্ট',
  logs: 'কার্যক্রম লগ',
  settings: 'সিস্টেম সেটিংস',
  edit: 'সম্পাদনা',
};

export const PLAN_TRANSLATIONS_BN: Record<
  string,
  { audience: string; desc: string; features: string[] }
> = {
  'plan-c6-monthly': {
    audience: 'একক শ্রেণির শিক্ষার্থীদের জন্য',
    desc: 'ষষ্ঠ শ্রেণির সকল প্রকাশিত বিষয়, অধ্যায়, ব্যাখ্যা ও প্রশ্নপত্র এক্সপোর্টের পূর্ণ সুবিধা।',
    features: [
      'ষষ্ঠ শ্রেণির সকল বিষয় ও অধ্যায়',
      'বাংলা ও ইংরেজিতে বিস্তারিত উত্তর ও ব্যাখ্যা',
      'সীমাহীন কাস্টম প্রশ্নপত্র তৈরি ও এক্সপোর্ট',
    ],
  },
  'plan-c6-yearly': {
    audience: 'সম্পূর্ণ শিক্ষাবর্ষের জন্য',
    desc: 'সারা বছর জুড়ে ষষ্ঠ শ্রেণির প্রশ্নব্যাংক, সৃজনশীল প্রশ্ন ও পরীক্ষার টেমপ্লেট ব্যবহারের সুবিধা।',
    features: [
      'ষষ্ঠ শ্রেণির জন্য ৩৬৫ দিনের নিরবচ্ছিন্ন এক্সেস',
      'সব ধরনের প্রশ্ন (এমসিকিউ, সৃজনশীল, গণিত ও চিত্র)',
      'সংরক্ষিত প্রশ্নপত্র ও উত্তরপত্র এক্সপোর্ট',
    ],
  },
  'plan-junior-bundle': {
    audience: 'একাধিক শ্রেণির প্রস্তুতির জন্য',
    desc: 'ষষ্ঠ, সপ্তম ও অষ্টম শ্রেণির সমন্বিত প্রশ্নব্যাংক ও কাস্টম প্রশ্নপত্র তৈরির সম্পূর্ণ সমাধান।',
    features: [
      'ষষ্ঠ, সপ্তম ও অষ্টম শ্রেণির পূর্ণ এক্সেস',
      'একাধিক অধ্যায় মিলিয়ে প্রশ্নপত্র সাজানো',
      'পছন্দসই ও সংরক্ষিত প্রশ্নের ব্যক্তিগত লাইব্রেরি',
    ],
  },
  'plan-ssc-yearly': {
    audience: 'বোর্ড পরীক্ষার্থীদের জন্য',
    desc: 'নবম ও দশম শ্রেণির বিজ্ঞান, ব্যবসায় শিক্ষা ও মানবিক বিভাগের পূর্ণাঙ্গ প্রশ্ন সংগ্রহশালা।',
    features: [
      'নবম–দশম শ্রেণির পদার্থবিজ্ঞান, রসায়ন ও সকল বিভাগ',
      'চিত্র ও সমীকরণসহ প্রিন্ট-উপযোগী প্রিভিউ',
      '৩৬৫ দিন প্রশ্নব্যাংক ব্যবহারের সুবিধা',
    ],
  },
};

export const NOTICE_TRANSLATIONS_BN: Record<string, { title: string; body: string }> = {
  'not-1': {
    title: '২০২৬ অর্ধবার্ষিক সিলেবাসের অধ্যায়সমূহ হালনাগাদ হয়েছে',
    body: 'ষষ্ঠ ও অষ্টম শ্রেণির গণিত বিষয়ে নতুন সৃজনশীল প্রশ্ন এবং জ্যামিতিক চিত্রভিত্তিক প্রশ্ন যুক্ত করা হয়েছে।',
  },
  'not-2': {
    title: 'ম্যানুয়াল পেমেন্ট যাচাই প্রক্রিয়া',
    body: 'এই প্রোটোটাইপে ম্যানুয়াল পেমেন্ট অনুমোদন প্রক্রিয়া তাৎক্ষণিকভাবে অ্যাডমিন ড্যাশবোর্ড থেকে পরীক্ষা করা যাবে।',
  },
};

export const FAQ_TRANSLATIONS_BN: Record<
  string,
  { category: string; question: string; answer: string }
> = {
  'faq-1': {
    category: 'সাবস্ক্রিপশন',
    question: 'শ্রেণি-ভিত্তিক সাবস্ক্রিপশন কীভাবে কাজ করে?',
    answer:
      'আপনি এক বা একাধিক নির্দিষ্ট শ্রেণির (যেমন: শুধুমাত্র ষষ্ঠ শ্রেণি অথবা ষষ্ঠ–অষ্টম বান্ডেল) প্যাকেজ নিতে পারবেন। সক্রিয় সাবস্ক্রিপশনে অন্তর্ভুক্ত শ্রেণিগুলোর প্রশ্ন, উত্তর এবং প্রশ্নপত্র তৈরির সুবিধা পাবেন।',
  },
  'faq-2': {
    category: 'নবায়ন নীতিমালা',
    question: 'মেয়াদ শেষ হওয়ার আগে নবায়ন করলে পূর্বের দিন কি যোগ হবে?',
    answer:
      'না। অ্যাডমিন আপনার নতুন পেমেন্ট অনুমোদন করার মুহূর্ত থেকেই নতুন মেয়াদ শুরু হবে। আগের সাবস্ক্রিপশনের অবশিষ্ট দিন নতুন মেয়াদের সাথে যোগ হবে না—পেমেন্ট জমা দেওয়ার আগেই এই নিয়মটি নিশ্চিত করা হয়।',
  },
  'faq-3': {
    category: 'প্রশ্নপত্র',
    question: 'সাবস্ক্রিপশনের মেয়াদ শেষ হলে সংরক্ষিত প্রশ্নপত্র কি হারিয়ে যাবে?',
    answer:
      'না। প্রতিটি সংরক্ষিত প্রশ্নপত্র তৈরির সময়ের মূল প্রশ্নের স্থায়ী স্ন্যাপশট সংরক্ষণ করে। মেয়াদ শেষ হলেও আপনি পূর্বে তৈরি করা প্রশ্নপত্র দেখতে ও পিডিএফ বা ওয়ার্ড আকারে ডাউনলোড করতে পারবেন; তবে নতুন প্রশ্ন ব্রাউজ বা যুক্ত করতে হলে নবায়ন করতে হবে।',
  },
  'faq-4': {
    category: 'পেমেন্ট',
    question: 'ম্যানুয়াল পেমেন্ট যাচাই কীভাবে সম্পন্ন হয়?',
    answer:
      'পছন্দের প্ল্যান নির্বাচন করে নির্ধারিত বিকাশ, নগদ বা ব্যাংক নম্বরে পেমেন্ট সম্পন্ন করুন এবং প্রেরকের নম্বর ও ট্রানজেকশন আইডি জমা দিন। অ্যাডমিন যাচাই করে অনুমোদন করার সাথে সাথে আপনার এক্সেস চালু হয়ে যাবে।',
  },
};
