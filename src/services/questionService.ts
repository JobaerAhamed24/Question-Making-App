import type { PublicSafeQuestion, Question } from '../types/domain';
import { supabase } from '../lib/supabaseClient';
import { mapQuestion } from './supabaseMappers';

export interface QuestionQueryFilters {
  classId?: string;
  groupId?: string;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  typeCode?: string;
  difficulty?: string;
  marks?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: 'newest' | 'marks_asc' | 'marks_desc';
}

export interface PaginatedQuestionsResponse {
  items: Question[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const questionService = {
  async listPaginatedQuestions(filters: QuestionQueryFilters = {}): Promise<PaginatedQuestionsResponse> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    let query = supabase
      .from('questions')
      .select('*, question_options(*), question_answers(*), question_subparts(*), question_stimuli(*)', { count: 'exact' });
    if (filters.sort === 'marks_asc') query = query.order('marks', { ascending: true });
    else if (filters.sort === 'marks_desc') query = query.order('marks', { ascending: false });
    else query = query.order('created_at', { ascending: false });
    if (filters.classId && filters.classId !== 'all') query = query.eq('class_id', filters.classId);
    if (filters.groupId && filters.groupId !== 'all') query = query.eq('group_id', filters.groupId);
    if (filters.subjectId && filters.subjectId !== 'all') query = query.eq('subject_id', filters.subjectId);
    if (filters.chapterId && filters.chapterId !== 'all') query = query.eq('chapter_id', filters.chapterId);
    if (filters.topicId && filters.topicId !== 'all') query = query.eq('topic_id', filters.topicId);
    if (filters.typeCode && filters.typeCode !== 'all') query = query.eq('question_type_code', filters.typeCode);
    if (filters.difficulty && filters.difficulty !== 'all') query = query.eq('difficulty', filters.difficulty);
    if (filters.marks && filters.marks !== 'all') query = query.eq('marks', Number(filters.marks));
    const search = filters.search?.trim().replace(/[%_]/g, '');
    if (search) query = query.ilike('question_text', `%${search}%`);
    const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    const total = count ?? 0;
    return {
      items: (data ?? []).map(mapQuestion),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  async listQuestionsByIds(questionIds: string[]): Promise<Question[]> {
    if (!questionIds.length) return [];
    const { data, error } = await supabase
      .from('questions')
      .select('*, question_options(*), question_answers(*), question_subparts(*), question_stimuli(*)')
      .in('id', questionIds);
    if (error) throw error;
    const byId = new Map((data ?? []).map((row) => [row.id, mapQuestion(row)]));
    return questionIds.flatMap((questionId) => byId.has(questionId) ? [byId.get(questionId)!] : []);
  },

  async getQuestionById(questionId: string): Promise<{ question: Question | PublicSafeQuestion; hasAccess: boolean }> {
    const { data, error } = await supabase
      .from('questions')
      .select('*, question_options(*), question_answers(*), question_subparts(*), question_stimuli(*)')
      .eq('id', questionId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('প্রশ্নটি পাওয়া যায়নি অথবা আপনার সাবস্ক্রিপশন নেই।');
    return { question: mapQuestion(data), hasAccess: true };
  },
};
