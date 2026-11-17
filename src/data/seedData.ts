import type {
  AcademicClass,
  AcademicGroup,
  ActivityLog,
  Chapter,
  ContactMessage,
  ExportRecord,
  FaqItem,
  Notice,
  Payment,
  PaymentMethod,
  Plan,
  Question,
  QuestionPaper,
  QuestionType,
  SiteSettings,
  Subject,
  Subscription,
  Topic,
  UserProfile,
} from '../types/domain';

export interface AppDatabaseState {
  users: UserProfile[];
  passwordsByUserId: Record<string, string>;
  classes: AcademicClass[];
  groups: AcademicGroup[];
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  questionTypes: QuestionType[];
  questions: Question[];
  plans: Plan[];
  paymentMethods: PaymentMethod[];
  payments: Payment[];
  subscriptions: Subscription[];
  favoritesByUserId: Record<string, string[]>;
  savedByUserId: Record<string, string[]>;
  papers: QuestionPaper[];
  exports: ExportRecord[];
  notices: Notice[];
  faqs: FaqItem[];
  contactMessages: ContactMessage[];
  siteSettings: SiteSettings;
  activityLogs: ActivityLog[];
}

const createdAt = '2026-01-01T00:00:00.000Z';
const activeUntil = '2099-12-31T23:59:59.000Z';

export const GEOMETRY_TRIANGLE_SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240"><rect width="400" height="240" fill="#f5efe2"/><path d="M100 190 205 40l105 150Z" fill="none" stroke="#263a34" stroke-width="5"/><path d="M205 40v150" stroke="#c58a3a" stroke-width="3" stroke-dasharray="8 7"/><text x="196" y="218" font-family="sans-serif" font-size="18" fill="#263a34">Triangle</text></svg>')}`;
export const PHYSICS_CIRCUIT_SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240"><rect width="400" height="240" fill="#f5efe2"/><path d="M80 60h90m60 0h90v120h-90m-60 0H80V60m90-16v32m60-32v32m-70 72h80m-65-12 50 24m-50 0 50-24" fill="none" stroke="#263a34" stroke-width="5"/><circle cx="200" cy="60" r="30" fill="none" stroke="#c58a3a" stroke-width="4"/><text x="188" y="67" font-family="sans-serif" font-size="18" fill="#263a34">R</text></svg>')}`;

const classes: AcademicClass[] = [6, 7, 8, 9, 10].map((levelOrder) => ({
  id: `cls-${levelOrder}`,
  name: `Class ${levelOrder}`,
  nameBn: `শ্রেণি ${levelOrder}`,
  slug: `class-${levelOrder}`,
  levelOrder,
  hasGroups: levelOrder >= 9,
  isActive: true,
}));

const groups: AcademicGroup[] = [
  { id: 'grp-science', classId: 'cls-9', name: 'Science', nameBn: 'বিজ্ঞান', isActive: true },
  { id: 'grp-commerce', classId: 'cls-9', name: 'Commerce', nameBn: 'ব্যবসায় শিক্ষা', isActive: true },
  { id: 'grp-arts', classId: 'cls-9', name: 'Humanities', nameBn: 'মানবিক', isActive: true },
  { id: 'grp-science-10', classId: 'cls-10', name: 'Science', nameBn: 'বিজ্ঞান', isActive: true },
];

const subjects: Subject[] = classes.flatMap((item) => [
  { id: `sub-${item.levelOrder}-math`, classId: item.id, name: 'Mathematics', nameBn: 'গণিত', code: `MATH-${item.levelOrder}`, isActive: true },
  { id: `sub-${item.levelOrder}-science`, classId: item.id, name: 'General Science', nameBn: 'সাধারণ বিজ্ঞান', code: `SCI-${item.levelOrder}`, isActive: true },
  { id: `sub-${item.levelOrder}-english`, classId: item.id, name: 'English', nameBn: 'ইংরেজি', code: `ENG-${item.levelOrder}`, isActive: true },
]);

const chapters: Chapter[] = subjects.map((subject, index) => ({
  id: `ch-${subject.id}-1`,
  subjectId: subject.id,
  chapterNumber: 1,
  name: index % 3 === 0 ? 'Numbers and Operations' : index % 3 === 1 ? 'Living World' : 'Reading Skills',
  nameBn: index % 3 === 0 ? 'সংখ্যা ও প্রক্রিয়া' : index % 3 === 1 ? 'জীবজগৎ' : 'পঠন দক্ষতা',
  isActive: true,
}));

const topics: Topic[] = chapters.map((chapter) => ({
  id: `topic-${chapter.id}`,
  chapterId: chapter.id,
  name: 'Introduction',
  nameBn: 'পরিচিতি',
  isActive: true,
}));

