import type {
  AcademicClass,
  AcademicGroup,
  ActivityLog,
  Chapter,
  FaqItem,
  Notice,
  Payment,
  PaymentMethod,
  Plan,
  Question,
  SiteSettings,
  Subject,
  Subscription,
  Topic,
  UserRole,
} from '../types/domain';
import type { AppDatabaseState } from '../data/seedData';
import { supabase } from '../lib/supabaseClient';
import {
  mapChapter,
  mapClass,
  mapFaq,
  mapGroup,
  mapNotice,
  mapPayment,
  mapPaymentMethod,
  mapPaper,
  mapPlan,
  mapQuestion,
  mapQuestionType,
  mapSiteSettings,
  mapSubject,
  mapSubscription,
  mapTopic,
  mapUser,
} from './supabaseMappers';

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

async function saveQuestion(input: Omit<Question, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Question> {
  const { data: type, error: typeError } = await supabase.from('question_types').select('id').eq('code', input.questionTypeCode).single();
  if (typeError) throw typeError;
  const questionId = input.id || id('q');
  const now = new Date().toISOString();
  const { data: saved, error } = await supabase.from('questions').upsert({
    id: questionId,
    class_id: input.classId,
    group_id: input.groupId || null,
    subject_id: input.subjectId,
    chapter_id: input.chapterId,
    topic_id: input.topicId || null,
    question_type_id: type.id,
    question_type_code: input.questionTypeCode,
    language: input.language,
    difficulty: input.difficulty,
    marks: input.marks,
    status: input.status,
    title: input.title || null,
    question_text: input.prompt,
    equation_latex: input.equationLatex || null,
    question_image: input.imageUrl || null,
    image_caption: input.imageCaption || null,
    updated_at: now,
  }).select('*, question_options(*), question_answers(*), question_subparts(*), question_stimuli(*)').single();
  if (error) throw error;

  const childDeletes = await Promise.all([
    supabase.from('question_options').delete().eq('question_id', questionId),
    supabase.from('question_subparts').delete().eq('question_id', questionId),
    supabase.from('question_tags').delete().eq('question_id', questionId),
  ]);
  childDeletes.forEach((result) => { if (result.error) throw result.error; });

  const childWrites: Promise<unknown>[] = [];
  if (input.options?.length) {
    childWrites.push(Promise.resolve(supabase.from('question_options').insert(input.options.map((option, index) => ({
      id: option.id || id('opt'), question_id: questionId, option_label: option.label, option_text: option.text,
      is_correct: option.isCorrect, sort_order: index,
    })))));
  }
  if (input.subParts?.length) {
    childWrites.push(Promise.resolve(supabase.from('question_subparts').insert(input.subParts.map((part, index) => ({
      id: part.id || id('part'), question_id: questionId, subpart_label: part.label, prompt: part.prompt,
      marks: part.marks, answer: part.answer, sort_order: index,
    })))));
  }
  if (input.stimulus) {
    childWrites.push(Promise.resolve(supabase.from('question_stimuli').upsert({ question_id: questionId, stimulus_text: input.stimulus })));
  } else {
    childWrites.push(Promise.resolve(supabase.from('question_stimuli').delete().eq('question_id', questionId)));
  }
  if (input.correctAnswerText || input.explanation) {
    childWrites.push(Promise.resolve(supabase.from('question_answers').upsert({
      question_id: questionId, correct_answer_text: input.correctAnswerText || null, explanation: input.explanation || null,
    })));
  } else {
    childWrites.push(Promise.resolve(supabase.from('question_answers').delete().eq('question_id', questionId)));
  }
  const results = await Promise.all(childWrites);
  for (const result of results) {
    if (result && typeof result === 'object' && 'error' in result && result.error) throw result.error;
  }
  return mapQuestion({ ...saved, question_options: input.options?.map((option, index) => ({
    id: option.id || id('opt'), option_label: option.label, option_text: option.text, is_correct: option.isCorrect, sort_order: index,
  })), question_answers: [{ correct_answer_text: input.correctAnswerText, explanation: input.explanation }],
  question_subparts: input.subParts?.map((part, index) => ({
    id: part.id || id('part'), subpart_label: part.label, prompt: part.prompt, marks: part.marks, answer: part.answer, sort_order: index,
  })), question_stimuli: input.stimulus ? [{ stimulus_text: input.stimulus }] : [] });
}

export const adminService = {
  async getSnapshot(): Promise<Omit<AppDatabaseState, 'passwordsByUserId'>> {
    const [profiles, roles, classes, groups, subjects, chapters, topics, questionTypes, questions, plans, paymentMethods, payments, subscriptions, favorites, saved, papers, exports, notices, faqs, contactMessages, siteSettings, activityLogs] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('*'),
      supabase.from('classes').select('*').order('level_order'),
      supabase.from('groups').select('*'),
      supabase.from('subjects').select('*'),
      supabase.from('chapters').select('*'),
      supabase.from('topics').select('*'),
      supabase.from('question_types').select('*'),
      supabase.from('questions').select('*, question_options(*), question_answers(*), question_subparts(*), question_stimuli(*)').order('created_at', { ascending: false }).limit(500),
      supabase.from('plans').select('*, plan_classes(class_id), plan_features(feature_text,sort_order)').order('display_order'),
      supabase.from('payment_methods').select('*'),
      supabase.from('payments').select('*, payment_receipts(file_name,storage_path,mime_type)').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*, subscription_classes(class_id)').order('created_at', { ascending: false }),
      supabase.from('favorites').select('*'),
      supabase.from('saved_questions').select('*'),
      supabase.from('papers').select('*, paper_questions(*)').order('updated_at', { ascending: false }).limit(500),
      supabase.from('export_history').select('*').order('created_at', { ascending: false }),
      supabase.from('notices').select('*'),
      supabase.from('faqs').select('*'),
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
      supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500),
    ]);
    const results = [profiles, roles, classes, groups, subjects, chapters, topics, questionTypes, questions, plans, paymentMethods, payments, subscriptions, favorites, saved, papers, exports, notices, faqs, contactMessages, activityLogs];
    for (const result of results) if (result.error) throw result.error;
    const roleByUser = new Map((roles.data ?? []).map((row) => [row.user_id, row]));
    const toLogs = (activityLogs.data ?? []).map((row) => ({
      id: row.id, actorUserId: row.actor_user_id ?? '', actorName: row.actor_name,
      actorRole: row.actor_role === 'admin' ? 'admin' as const : 'student' as const,
      action: row.action, targetType: row.target_type, targetId: row.target_id, details: row.details, createdAt: row.created_at,
    }));
    return {
      users: (profiles.data ?? []).map((profile) => mapUser(profile, roleByUser.get(profile.id))),
      classes: (classes.data ?? []).map(mapClass), groups: (groups.data ?? []).map(mapGroup),
      subjects: (subjects.data ?? []).map(mapSubject), chapters: (chapters.data ?? []).map(mapChapter),
      topics: (topics.data ?? []).map(mapTopic), questionTypes: (questionTypes.data ?? []).map(mapQuestionType),
      questions: (questions.data ?? []).map(mapQuestion), plans: (plans.data ?? []).map(mapPlan),
      paymentMethods: (paymentMethods.data ?? []).map(mapPaymentMethod), payments: (payments.data ?? []).map(mapPayment),
      subscriptions: (subscriptions.data ?? []).map(mapSubscription),
      favoritesByUserId: (favorites.data ?? []).reduce<Record<string, string[]>>((result, row) => {
        (result[row.user_id] ??= []).push(row.question_id);
        return result;
      }, {}),
      savedByUserId: (saved.data ?? []).reduce<Record<string, string[]>>((result, row) => {
        (result[row.user_id] ??= []).push(row.question_id);
        return result;
      }, {}),
      papers: (papers.data ?? []).map(mapPaper),
      exports: (exports.data ?? []).map((row) => ({
        id: row.id, userId: row.user_id, paperId: row.paper_id, paperTitle: row.paper_title,
        format: row.format, includedAnswerKey: row.included_answer_key, createdAt: row.created_at,
      })),
      notices: (notices.data ?? []).map(mapNotice), faqs: (faqs.data ?? []).map(mapFaq),
      contactMessages: (contactMessages.data ?? []).map((row) => ({
        id: row.id, name: row.name, email: row.email, subject: row.subject, message: row.message,
        status: row.status, createdAt: row.created_at,
      })),
      siteSettings: siteSettings.data ? mapSiteSettings(siteSettings.data) : {
        brandName: '', heroHeadline: '', heroSubheadline: '', supportEmail: '', supportPhone: '',
        officeAddress: '', renewalRuleNotice: '', demoDisclaimer: '',
      },
      activityLogs: toLogs as ActivityLog[],
    };
  },

  async addClass(input: Omit<AcademicClass, 'id'>): Promise<AcademicClass> {
    const payload = { id: id('cls'), name: input.name, name_bn: input.nameBn, slug: input.slug, level_order: input.levelOrder, has_groups: input.hasGroups, is_active: input.isActive };
    const { data, error } = await supabase.from('classes').insert(payload).select('*').single();
    if (error) throw error;
    return mapClass(data);
  },
  async addGroup(input: Omit<AcademicGroup, 'id'>): Promise<AcademicGroup> {
    const { data, error } = await supabase.from('groups').insert({ id: id('grp'), class_id: input.classId, name: input.name, name_bn: input.nameBn, is_active: input.isActive }).select('*').single();
    if (error) throw error;
    return mapGroup(data);
  },
  async addSubject(input: Omit<Subject, 'id'>): Promise<Subject> {
    const { data, error } = await supabase.from('subjects').insert({ id: id('sub'), class_id: input.classId, group_id: input.groupId || null, name: input.name, name_bn: input.nameBn, code: input.code, is_active: input.isActive }).select('*').single();
    if (error) throw error;
    return mapSubject(data);
  },
  async addChapter(input: Omit<Chapter, 'id'>): Promise<Chapter> {
    const { data, error } = await supabase.from('chapters').insert({ id: id('ch'), subject_id: input.subjectId, chapter_number: input.chapterNumber, name: input.name, name_bn: input.nameBn, is_active: input.isActive }).select('*').single();
    if (error) throw error;
    return mapChapter(data);
  },
  async addTopic(input: Omit<Topic, 'id'>): Promise<Topic> {
    const { data, error } = await supabase.from('topics').insert({ id: id('topic'), chapter_id: input.chapterId, name: input.name, name_bn: input.nameBn, is_active: input.isActive }).select('*').single();
    if (error) throw error;
    return mapTopic(data);
  },
  saveQuestion,
  async deleteQuestion(questionId: string): Promise<{ ok: boolean }> {
    const { error } = await supabase.from('questions').delete().eq('id', questionId);
    if (error) throw error;
    return { ok: true };
  },
  async bulkImportQuestions(items: Array<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{ importedCount: number }> {
    let importedCount = 0;
    for (const item of items) { await saveQuestion(item); importedCount += 1; }
    return { importedCount };
  },
  async savePlan(input: Omit<Plan, 'id'> & { id?: string }): Promise<Plan> {
    const planId = input.id || id('plan');
    const { error } = await supabase.from('plans').upsert({
      id: planId, name: input.name, name_bn: input.nameBn, audience_label: input.audienceLabel,
      description: input.description, price_bdt: input.priceBdt, original_price_bdt: input.originalPriceBdt ?? null,
      currency: input.currency, duration_days: input.durationDays, is_active: input.isActive, display_order: input.displayOrder,
    });
    if (error) throw error;
    const [classDelete, featureDelete] = await Promise.all([
      supabase.from('plan_classes').delete().eq('plan_id', planId),
      supabase.from('plan_features').delete().eq('plan_id', planId),
    ]);
    if (classDelete.error) throw classDelete.error;
    if (featureDelete.error) throw featureDelete.error;
    const [classInsert, featureInsert] = await Promise.all([
      input.includedClassIds.length ? supabase.from('plan_classes').insert(input.includedClassIds.map((classId) => ({ plan_id: planId, class_id: classId }))) : Promise.resolve({ error: null }),
      input.features.length ? supabase.from('plan_features').insert(input.features.map((feature, index) => ({ plan_id: planId, feature_text: feature, sort_order: index }))) : Promise.resolve({ error: null }),
    ]);
    if (classInsert.error) throw classInsert.error;
    if (featureInsert.error) throw featureInsert.error;
    return { ...input, id: planId };
  },
  async savePaymentMethod(input: Omit<PaymentMethod, 'id'> & { id?: string }): Promise<PaymentMethod> {
    const { data, error } = await supabase.from('payment_methods').upsert({
      id: input.id || id('pm'), name: input.name, account_number: input.accountNumber,
      account_type: input.accountType, instructions: input.instructions, is_active: input.isActive,
    }).select('*').single();
    if (error) throw error;
    return mapPaymentMethod(data);
  },
  async reviewPayment(paymentId: string, decision: 'approved' | 'rejected', reviewNote: string): Promise<{ payment: Payment; subscription?: Subscription }> {
    const { data, error } = await supabase.functions.invoke('review-payment', { body: { paymentId, decision, reviewNote } });
    if (error) throw error;
    const { data: payment, error: paymentError } = await supabase.from('payments').select('*, payment_receipts(file_name,storage_path,mime_type)').eq('id', paymentId).single();
    if (paymentError) throw paymentError;
    return { payment: mapPayment(payment), subscription: data?.result?.subscription ? data.result.subscription as Subscription : undefined };
  },
  async manualActivateSubscription(userId: string, planId: string): Promise<Subscription> {
    const { data, error } = await supabase.rpc('admin_activate_subscription', { p_user_id: userId, p_plan_id: planId });
    if (error) throw error;
    return mapSubscription(data);
  },
  async updateSubscriptionStatus(subscriptionId: string, status: Subscription['status']): Promise<{ ok: boolean }> {
    const { error } = await supabase.from('subscriptions').update({ status }).eq('id', subscriptionId);
    if (error) throw error;
    return { ok: true };
  },
  async updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<{ ok: boolean }> {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', userId);
    if (error) throw error;
    return { ok: true };
  },
  async updateUserRole(userId: string, role: UserRole): Promise<{ ok: boolean }> {
    const { data: actor, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!actor.user || actor.user.id === userId) throw new Error('নিজের অ্যাডমিন ভূমিকা পরিবর্তন করা যাবে না।');
    const { error } = await supabase.from('user_roles').upsert({ user_id: userId, role, assigned_by: actor.user.id });
    if (error) throw error;
    return { ok: true };
  },
  async updateSiteSettings(settings: SiteSettings): Promise<SiteSettings> {
    const { data, error } = await supabase.from('site_settings').upsert({
      id: 1, brand_name: settings.brandName, hero_headline: settings.heroHeadline,
      hero_subheadline: settings.heroSubheadline, support_email: settings.supportEmail,
      support_phone: settings.supportPhone, office_address: settings.officeAddress,
      renewal_rule_notice: settings.renewalRuleNotice, demo_disclaimer: settings.demoDisclaimer,
    }).select('*').single();
    if (error) throw error;
    return mapSiteSettings(data);
  },
  async saveNotice(input: Omit<Notice, 'id' | 'createdAt'> & { id?: string }): Promise<Notice> {
    const { data, error } = await supabase.from('notices').upsert({ id: input.id || id('notice'), title: input.title, body: input.body, is_published: input.isPublished }).select('*').single();
    if (error) throw error;
    return mapNotice(data);
  },
  async saveFaq(input: Omit<FaqItem, 'id'> & { id?: string }): Promise<FaqItem> {
    const { data, error } = await supabase.from('faqs').upsert({ id: input.id || id('faq'), question: input.question, answer: input.answer, category: input.category, display_order: input.displayOrder, is_published: input.isPublished }).select('*').single();
    if (error) throw error;
    return mapFaq(data);
  },
  async resolveContactMessage(messageId: string): Promise<{ ok: boolean }> {
    const { error } = await supabase.from('contact_messages').update({ status: 'resolved' }).eq('id', messageId);
    if (error) throw error;
    return { ok: true };
  },
  async getActivityLogs(): Promise<{ logs: ActivityLog[] }> {
    const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    return { logs: (data ?? []).map((row) => ({ id: row.id, actorUserId: row.actor_user_id ?? '', actorName: row.actor_name, actorRole: row.actor_role === 'admin' ? 'admin' as const : 'student' as const, action: row.action, targetType: row.target_type, targetId: row.target_id, details: row.details, createdAt: row.created_at })) };
  },
  async getReports(): Promise<{ totalUsers: number; totalQuestions: number; publishedQuestions: number; totalPapers: number; totalExports: number; pendingPayments: number; approvedRevenueBdt: number }> {
    const [users, questions, published, papers, exports, pending, approved] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('questions').select('id', { count: 'exact', head: true }),
      supabase.from('questions').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('papers').select('id', { count: 'exact', head: true }),
      supabase.from('export_history').select('id', { count: 'exact', head: true }),
      supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('payments').select('expected_amount_bdt').eq('status', 'approved'),
    ]);
    for (const result of [users, questions, published, papers, exports, pending, approved]) if (result.error) throw result.error;
    return {
      totalUsers: users.count ?? 0, totalQuestions: questions.count ?? 0, publishedQuestions: published.count ?? 0,
      totalPapers: papers.count ?? 0, totalExports: exports.count ?? 0, pendingPayments: pending.count ?? 0,
      approvedRevenueBdt: (approved.data ?? []).reduce((total, row) => total + Number(row.expected_amount_bdt), 0),
    };
  },
};
