import type { ExportRecord, QuestionPaper, QuestionTypeCode } from '../types/domain';
import { supabase } from '../lib/supabaseClient';
import { mapExport, mapPaper } from './supabaseMappers';

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
  async listMyPapers(): Promise<{ papers: QuestionPaper[] }> {
    const { data, error } = await supabase.from('papers').select('*, paper_questions(*)').order('updated_at', { ascending: false });
    if (error) throw error;
    return { papers: (data ?? []).map(mapPaper) };
  },

  async getPaperById(paperId: string): Promise<{ paper: QuestionPaper }> {
    const { data, error } = await supabase.from('papers').select('*, paper_questions(*)').eq('id', paperId).single();
    if (error) throw error;
    return { paper: mapPaper(data) };
  },

  async generateCustomPaper(input: GenerateCustomPaperInput): Promise<{ paper: QuestionPaper; totalMarks: number; questionCount: number }> {
    const { data, error } = await supabase.functions.invoke('generate-paper', { body: input });
    if (error) throw error;
    const paper = mapPaper({ ...data.paper, paper_questions: data.items });
    return { paper, totalMarks: paper.items.reduce((total, item) => total + item.customMarks, 0), questionCount: paper.items.length };
  },

  async savePaper(input: Omit<QuestionPaper, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<{ paper: QuestionPaper }> {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!auth.user) throw new Error('প্রশ্নপত্র সংরক্ষণ করতে লগইন করুন।');

    const now = new Date().toISOString();
    const id = input.id || `paper-${crypto.randomUUID()}`;
    const { data: existing, error: existingError } = input.id
      ? await supabase.from('papers').select('*, paper_questions(*)').eq('id', id).single()
      : { data: null, error: null };
    if (existingError) throw existingError;
    const row = {
      id,
      user_id: auth.user.id,
      title: input.title.trim(),
      exam_name: input.examName.trim(),
      school_name: input.schoolName.trim(),
      school_logo_path: input.schoolLogoDataUrl || null,
      class_id: input.classId,
      subject_id: input.subjectId,
      exam_date: input.examDate,
      duration: input.durationMinutes,
      instructions: input.instructions,
      total_marks: input.items.reduce((total, item) => total + Number(item.customMarks), 0),
      include_student_fields: input.includeStudentFields,
      include_header_footer: input.includeHeaderFooter,
      include_page_numbers: input.includePageNumbers,
      status: 'saved',
      updated_at: now,
    };
    const { error: paperError } = existing
      ? await supabase.from('papers').update(row).eq('id', id)
      : await supabase.from('papers').insert(row);
    if (paperError) throw paperError;

    const existingItems: Array<{ questionId: string | null; order: number; marks: number; snapshot: string }> =
      (existing?.paper_questions ?? []).map((item: Record<string, unknown>) => ({
        questionId: typeof item.question_id === 'string' ? item.question_id : null,
        order: Number(item.question_order),
        marks: Number(item.custom_marks),
        snapshot: JSON.stringify(item.question_snapshot),
      }));
    const newItems = input.items.map((item) => ({
      questionId: item.sourceQuestionId || null,
      order: item.orderIndex,
      marks: Number(item.customMarks),
      snapshot: JSON.stringify(item.snapshot),
    }));
    const unchanged = existingItems.length === newItems.length && existingItems.every((item, index) =>
      item.questionId === newItems[index]?.questionId && item.order === newItems[index]?.order &&
      item.marks === newItems[index]?.marks && item.snapshot === newItems[index]?.snapshot
    );
    const { data: activeAccess, error: accessError } = await supabase.rpc('has_active_class_access', {
      check_user_id: auth.user.id,
      target_class_id: input.classId,
    });
    if (accessError) throw accessError;
    if (!activeAccess && existing && !unchanged) {
      throw new Error('সাবস্ক্রিপশন মেয়াদ শেষ। সংরক্ষিত প্রশ্নপত্রের প্রশ্ন পরিবর্তন করতে সক্রিয় সাবস্ক্রিপশন প্রয়োজন।');
    }
    if (!existing || activeAccess) {
      const { error: deleteError } = await supabase.from('paper_questions').delete().eq('paper_id', id);
      if (deleteError) throw deleteError;
      if (input.items.length) {
        const { error } = await supabase.from('paper_questions').insert(input.items.map((item, index) => ({
          id: item.id || `pi-${crypto.randomUUID()}`,
          paper_id: id,
          question_id: item.sourceQuestionId || null,
          question_order: index,
          custom_marks: Number(item.customMarks),
          question_snapshot: item.snapshot,
        })));
        if (error) throw error;
      }
    }
    return this.getPaperById(id);
  },

  async deletePaper(paperId: string): Promise<{ ok: boolean }> {
    const { error } = await supabase.from('papers').delete().eq('id', paperId);
    if (error) throw error;
    return { ok: true };
  },

  async exportPaper(paperId: string, format: 'pdf' | 'docx', includeAnswerKey: boolean): Promise<{ record: ExportRecord; exportPaper: QuestionPaper }> {
    const { data, error } = await supabase.functions.invoke('export-paper', { body: { paperId, format, includeAnswerKey } });
    if (error) throw error;
    const paper = mapPaper(data.paper);
    const record: ExportRecord = {
      id: String(data.exportId), userId: paper.userId, paperId: paper.id, paperTitle: paper.title,
      format, includedAnswerKey: includeAnswerKey, createdAt: new Date().toISOString(),
    };
    return { record, exportPaper: paper };
  },

  async listMyExports(): Promise<{ exports: ExportRecord[] }> {
    const { data, error } = await supabase.from('export_history').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return { exports: (data ?? []).map(mapExport) };
  },
};
