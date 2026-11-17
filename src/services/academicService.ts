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
import { supabase } from '../lib/supabaseClient';
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
