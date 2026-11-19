import type {
  AcademicClass,
  AcademicGroup,
  Chapter,
  FaqItem,
  Notice,
  PaymentMethod,
  Plan,
  QuestionType,
  SiteSettings,
  Subject,
  Topic,
} from '../types/domain';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { mockDb } from '../lib/mockDb';
import { mapChapter, mapClass, mapFaq, mapGroup, mapNotice, mapPaymentMethod, mapPlan, mapQuestionType, mapSiteSettings, mapSubject, mapTopic } from './supabaseMappers';

export interface AcademicCataloguePayload {
  classes: AcademicClass[];
  groups: AcademicGroup[];
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  questionTypes: QuestionType[];
}

export interface PublicSitePayload {
  siteSettings: SiteSettings;
  classes: AcademicClass[];
  subjects: Subject[];
  plans: Plan[];
  faqs: FaqItem[];
  notices: Notice[];
  paymentMethods: PaymentMethod[];
  questionTypes: QuestionType[];
}

export const academicService = {
  async getAcademicCatalogue(): Promise<AcademicCataloguePayload> {
    if (!isSupabaseConfigured) {
      const state = mockDb.getState();
      return {
        classes: [...state.classes].sort((a, b) => a.levelOrder - b.levelOrder),
        groups: [...state.groups].sort((a, b) => a.name.localeCompare(b.name)),
        subjects: [...state.subjects].sort((a, b) => a.name.localeCompare(b.name)),
        chapters: [...state.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber),
        topics: [...state.topics].sort((a, b) => a.name.localeCompare(b.name)),
        questionTypes: [...state.questionTypes].sort((a, b) => a.name.localeCompare(b.name)),
      };
    }
    const [classes, groups, subjects, chapters, topics, questionTypes] = await Promise.all([
      supabase.from('classes').select('*').order('level_order'),
      supabase.from('groups').select('*').order('name'),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('chapters').select('*').order('chapter_number'),
      supabase.from('topics').select('*').order('name'),
      supabase.from('question_types').select('*').order('name'),
    ]);
    for (const result of [classes, groups, subjects, chapters, topics, questionTypes]) {
      if (result.error) throw result.error;
    }
    return {
      classes: (classes.data ?? []).map(mapClass),
      groups: (groups.data ?? []).map(mapGroup),
      subjects: (subjects.data ?? []).map(mapSubject),
      chapters: (chapters.data ?? []).map(mapChapter),
      topics: (topics.data ?? []).map(mapTopic),
      questionTypes: (questionTypes.data ?? []).map(mapQuestionType),
    };
  },

  async getPublicSiteData(): Promise<PublicSitePayload> {
    if (!isSupabaseConfigured) {
      const state = mockDb.getState();
      const academic = await this.getAcademicCatalogue();
      return {
        siteSettings: state.siteSettings,
        classes: academic.classes.filter((item) => item.isActive),
        subjects: academic.subjects.filter((item) => item.isActive),
        plans: state.plans.filter((p) => p.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
        faqs: state.faqs.filter((f) => f.isPublished).sort((a, b) => a.displayOrder - b.displayOrder),
        notices: state.notices.filter((n) => n.isPublished).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        paymentMethods: state.paymentMethods.filter((m) => m.isActive).sort((a, b) => a.name.localeCompare(b.name)),
        questionTypes: academic.questionTypes.filter((item) => item.isActive),
      };
    }
    const [academic, settings, plans, faqs, notices, paymentMethods] = await Promise.all([
      this.getAcademicCatalogue(),
      supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('plans').select('*, plan_classes(class_id), plan_features(feature_text,sort_order)').eq('is_active', true).order('display_order'),
      supabase.from('faqs').select('*').eq('is_published', true).order('display_order'),
      supabase.from('notices').select('*').eq('is_published', true).order('created_at', { ascending: false }),
      supabase.from('payment_methods').select('*').eq('is_active', true).order('name'),
    ]);
    for (const result of [settings, plans, faqs, notices, paymentMethods]) {
      if (result.error) throw result.error;
    }
    return {
      siteSettings: settings.data ? mapSiteSettings(settings.data) : {
        brandName: 'প্রশ্নঘর', heroHeadline: '', heroSubheadline: '', supportEmail: '', supportPhone: '',
        officeAddress: '', renewalRuleNotice: '', demoDisclaimer: '',
      },
      classes: academic.classes.filter((item) => item.isActive),
      subjects: academic.subjects.filter((item) => item.isActive),
      plans: (plans.data ?? []).map(mapPlan),
      faqs: (faqs.data ?? []).map(mapFaq),
      notices: (notices.data ?? []).map(mapNotice),
      paymentMethods: (paymentMethods.data ?? []).map(mapPaymentMethod),
      questionTypes: academic.questionTypes.filter((item) => item.isActive),
    };
  },

  async submitContactMessage(input: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<{ message: { id: string } }> {
    if (!isSupabaseConfigured) {
      const id = mockDb.uid('msg');
      mockDb.getState().contactMessages.unshift({
        id,
        name: input.name.trim(),
        email: input.email.trim(),
        subject: input.subject.trim(),
        message: input.message.trim(),
        status: 'unread',
        createdAt: new Date().toISOString(),
      });
      mockDb.save();
      return { message: { id } };
    }
    const { data, error } = await supabase.from('contact_messages').insert({
      id: `msg-${crypto.randomUUID()}`,
      name: input.name.trim(),
      email: input.email.trim(),
      subject: input.subject.trim(),
      message: input.message.trim(),
      status: 'unread',
    }).select('id').single();
    if (error) throw error;
    return { message: data };
  },
};
