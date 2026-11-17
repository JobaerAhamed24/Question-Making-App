export type UserRole = 'student' | 'admin';
export type AccountStatus = 'active' | 'suspended';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  institution?: string;
  role: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  preferredLanguage: 'en' | 'bn';
  createdAt: string;
}

export interface AcademicClass {
  id: string;
  name: string;
  nameBn: string;
  slug: string;
  levelOrder: number;
  hasGroups: boolean;
  isActive: boolean;
}

export interface AcademicGroup {
  id: string;
  classId: string;
  name: string;
  nameBn: string;
  isActive: boolean;
}

export interface Subject {
  id: string;
  classId: string;
  groupId?: string | null;
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
  isActive: boolean;
}

export interface Topic {
  id: string;
  chapterId: string;
  name: string;
  nameBn: string;
  isActive: boolean;
}

export type QuestionTypeCode =
  | 'mcq'
  | 'cq'
  | 'short'
  | 'fill_blank'
  | 'true_false'
  | 'math'
  | 'image_based';

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
  classId: string;
  groupId?: string | null;
  subjectId: string;
  chapterId: string;
  topicId?: string | null;
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
  customMarks: number;
  // Immutable snapshot preserved even if master question is edited or subscription expires
  snapshot: {
    classId: string;
    subjectId: string;
    chapterId: string;
    questionTypeCode: QuestionTypeCode;
    language: 'en' | 'bn';
    prompt: string;
    stimulus?: string;
    equationLatex?: string;
    imageUrl?: string;
    options?: QuestionOption[];
    subParts?: CreativeSubPart[];
    correctAnswerText?: string;
    explanation?: string;
  };
}

export interface QuestionPaper {
  id: string;
  userId: string;
  title: string;
  examName: string;
  classId: string;
  subjectId: string;
  schoolName: string;
  schoolLogoDataUrl?: string;
  examDate: string;
  durationMinutes: number;
  instructions: string;
  includeStudentFields: boolean;
  includeHeaderFooter: boolean;
  includePageNumbers: boolean;
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
  targetType: 'payment' | 'subscription' | 'question' | 'paper' | 'plan' | 'academic' | 'user' | 'website';
  targetId: string;
  details: string;
  createdAt: string;
}
