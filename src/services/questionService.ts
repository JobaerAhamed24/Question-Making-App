import type { PublicSafeQuestion, Question } from '../types/domain';
import { apiRequest } from './apiClient';

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
}

export interface PaginatedQuestionsResponse {
  items: Question[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const questionService = {
  listPaginatedQuestions(filters: QuestionQueryFilters = {}): Promise<PaginatedQuestionsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') {
        params.set(k, String(v));
      }
    });
    const qs = params.toString();
    return apiRequest(`/questions${qs ? `?${qs}` : ''}`);
  },

  getQuestionById(
    questionId: string
  ): Promise<{ question: Question | PublicSafeQuestion; hasAccess: boolean }> {
    return apiRequest(`/questions/${encodeURIComponent(questionId)}`);
  },
};
