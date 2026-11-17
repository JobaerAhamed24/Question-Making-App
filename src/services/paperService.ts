import type { ExportRecord, QuestionPaper, QuestionTypeCode } from '../types/domain';
import { apiRequest } from './apiClient';

export interface GenerateCustomPaperInput {
  title: string;
  examName: string;
  schoolName: string;
  schoolLogoDataUrl?: string;
  classId: string;
  groupId?: string | null;
  subjectId: string;
  chapterIds?: string[];
  topicIds?: string[];
  difficulty?: 'easy' | 'medium' | 'hard' | 'all';
  durationMinutes?: number;
  instructions?: string;
  includeStudentFields?: boolean;
  includeHeaderFooter?: boolean;
  includePageNumbers?: boolean;
  requirements?: Array<{ questionTypeCode: QuestionTypeCode; count: number }>;
  selectedQuestionIds?: string[];
  shuffle?: boolean;
}

export const paperService = {
  listMyPapers(): Promise<{ papers: QuestionPaper[] }> {
    return apiRequest('/papers');
  },

  getPaperById(paperId: string): Promise<{ paper: QuestionPaper }> {
    return apiRequest(`/papers/${encodeURIComponent(paperId)}`);
  },

  generateCustomPaper(
    input: GenerateCustomPaperInput
  ): Promise<{ paper: QuestionPaper; totalMarks: number; questionCount: number }> {
    return apiRequest('/papers/generate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  savePaper(
    input: Omit<QuestionPaper, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<{ paper: QuestionPaper }> {
    if (input.id) {
      return apiRequest(`/papers/${encodeURIComponent(input.id)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    }
    return apiRequest('/papers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  deletePaper(paperId: string): Promise<{ ok: boolean }> {
    return apiRequest(`/papers/${encodeURIComponent(paperId)}`, { method: 'DELETE' });
  },

  exportPaper(
    paperId: string,
    format: 'pdf' | 'docx',
    includeAnswerKey: boolean
  ): Promise<{ record: ExportRecord; exportPaper: QuestionPaper }> {
    return apiRequest(`/papers/${encodeURIComponent(paperId)}/export`, {
      method: 'POST',
      body: JSON.stringify({ format, includeAnswerKey }),
    });
  },

  listMyExports(): Promise<{ exports: ExportRecord[] }> {
    return apiRequest('/exports');
  },
};