const questionTypes: QuestionType[] = [
  { id: 'qt-mcq', code: 'mcq', name: 'Multiple Choice', nameBn: 'বহুনির্বাচনি', defaultMarks: 1, isActive: true },
  { id: 'qt-cq', code: 'cq', name: 'Creative Question', nameBn: 'সৃজনশীল', defaultMarks: 10, isActive: true },
  { id: 'qt-short', code: 'short', name: 'Short Answer', nameBn: 'সংক্ষিপ্ত উত্তর', defaultMarks: 2, isActive: true },
  { id: 'qt-fill', code: 'fill_blank', name: 'Fill in the Blank', nameBn: 'শূন্যস্থান পূরণ', defaultMarks: 1, isActive: true },
  { id: 'qt-true-false', code: 'true_false', name: 'True or False', nameBn: 'সত্য বা মিথ্যা', defaultMarks: 1, isActive: true },
  { id: 'qt-math', code: 'math', name: 'Mathematics', nameBn: 'গাণিতিক সমস্যা', defaultMarks: 5, isActive: true },
  { id: 'qt-image', code: 'image_based', name: 'Image Based', nameBn: 'চিত্রভিত্তিক', defaultMarks: 2, isActive: true },
];

const users: UserProfile[] = [
  { id: 'u-admin', fullName: 'Administrator', email: 'admin@example.com', phone: '01700000000', role: 'admin', status: 'active', emailVerified: true, preferredLanguage: 'bn', createdAt },
  { id: 'u-student-active', fullName: 'Nadia Akter', email: 'nadia@example.com', phone: '01711000111', role: 'student', status: 'active', emailVerified: true, preferredLanguage: 'bn', createdAt },
  { id: 'u-student-expired', fullName: 'Farhana Rahman', email: 'farhana@example.com', phone: '01711000112', role: 'student', status: 'active', emailVerified: true, preferredLanguage: 'bn', createdAt },
  { id: 'u-student-unsub', fullName: 'Tanvir Hasan', email: 'tanvir@example.com', phone: '01711000113', role: 'student', status: 'active', emailVerified: true, preferredLanguage: 'bn', createdAt },
];

const questions: Question[] = classes.flatMap((item) => {
  const subjectId = `sub-${item.levelOrder}-math`;
  const chapterId = `ch-${subjectId}-1`;
  return [
    {
      id: `q-${item.levelOrder}-math-mcq-1`,
      classId: item.id,
      subjectId,
      chapterId,
      topicId: `topic-${chapterId}`,
      questionTypeCode: 'mcq',
      language: 'bn',
      difficulty: 'easy',
      marks: 1,
      status: 'published',
      prompt: `${item.nameBn} এর গণিত: ২ + ৩ = কত?`,
      options: [
        { id: `q-${item.levelOrder}-a`, label: 'ক', text: '৪', isCorrect: false },
        { id: `q-${item.levelOrder}-b`, label: 'খ', text: '৫', isCorrect: true },
        { id: `q-${item.levelOrder}-c`, label: 'গ', text: '৬', isCorrect: false },
        { id: `q-${item.levelOrder}-d`, label: 'ঘ', text: '৭', isCorrect: false },
      ],
      correctAnswerText: '৫',
      explanation: '২ এর সঙ্গে ৩ যোগ করলে ৫ হয়।',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: `q-${item.levelOrder}-math-draft-1`,
      classId: item.id,
      subjectId,
      chapterId,
      questionTypeCode: 'short',
      language: 'bn',
      difficulty: 'medium',
      marks: 2,
      status: 'draft',
      prompt: 'একটি জোড় সংখ্যার উদাহরণ দাও।',
      correctAnswerText: '২',
      createdAt,
      updatedAt: createdAt,
    },
  ];
});

const plans: Plan[] = [
  { id: 'plan-c6-monthly', name: 'Class 6 Monthly', nameBn: 'ষষ্ঠ শ্রেণি মাসিক', audienceLabel: 'Class 6', description: 'Class 6 question bank access for 30 days.', priceBdt: 249, originalPriceBdt: 299, currency: 'BDT', durationDays: 30, includedClassIds: ['cls-6'], features: ['Question bank access', 'Custom paper creation'], isActive: true, displayOrder: 1 },
  { id: 'plan-junior-bundle', name: 'Junior Bundle', nameBn: 'জুনিয়র বান্ডেল', audienceLabel: 'Classes 6–8', description: 'Access to classes 6, 7, and 8 for 30 days.', priceBdt: 499, currency: 'BDT', durationDays: 30, includedClassIds: ['cls-6', 'cls-7', 'cls-8'], features: ['Three classes', 'Custom paper creation'], isActive: true, displayOrder: 2 },
  { id: 'plan-c8-monthly', name: 'Class 8 Monthly', nameBn: 'অষ্টম শ্রেণি মাসিক', audienceLabel: 'Class 8', description: 'Class 8 question bank access for 30 days.', priceBdt: 249, currency: 'BDT', durationDays: 30, includedClassIds: ['cls-8'], features: ['Question bank access'], isActive: true, displayOrder: 3 },
];

