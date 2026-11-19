import type { PublicSafeQuestion, Question } from '../types/domain';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { mockDb } from '../lib/mockDb';
import { canUserAccessQuestion, getUserPermittedClassIds } from '../lib/rules';
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
    if (!isSupabaseConfigured) {
      const state = mockDb.getState();
      const user = mockDb.getCurrentUser();
      const permitted = user ? getUserPermittedClassIds(state.subscriptions, user.id) : [];
      const search = filters.search?.trim().toLowerCase() || '';
      const filtered = state.questions.filter((q) => {
        if (!user) return false;
        if (user.role !== 'admin') {
          if (q.status !== 'published' || !permitted.includes(q.classId)) return false;
        }
        if (filters.classId && filters.classId !== 'all' && q.classId !== filters.classId) return false;
        if (filters.groupId && filters.groupId !== 'all' && q.groupId !== filters.groupId) return false;
        if (filters.subjectId && filters.subjectId !== 'all' && q.subjectId !== filters.subjectId) return false;
        if (filters.chapterId && filters.chapterId !== 'all' && q.chapterId !== filters.chapterId) return false;
        if (filters.topicId && filters.topicId !== 'all' && q.topicId !== filters.topicId) return false;
        if (filters.typeCode && filters.typeCode !== 'all' && q.questionTypeCode !== filters.typeCode) return false;
        if (filters.difficulty && filters.difficulty !== 'all' && q.difficulty !== filters.difficulty) return false;
        if (filters.marks && filters.marks !== 'all' && q.marks !== Number(filters.marks)) return false;
        if (search && !q.prompt.toLowerCase().includes(search)) return false;
        return true;
      });
      filtered.sort((a, b) => {
        if (filters.sort === 'marks_asc') return a.marks - b.marks;
        if (filters.sort === 'marks_desc') return b.marks - a.marks;
        return b.createdAt.localeCompare(a.createdAt);
      });
      const total = filtered.length;
      const items = structuredClone(filtered.slice((page - 1) * pageSize, page * pageSize));
      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    }

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
    if (!isSupabaseConfigured) {
      const state = mockDb.getState();
      const user = mockDb.getCurrentUser();
      const byId = new Map(
        state.questions
          .filter((q) => canUserAccessQuestion(q, state.subscriptions, user?.id, user?.role))
          .map((q) => [q.id, q])
      );
      return questionIds.flatMap((questionId) => (byId.has(questionId) ? [structuredClone(byId.get(questionId)!)] : []));
    }
    const { data, error } = await supabase
      .from('questions')
      .select('*, question_options(*), question_answers(*), question_subparts(*), question_stimuli(*)')
      .in('id', questionIds);
    if (error) throw error;
    const byId = new Map((data ?? []).map((row) => [row.id, mapQuestion(row)]));
    return questionIds.flatMap((questionId) => byId.has(questionId) ? [byId.get(questionId)!] : []);
  },

  async getQuestionById(questionId: string): Promise<{ question: Question | PublicSafeQuestion; hasAccess: boolean }> {
    if (!isSupabaseConfigured) {
      const state = mockDb.getState();
      const user = mockDb.getCurrentUser();
      const q = state.questions.find((item) => item.id === questionId);
      if (!q || !canUserAccessQuestion(q, state.subscriptions, user?.id, user?.role)) {
        throw new Error('প্রশ্নটি পাওয়া যায়নি অথবা আপনার সাবস্ক্রিপশন নেই।');
      }
      return { question: structuredClone(q), hasAccess: true };
    }
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
