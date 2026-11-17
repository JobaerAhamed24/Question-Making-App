import type {
  AcademicClass,
  AcademicGroup,
  Chapter,
  CreativeSubPart,
  ExportRecord,
  FaqItem,
  Notice,
  Payment,
  PaymentMethod,
  Plan,
  Question,
  QuestionOption,
  QuestionPaper,
  QuestionPaperItem,
  QuestionType,
  SiteSettings,
  Subject,
  Subscription,
  Topic,
  UserProfile,
} from '../types/domain';

type Row = Record<string, unknown>;

export function asRow(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
}

export function camelize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Row).map(([key, item]) => [
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      camelize(item),
    ])
  );
}

function record<T>(value: unknown): T {
  return camelize(value) as T;
}

function relation(row: Row, key: string): Row {
  const value = row[key];
  return asRow(Array.isArray(value) ? value[0] : value);
}

export function mapUser(profileValue: unknown, roleValue: unknown): UserProfile {
  const profile = asRow(profileValue);
  const role = asRow(roleValue);
  return {
    id: String(profile.id ?? ''),
    fullName: String(profile.full_name ?? ''),
    email: String(profile.email ?? ''),
    phone: String(profile.phone ?? ''),
    institution: typeof profile.institution === 'string' ? profile.institution : undefined,
    role: role.role === 'admin' ? 'admin' : 'student',
    status: profile.status === 'suspended' ? 'suspended' : 'active',
    emailVerified: Boolean(profile.email_verified),
    preferredLanguage: profile.preferred_language === 'en' ? 'en' : 'bn',
    createdAt: String(profile.created_at ?? new Date().toISOString()),
  };
}

export const mapClass = (row: unknown) => record<AcademicClass>(row);
export const mapGroup = (row: unknown) => record<AcademicGroup>(row);
export const mapSubject = (row: unknown) => record<Subject>(row);
export const mapChapter = (row: unknown) => record<Chapter>(row);
export const mapTopic = (row: unknown) => record<Topic>(row);
export const mapQuestionType = (row: unknown) => record<QuestionType>(row);
export const mapPaymentMethod = (row: unknown) => record<PaymentMethod>(row);
export const mapNotice = (row: unknown) => record<Notice>(row);
export const mapFaq = (row: unknown) => record<FaqItem>(row);
export const mapSiteSettings = (row: unknown) => record<SiteSettings>(row);
export const mapExport = (row: unknown) => record<ExportRecord>(row);

export function mapPlan(value: unknown): Plan {
  const row = asRow(value);
  const planClasses = Array.isArray(row.plan_classes) ? row.plan_classes : [];
  const planFeatures = Array.isArray(row.plan_features) ? row.plan_features : [];
  return {
    ...record<Omit<Plan, 'includedClassIds' | 'features'>>(row),
    includedClassIds: planClasses.map((item) => String(asRow(item).class_id ?? '')),
    features: planFeatures
      .slice()
      .sort((a, b) => Number(asRow(a).sort_order ?? 0) - Number(asRow(b).sort_order ?? 0))
      .map((item) => String(asRow(item).feature_text ?? '')),
  };
}

export function mapSubscription(value: unknown): Subscription {
  const row = asRow(value);
  const classes = Array.isArray(row.subscription_classes) ? row.subscription_classes : [];
  return {
    ...record<Omit<Subscription, 'grantedClassIds'>>(row),
    grantedClassIds: classes.map((item) => String(asRow(item).class_id ?? '')),
  };
}

export function mapPayment(value: unknown): Payment {
  const row = asRow(value);
  const receipt = relation(row, 'payment_receipts');
  return {
    ...record<Payment>(row),
    receiptFileName: String(receipt.file_name ?? row.receipt_file_name ?? '') || undefined,
    receiptDataUrl: undefined,
  };
}