const paymentMethods: PaymentMethod[] = [
  { id: 'pm-bkash', name: 'bKash', accountNumber: '01XXXXXXXXX', accountType: 'Personal', instructions: 'Send the payment and enter the transaction ID.', isActive: true },
  { id: 'pm-nagad', name: 'Nagad', accountNumber: '01XXXXXXXXX', accountType: 'Personal', instructions: 'Send the payment and enter the transaction ID.', isActive: true },
];

const subscriptions: Subscription[] = [
  { id: 'sub-active-6', userId: 'u-student-active', planId: 'plan-c6-monthly', planNameSnapshot: 'Class 6 Monthly', priceSnapshotBdt: 249, durationDaysSnapshot: 30, grantedClassIds: ['cls-6', 'cls-8'], status: 'active', startsAt: createdAt, expiresAt: activeUntil, createdAt },
  { id: 'sub-expired-6', userId: 'u-student-expired', planId: 'plan-c6-monthly', planNameSnapshot: 'Class 6 Monthly', priceSnapshotBdt: 249, durationDaysSnapshot: 30, grantedClassIds: ['cls-6'], status: 'expired', startsAt: '2024-01-01T00:00:00.000Z', expiresAt: '2024-01-31T23:59:59.000Z', createdAt },
];

const siteSettings: SiteSettings = {
  brandName: 'প্রশ্নঘর',
  heroHeadline: 'পরীক্ষার প্রস্তুতি হোক আরও সহজ',
  heroSubheadline: 'প্রশ্ন ব্যাংক থেকে নিজের মতো প্রশ্নপত্র তৈরি করুন।',
  supportEmail: 'support@example.com',
  supportPhone: '+8801700000000',
  officeAddress: 'ঢাকা, বাংলাদেশ',
  renewalRuleNotice: 'নতুন সাবস্ক্রিপশন অনুমোদনের সময় থেকেই কার্যকর হবে।',
  demoDisclaimer: 'এটি একটি ডেমো অ্যাপ্লিকেশন।',
};

export function createSeedDatabase(): AppDatabaseState {
  return {
    users,
    passwordsByUserId: Object.fromEntries(users.map((user) => [user.id, 'demo1234'])),
    classes,
    groups,
    subjects,
    chapters,
    topics,
    questionTypes,
    questions,
    plans,
    paymentMethods,
    payments: [],
    subscriptions,
    favoritesByUserId: { 'u-student-active': ['q-6-math-mcq-1'] },
    savedByUserId: { 'u-student-active': ['q-6-math-mcq-1'] },
    papers: [
      {
        id: 'paper-expired-student-1',
        userId: 'u-student-expired',
        title: 'গণিত অনুশীলনী',
        examName: 'মডেল পরীক্ষা',
        classId: 'cls-6',
        subjectId: 'sub-6-math',
        schoolName: 'প্রশ্নঘর',
        examDate: '2026-12-01',
        durationMinutes: 60,
        instructions: 'সব প্রশ্নের উত্তর দাও।',
        includeStudentFields: true,
        includeHeaderFooter: true,
        includePageNumbers: true,
        items: [
          {
            id: 'paper-expired-student-item-1',
            sourceQuestionId: 'q-6-math-mcq-1',
            orderIndex: 0,
            customMarks: 1,
            snapshot: {
              classId: 'cls-6',
              subjectId: 'sub-6-math',
              chapterId: 'ch-sub-6-math-1',
              questionTypeCode: 'mcq',
              language: 'bn',
              prompt: '২ + ৩ = কত?',
              options: [
                { id: 'paper-opt-a', label: 'ক', text: '৪', isCorrect: false },
                { id: 'paper-opt-b', label: 'খ', text: '৫', isCorrect: true },
                { id: 'paper-opt-c', label: 'গ', text: '৬', isCorrect: false },
                { id: 'paper-opt-d', label: 'ঘ', text: '৭', isCorrect: false },
              ],
              correctAnswerText: '৫',
              explanation: '২ এর সঙ্গে ৩ যোগ করলে ৫ হয়।',
            },
          },
        ],
        createdAt,
        updatedAt: createdAt,
      },
    ],
    exports: [],
    notices: [{ id: 'notice-welcome', title: 'স্বাগতম', body: 'প্রশ্নঘরে আপনাকে স্বাগতম।', isPublished: true, createdAt }],
    faqs: [{ id: 'faq-1', question: 'কীভাবে প্রশ্নপত্র তৈরি করব?', answer: 'ড্যাশবোর্ড থেকে প্রশ্ন নির্বাচন করে প্রশ্নপত্র তৈরি করুন।', category: 'সাধারণ', displayOrder: 1, isPublished: true }],
    contactMessages: [],
    siteSettings,
    activityLogs: [],
  };
}
