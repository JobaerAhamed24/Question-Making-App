export type UserRole = 'student' | 'admin';
export type AccountStatus = 'active' | 'suspended';

export interface StudentPrivacySettings {
  showProfilePublicly: boolean;
  showSchool: boolean;
  showExamHistory: boolean;
  showSubjectPerformance: boolean;
  showAchievements: boolean;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  institution?: string;
  classId?: string;
  avatarUrl?: string;
  bio?: string;
  privacySettings?: StudentPrivacySettings;
  role: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  preferredLanguage: 'en' | 'bn';
  createdAt: string;
}

export type EducationLevel = 'primary' | 'secondary' | 'higher_secondary';
export type AcademicGroupCode = 'science' | 'humanities' | 'business';
export type SubjectCategory = 'compulsory' | 'group' | 'optional' | 'fourth';

export interface AcademicClass {
  id: string;
  name: string;
  nameBn: string;
  slug: string;
  levelOrder: number;
  educationLevel?: EducationLevel;
  hasGroups: boolean;
  isActive: boolean;
}

export interface AcademicGroup {
  id: string;
  classId: string;
  code?: AcademicGroupCode;
  name: string;
  nameBn: string;
  isActive: boolean;
}

export interface Subject {
  id: string;
  classId: string;
  groupId?: string | null;
  groupIds?: string[];
  category?: SubjectCategory;
  name: string;
  nameBn: string;
  code: string;
  isActive: boolean;
}

export interface Chapter {
  id: string;
  subjectId: string;
  chapterNumber: number;
  name: string;
  nameBn: string;
  displayOrder?: number;
  sourceRef?: string;
  curriculumVersion?: string;
  pendingVerification?: boolean;
  isActive: boolean;
}

export interface Topic {
  id: string;
  chapterId: string;
  name: string;
  nameBn: string;
  displayOrder?: number;
  pendingVerification?: boolean;
  isActive: boolean;
}

export type QuestionTypeCode =
  | 'mcq'
  | 'cq'
  | 'short'
  | 'broad'
  | 'fill_blank'
  | 'true_false'
  | 'matching'
  | 'math'
  | 'image_based';

export type EducationBoard =
  | 'dhaka'
  | 'chattogram'
  | 'cumilla'
  | 'rajshahi'
  | 'jashore'
  | 'barishal'
  | 'sylhet'
  | 'dinajpur'
  | 'mymensingh';

export type AdmissionCategoryCode = 'university' | 'engineering' | 'medical';

export type QuestionDomain = 'academic' | 'admission';