function mapOption(value: unknown): QuestionOption {
  const row = asRow(value);
  return {
    id: String(row.id ?? ''),
    label: String(row.option_label ?? ''),
    text: String(row.option_text ?? ''),
    isCorrect: Boolean(row.is_correct),
  };
}

function mapSubPart(value: unknown): CreativeSubPart {
  const row = asRow(value);
  return {
    id: String(row.id ?? ''),
    label: String(row.subpart_label ?? ''),
    prompt: String(row.prompt ?? ''),
    marks: Number(row.marks ?? 0),
    answer: String(row.answer ?? ''),
  };
}

export function mapQuestion(value: unknown): Question {
  const row = asRow(value);
  const stimulus = relation(row, 'question_stimuli');
  const answer = relation(row, 'question_answers');
  const options = Array.isArray(row.question_options) ? row.question_options : [];
  const subParts = Array.isArray(row.question_subparts) ? row.question_subparts : [];
  return {
    id: String(row.id ?? ''),
    classId: String(row.class_id ?? ''),
    groupId: typeof row.group_id === 'string' ? row.group_id : null,
    subjectId: String(row.subject_id ?? ''),
    chapterId: String(row.chapter_id ?? ''),
    topicId: typeof row.topic_id === 'string' ? row.topic_id : null,
    questionTypeCode: String(row.question_type_code ?? 'short') as Question['questionTypeCode'],
    language: row.language === 'en' ? 'en' : 'bn',
    difficulty: String(row.difficulty ?? 'medium') as Question['difficulty'],
    marks: Number(row.marks ?? 0),
    status: String(row.status ?? 'draft') as Question['status'],
    title: typeof row.title === 'string' ? row.title : undefined,
    prompt: String(row.question_text ?? ''),
    stimulus: typeof stimulus.stimulus_text === 'string' ? stimulus.stimulus_text : undefined,
    equationLatex: typeof row.equation_latex === 'string' ? row.equation_latex : undefined,
    imageUrl: typeof row.question_image === 'string' ? row.question_image : undefined,
    imageCaption: typeof row.image_caption === 'string' ? row.image_caption : undefined,
    options: options.length ? options.map(mapOption) : undefined,
    subParts: subParts.length ? subParts.map(mapSubPart) : undefined,
    correctAnswerText: typeof answer.correct_answer_text === 'string' ? answer.correct_answer_text : undefined,
    explanation: typeof answer.explanation === 'string' ? answer.explanation : undefined,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export function mapPaper(value: unknown): QuestionPaper {
  const row = asRow(value);
  const items = Array.isArray(row.paper_questions) ? row.paper_questions : [];
  const mappedItems: QuestionPaperItem[] = items
    .slice()
    .sort((a, b) => Number(asRow(a).question_order ?? 0) - Number(asRow(b).question_order ?? 0))
    .map((item) => {
      const entry = asRow(item);
      return {
        id: String(entry.id ?? ''),
        sourceQuestionId: String(entry.question_id ?? ''),
        orderIndex: Number(entry.question_order ?? 0),
        customMarks: Number(entry.custom_marks ?? 0),
        snapshot: camelize(entry.question_snapshot ?? {}) as QuestionPaperItem['snapshot'],
      };
    });
  return {
    id: String(row.id ?? ''),
    userId: String(row.user_id ?? ''),
    title: String(row.title ?? ''),
    examName: String(row.exam_name ?? ''),
    classId: String(row.class_id ?? ''),
    subjectId: String(row.subject_id ?? ''),
    schoolName: String(row.school_name ?? ''),
    schoolLogoDataUrl: typeof row.school_logo_path === 'string' ? row.school_logo_path : undefined,
    examDate: String(row.exam_date ?? ''),
    durationMinutes: Number(row.duration ?? 60),
    instructions: String(row.instructions ?? ''),
    includeStudentFields: Boolean(row.include_student_fields),
    includeHeaderFooter: Boolean(row.include_header_footer),
    includePageNumbers: Boolean(row.include_page_numbers),
    items: mappedItems,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}