export interface QuestionType {
  id: string;
  code: QuestionTypeCode;
  name: string;
  nameBn: string;
  defaultMarks: number;
  isActive: boolean;
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'draft' | 'published' | 'archived';

export interface QuestionOption {
  id: string;
  label: string; // e.g., A, B, C, D or ক, খ, গ, ঘ
  text: string;
  isCorrect: boolean;
}

export interface CreativeSubPart {
  id: string;
  label: string; // e.g., a / ক
  prompt: string;
  marks: number;
  answer: string;
}

export interface Question {
  id: string;
  domain?: QuestionDomain;
  classId: string;
  groupId?: string | null;
  subjectId: string;
  chapterId: string;
  topicId?: string | null;
  admissionCategory?: AdmissionCategoryCode;
  institutionId?: string;
  admissionSubjectId?: string;
  admissionTopicId?: string;
  board?: EducationBoard;
  boardYear?: number;
  approvalStatus?: 'approved' | 'pending_ai' | 'rejected';
  isAiGenerated?: boolean;
  questionTypeCode: QuestionTypeCode;
  language: 'en' | 'bn';
  difficulty: QuestionDifficulty;
  marks: number;
  status: QuestionStatus;
  title?: string;
  prompt: string;
  stimulus?: string; // For CQ stem or reading passage
  equationLatex?: string; // For Math questions
  imageUrl?: string;
  imageCaption?: string;
  options?: QuestionOption[];
  subParts?: CreativeSubPart[];
  correctAnswerText?: string;
  explanation?: string;
  createdAt: string;
  updatedAt: string;
}

/** Question returned to unauthorized/unsubscribed callers has answers stripped */
export type PublicSafeQuestion = Omit<
  Question,
  'correctAnswerText' | 'explanation' | 'subParts' | 'options'
> & {
  options?: Array<Omit<QuestionOption, 'isCorrect'>>;
  subParts?: Array<Omit<CreativeSubPart, 'answer'>>;
  accessRestricted?: boolean;
};

export interface Plan {
  id: string;
  name: string;
  nameBn: string;
  audienceLabel: string;
  description: string;
  priceBdt: number;
  originalPriceBdt?: number | null;
  currency: 'BDT';
  durationDays: number;
  includedClassIds: string[];
  features: string[];
  isActive: boolean;
  displayOrder: number;
}

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planNameSnapshot: string;
  priceSnapshotBdt: number;
  durationDaysSnapshot: number;
  grantedClassIds: string[]; // Immutable snapshot of classes at purchase time
  status: SubscriptionStatus;
  startsAt: string;
  expiresAt: string;
  paymentId?: string;
  activatedByAdminId?: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  name: string; // e.g., bKash Personal, Nagad Merchant, Bank Transfer
  accountNumber: string;
  accountType: string;
  instructions: string;
  isActive: boolean;
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface Payment {
  id: string;
  userId: string;
  planId: string;
  planNameSnapshot: string;
  expectedAmountBdt: number;
  submittedAmountBdt: number;
  paymentMethodId: string;
  paymentMethodNameSnapshot: string;
  senderNumber: string;
  transactionRef: string;
  receiptDataUrl?: string;
  receiptFileName?: string;
  status: PaymentStatus;
  reviewedByAdminId?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

export interface QuestionPaperItem {
  id: string;
  sourceQuestionId: string;
  orderIndex: number;
  customNumber?: string;
  customMarks: number;
  // Immutable snapshot preserved even if master question is edited or subscription expires
  snapshot: {
    classId: string;
    subjectId: string;
    chapterId: string;
    questionTypeCode: QuestionTypeCode;
    difficulty?: QuestionDifficulty;
    language: 'en' | 'bn';
    prompt: string;
    stimulus?: string;
    equationLatex?: string;
    imageUrl?: string;
    options?: QuestionOption[];
    subParts?: CreativeSubPart[];
    correctAnswerText?: string;
    explanation?: string;
    board?: EducationBoard;
    boardYear?: number;
  };
}

export type PaperTemplateId =
  | 'classic-board'
  | 'modern-minimal'
  | 'bilingual-institute'
  | 'compact-omr';

export interface PaperDesignConfig {
  templateId: PaperTemplateId;
  bengaliFont: string;
  englishFont: string;
  fontSizePx: number;
  headingSizePx: number;
  lineHeight: number;
  textAlign: 'left' | 'justify' | 'center';
  pageMarginMm: number;
  backgroundColor: string;
  textColor: string;
  headerColor: string;
  borderStyle: 'none' | 'single' | 'double' | 'accent';
}

export interface OmrSheetConfig {
  enabled: boolean;
  questionCount: number;
  optionsCount: 4 | 5;
  optionStyle: 'bn' | 'en';
  includeRollGrid: boolean;
  includeRegGrid: boolean;
  includeSetCode: boolean;
}

export interface QuestionPaper {
  id: string;
  userId: string;
  domain?: QuestionDomain;
  admissionCategory?: AdmissionCategoryCode;
  classLabel?: string;
  subjectLabel?: string;
  title: string;
  examName: string;
  classId: string;
  subjectId: string;
  schoolName: string;
  schoolLogoDataUrl?: string;
  examDate?: string;
  durationMinutes: number;
  instructions: string;
  headerText?: string;
  footerText?: string;
  includeStudentFields: boolean;
  includeHeaderFooter: boolean;
  includePageNumbers: boolean;
  designConfig?: PaperDesignConfig;
  omrConfig?: OmrSheetConfig;
  items: QuestionPaperItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ExportRecord {
  id: string;
  userId: string;
  paperId: string;
  paperTitle: string;
  format: 'pdf' | 'docx';
  includedAnswerKey: boolean;
  createdAt: string;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  isPublished: boolean;
  createdAt: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
  isPublished: boolean;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'resolved';
  createdAt: string;
}

export interface SiteSettings {
  brandName: string;
  heroHeadline: string;
  heroSubheadline: string;
  supportEmail: string;
  supportPhone: string;
  officeAddress: string;
  renewalRuleNotice: string;
  demoDisclaimer: string;
}

export interface ActivityLog {
  id: string;
  actorUserId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: 'payment' | 'subscription' | 'question' | 'paper' | 'plan' | 'academic' | 'user' | 'website' | 'exam' | 'slide';
  targetId: string;
  details: string;
  createdAt: string;
}

// --- Auto Slide Maker Domain Types ---
export type SlideTemplateId =
  | 'obsidian-gold'
  | 'editorial-cream'
  | 'academic-navy'
  | 'forest-chalk'
  | 'minimal-studio';

export type SlideAspectRatio = '16:9' | '16:10' | '4:3';
export type SlideLayoutMode = 'stacked' | 'grid-2x2' | 'split-focus';
export type SlideBackgroundStyle = 'solid' | 'gradient' | 'grid';
export type SlideTypographyScale = 'compact' | 'standard' | 'classroom';
export type AnswerRevealMode = 'after-each' | 'at-end' | 'question-only';

export interface SlideMcqInput {
  id: string;
  prompt: string;
  options: Array<{ label: string; text: string; isCorrect: boolean }>;
  explanation?: string;
}

export type SlideKind = 'title' | 'question' | 'answer' | 'summary' | 'custom';

export interface SlideItem {
  id: string;
  kind: SlideKind;
  questionNumber?: number;
  title: string;
  subtitle?: string;
  prompt?: string;
  options?: Array<{ label: string; text: string; isCorrect: boolean }>;
  explanation?: string;
  notes?: string;
}

export interface SlideDeckConfig {
  title: string;
  subtitle: string;
  presenterName: string;
  templateId: SlideTemplateId;
  aspectRatio: SlideAspectRatio;
  layoutMode: SlideLayoutMode;
  backgroundStyle: SlideBackgroundStyle;
  typographyScale: SlideTypographyScale;
  answerRevealMode: AnswerRevealMode;
  fontFamily: string;
  customBgColor: string;
  customTextColor: string;
  customAccentColor: string;
  includeTitleSlide: boolean;
  includeSummarySlide: boolean;
}

export interface SlideDeck {
  id: string;
  userId?: string;
  config: SlideDeckConfig;
  slides: SlideItem[];
  createdAt: string;
  updatedAt: string;
}

// --- Live Exam, Student Profile & Leaderboard Domain Types ---
export type LiveExamAccessMode = 'public' | 'private';
export type LiveExamComputedStatus = 'upcoming' | 'live' | 'ended';

export interface LiveExam {
  id: string;
  title: string;
  description: string;
  classId: string;
  subjectId: string;
  questionIds: string[]; // References Question Bank MCQ IDs
  durationMinutes: number;
  marksPerQuestion: number;
  negativeMarkingPerWrong: number; // e.g. 0 or 0.25 or 0.5
  totalMarks: number;
  startsAt: string;
  endsAt: string;
  accessMode: LiveExamAccessMode;
  accessCode?: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
}

/** Sanitized exam question served to students BEFORE submission (no answer leakage) */
export interface LiveExamQuestionPublic {
  id: string;
  prompt: string;
  equationLatex?: string;
  imageUrl?: string;
  options: Array<{ id: string; label: string; text: string }>;
}

export interface ExamAnswerReview {
  questionId: string;
  prompt: string;
  options: QuestionOption[];
  selectedOptionId: string | null;
  correctOptionId: string | null;
  isCorrect: boolean;
  explanation?: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  classId: string;
  subjectId: string;
  userId: string;
  userName: string;
  answers: Record<string, string>; // questionId -> selectedOptionId
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  rawScore: number;
  negativeDeducted: number;
  finalScore: number;
  totalMarks: number;
  accuracyPercent: number;
  timeTakenSeconds: number;
  submittedAt: string;
}

export interface StudentAchievement {
  id: string;
  title: string;
  description: string;
  earnedAt: string;
}

export interface SubjectPerformanceStat {
  subjectId: string;
  subjectName: string;
  examsCount: number;
  totalScored: number;
  totalPossible: number;
  averagePercent: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  institution?: string;
  classId?: string;
  className?: string;
  examsParticipated: number;
  totalScore: number;
  totalPossibleMarks: number;
  averagePercent: number;
  bestSubjectName?: string;
}

export interface StudentPublicProfileView {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  classId?: string;
  className?: string;
  institution?: string;
  bio?: string;
  isPrivate: boolean;
  privacySettings: StudentPrivacySettings;
  stats: {
    examsParticipated: number;
    totalScore: number;
    totalPossibleMarks: number;
    averagePercent: number;
    leaderboardRank: number | null;
  };
  subjectPerformance: SubjectPerformanceStat[];
  examHistory: Array<{
    attemptId: string;
    examId: string;
    examTitle: string;
    subjectName: string;
    finalScore: number;
    totalMarks: number;
    accuracyPercent: number;
    submittedAt: string;
  }>;
  achievements: StudentAchievement[];
}

// --- Admission Builder Domain Types ---
export interface AdmissionCategoryInfo {
  id: AdmissionCategoryCode;
  name: string;
  nameBn: string;
  subtitleBn: string;
  descriptionBn: string;
  highlightsBn: string[];
  isActive: boolean;
}

export interface AdmissionInstitution {
  id: string;
  categoryId: AdmissionCategoryCode;
  name: string;
  nameBn: string;
  shortCode: string;
  isActive: boolean;
}

export interface AdmissionSubject {
  id: string;
  categoryId: AdmissionCategoryCode;
  name: string;
  nameBn: string;
  isActive: boolean;
}

export interface AdmissionTopic {
  id: string;
  admissionSubjectId: string;
  name: string;
  nameBn: string;
  isActive: boolean;
}

// --- Saved Question Workspace Filter Presets ---
export type QuestionSourceFilter =
  | 'platform'
  | 'saved'
  | 'previously_used'
  | 'admin_approved'
  | 'previous_admission';

export interface WorkspaceFilterState {
  domain: QuestionDomain;
  sources: QuestionSourceFilter[];
  classId?: string;
  groupId?: string;
  subjectId?: string;
  chapterIds: string[];
  topicIds: string[];
  admissionCategory?: AdmissionCategoryCode;
  institutionIds: string[];
  admissionSubjectId?: string;
  admissionTopicIds: string[];
  difficulties: QuestionDifficulty[];
  questionTypes: QuestionTypeCode[];
  boards: EducationBoard[];
  years: number[];
  yearFrom?: number;
  yearTo?: number;
  answerFilter: 'all' | 'with_answer' | 'without_answer';
  usageFilter: 'all' | 'used' | 'unused';
  sortBy: 'default' | 'recent' | 'year_desc' | 'random';
  search: string;
}

export interface SavedFilterPreset {
  id: string;
  userId: string;
  name: string;
  domain: QuestionDomain;
  filters: WorkspaceFilterState;
  createdAt: string;
}

// --- Public SEO Learning Hub Domain Types ---
export type LearningCategorySlug =
  | 'mathematics'
  | 'higher-mathematics'
  | 'physics'
  | 'chemistry'
  | 'admission';

export interface LearningContent {
  id: string;
  categorySlug: LearningCategorySlug;
  domain: QuestionDomain;
  classSlug: string;
  classNameBn: string;
  subjectSlug: string;
  subjectNameBn: string;
  chapterSlug: string;
  chapterNameBn: string;
  exerciseSlug: string;
  exerciseNameBn: string;
  problemSlug: string;
  title: string;
  questionText: string;
  diagramSvg?: string;
  imageUrl?: string;
  formulas: string[];
  equations: string[];
  solutionSteps: Array<{
    stepNumber: number;
    heading: string;
    detail: string;
    mathLine?: string;
  }>;
  finalAnswer: string;
  youtubeUrl?: string;
  seoTitle: string;
  seoDescription: string;
  relatedIds: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LearningComment {
  id: string;
  contentId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  body: string;
  likedByUserIds: string[];
  reportedByUserIds: string[];
  isHidden?: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Kids Math Game Domain Types ---
export type KidsGameCategory = 'addition' | 'subtraction' | 'multiplication' | 'division';

export type KidsGameModeId =
  | 'match_answer'
  | 'solve_equation'
  | 'number_puzzle'
  | 'timed_challenge'
  | 'missing_number'
  | 'table_game'
  | 'equal_grouping'
  | 'find_quotient';

export interface KidsGameLesson {
  category: KidsGameCategory;
  titleBn: string;
  subtitleBn: string;
  conceptBn: string;
  rulesBn: string[];
  visualExamples: Array<{
    titleBn: string;
    expression: string;
    leftCount: number;
    rightCount: number;
    operator: '+' | '-' | '×' | '÷';
    result: number;
    explanationBn: string;
  }>;
  practiceItems: Array<{
    promptBn: string;
    answer: number;
    hintBn: string;
  }>;
}

export interface KidsGameQuestion {
  id: string;
  category: KidsGameCategory;
  modeId: KidsGameModeId;
  levelNumber: number;
  promptBn: string;
  expression: string;
  visualGroup?: { total: number; groups: number };
  options: number[];
  correctAnswer: number;
  hintBn: string;
}

export interface KidsGameLevel {
  id: string;
  levelNumber: number;
  titleBn: string;
  difficulty: QuestionDifficulty;
  targetScore: number;
  rewardStars: number;
  timeLimitSeconds?: number;
}

export interface KidsGameConfig {
  id: string;
  category: KidsGameCategory;
  modeId: KidsGameModeId;
  titleBn: string;
  subtitleBn: string;
  instructionsBn: string;
  difficulty: QuestionDifficulty;
  rewardStars: number;
  isActive: boolean;
  levels: KidsGameLevel[];
  customQuestions: KidsGameQuestion[];
}

export interface KidsGameProgress {
  totalStars: number;
  totalScore: number;
  soundEnabled: boolean;
  completedLessons: KidsGameCategory[];
  completedLevelsByCategory: Record<KidsGameCategory, number[]>;
  highScoresByMode: Record<string, number>;
  recentRewards: Array<{ id: string; titleBn: string; stars: number; earnedAt: string }>;
}


