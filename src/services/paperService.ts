import type { ExportRecord, Question, QuestionPaper, QuestionPaperItem, QuestionTypeCode } from '../types/domain';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { mockDb } from '../lib/mockDb';
import { canUserAddQuestionToPaper } from '../lib/rules';
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

function snapshotFromQuestion(q: Question, orderIndex: number): QuestionPaperItem {
  return {
    id: mockDb.uid('pi'),
    sourceQuestionId: q.id,
    orderIndex,
    customMarks: q.marks,
    snapshot: {
      classId: q.classId,
      subjectId: q.subjectId,
      chapterId: q.chapterId,
      questionTypeCode: q.questionTypeCode,
      language: q.language,
      prompt: q.prompt,
      stimulus: q.stimulus,
      equationLatex: q.equationLatex,
      imageUrl: q.imageUrl,
      options: q.options ? structuredClone(q.options) : undefined,
      subParts: q.subParts ? structuredClone(q.subParts) : undefined,
      correctAnswerText: q.correctAnswerText,
      explanation: q.explanation,
    },
  };
}

export const paperService = {
  async listMyPapers(): Promise<{ papers: QuestionPaper[] }> {
    if (!isSupabaseConfigured) {
      const user = mockDb.getCurrentUser();
      if (!user) return { papers: [] };
      const papers = mockDb
        .getState()
        .papers.filter((p) => p.userId === user.id || user.role === 'admin')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return { papers: structuredClone(papers) };
    }
    const { data, error } = await supabase.from('papers').select('*, paper_questions(*)').order('updated_at', { ascending: false });
    if (error) throw error;
    return { papers: (data ?? []).map(mapPaper) };
  },

  async getPaperById(paperId: string): Promise<{ paper: QuestionPaper }> {
    if (!isSupabaseConfigured) {
      const user = mockDb.getCurrentUser();
      if (!user) throw new Error('লগইন করুন।');
      const paper = mockDb.getState().papers.find((p) => p.id === paperId);
      if (!paper || (paper.userId !== user.id && user.role !== 'admin')) {
        throw new Error('প্রশ্নপত্রটি পাওয়া যায়নি।');
      }
      return { paper: structuredClone(paper) };
    }
    const { data, error } = await supabase.from('papers').select('*, paper_questions(*)').eq('id', paperId).single();
    if (error) throw error;
    return { paper: mapPaper(data) };
  },

  async generateCustomPaper(input: GenerateCustomPaperInput): Promise<{ paper: QuestionPaper; totalMarks: number; questionCount: number }> {
    if (!isSupabaseConfigured) {
      const user = mockDb.getCurrentUser();
      if (!user) throw new Error('প্রশ্নপত্র তৈরি করতে লগইন করুন।');
      const state = mockDb.getState();
      if (!canUserAddQuestionToPaper(state.subscriptions, user.id, user.role, input.classId)) {
        throw new Error('নির্বাচিত শ্রেণিতে সক্রিয় সাবস্ক্রিপশন নেই।');
      }

      const pool = state.questions.filter((q) => {
        if (q.status !== 'published') return false;
        if (q.classId !== input.classId) return false;
        if (input.subjectId && q.subjectId !== input.subjectId) return false;
        if (input.chapterIds?.length && !input.chapterIds.includes(q.chapterId)) return false;
        if (input.topicIds?.length && (!q.topicId || !input.topicIds.includes(q.topicId))) return false;
        if (input.difficulty && input.difficulty !== 'all' && q.difficulty !== input.difficulty) return false;
        return true;
      });

      let chosen: Question[] = [];
      if (input.selectedQuestionIds?.length) {
        const byId = new Map(pool.map((q) => [q.id, q]));
        chosen = input.selectedQuestionIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
      } else if (input.requirements?.length) {
        for (const req of input.requirements) {
          if (req.count <= 0) continue;
          const matching = pool.filter((q) => q.questionTypeCode === req.questionTypeCode);
          if (input.shuffle) {
            matching.sort(() => Math.random() - 0.5);
          }
          chosen.push(...matching.slice(0, req.count));
        }
      } else {
        chosen = [...pool];
      }

      if (chosen.length === 0) {
        throw new Error('নির্বাচিত শর্ত অনুযায়ী প্রশ্নব্যাংকে কোনো প্রশ্ন পাওয়া যায়নি।');
      }

      const now = new Date().toISOString();
      const items = chosen.map((q, idx) => snapshotFromQuestion(q, idx));
      const paper: QuestionPaper = {
        id: mockDb.uid('paper'),
        userId: user.id,
        title: input.title.trim() || 'কাস্টম প্রশ্নপত্র',
        examName: input.examName.trim() || 'মূল্যায়ন পরীক্ষা',
        classId: input.classId,
        subjectId: input.subjectId,
        schoolName: input.schoolName.trim() || 'মডেল স্কুল',
        schoolLogoDataUrl: input.schoolLogoDataUrl,
        examDate: now.slice(0, 10),
        durationMinutes: input.durationMinutes ?? Math.max(30, items.length * 5),
        instructions: input.instructions?.trim() || 'সকল প্রশ্নের উত্তর দাও।',
        includeStudentFields: input.includeStudentFields ?? true,
        includeHeaderFooter: input.includeHeaderFooter ?? true,
        includePageNumbers: input.includePageNumbers ?? true,
        items,
        createdAt: now,
        updatedAt: now,
      };
      state.papers.unshift(paper);
      mockDb.save();
      mockDb.logActivity(user, 'paper.generate', 'paper', paper.id, `${paper.title} (${items.length} প্রশ্ন)`);
      return {
        paper: structuredClone(paper),
        totalMarks: items.reduce((sum, item) => sum + item.customMarks, 0),
        questionCount: items.length,
      };
    }
    const { data, error } = await supabase.functions.invoke('generate-paper', { body: input });
    if (error) throw error;
    const paper = mapPaper({ ...data.paper, paper_questions: data.items });
    return { paper, totalMarks: paper.items.reduce((total, item) => total + item.customMarks, 0), questionCount: paper.items.length };
  },

  async savePaper(input: Omit<QuestionPaper, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<{ paper: QuestionPaper }> {
    if (!isSupabaseConfigured) {
      const user = mockDb.getCurrentUser();
      if (!user) throw new Error('প্রশ্নপত্র সংরক্ষণ করতে লগইন করুন।');
      const state = mockDb.getState();
      const now = new Date().toISOString();
      const idx = input.id ? state.papers.findIndex((p) => p.id === input.id) : -1;
      if (idx !== -1) {
        const existing = state.papers[idx];
        if (existing.userId !== user.id && user.role !== 'admin') {
          throw new Error('অনুমতি নেই।');
        }
        const existingSourceIds = new Set(existing.items.map((item) => item.sourceQuestionId));
        const addedNewQuestion = input.items.some((item) => item.sourceQuestionId && !existingSourceIds.has(item.sourceQuestionId));
        if (addedNewQuestion && !canUserAddQuestionToPaper(state.subscriptions, user.id, user.role, input.classId)) {
          throw new Error('সাবস্ক্রিপশন মেয়াদ শেষ। সংরক্ষিত প্রশ্নপত্রের প্রশ্ন পরিবর্তন করতে সক্রিয় সাবস্ক্রিপশন প্রয়োজন।');
        }
        const updated: QuestionPaper = {
          ...existing,
          ...structuredClone(input),
          id: existing.id,
          userId: existing.userId,
          updatedAt: now,
        };
        state.papers[idx] = updated;
        mockDb.save();
        return { paper: structuredClone(updated) };
      }

      if (input.items.length > 0 && !canUserAddQuestionToPaper(state.subscriptions, user.id, user.role, input.classId)) {
        throw new Error('প্রশ্নব্যাংকের প্রশ্ন দিয়ে নতুন প্রশ্নপত্র তৈরি করতে এই শ্রেণির সক্রিয় সাবস্ক্রিপশন প্রয়োজন।');
      }
      const created: QuestionPaper = {
        ...structuredClone(input),
        id: input.id || mockDb.uid('paper'),
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      };
      state.papers.unshift(created);
      mockDb.save();
      mockDb.logActivity(user, 'paper.save', 'paper', created.id, created.title);
      return { paper: structuredClone(created) };
    }
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
    if (!isSupabaseConfigured) {
      const user = mockDb.getCurrentUser();
      if (!user) throw new Error('লগইন করুন।');
      const state = mockDb.getState();
      const target = state.papers.find((p) => p.id === paperId);
      if (target && target.userId !== user.id && user.role !== 'admin') {
        throw new Error('অনুমতি নেই।');
      }
      state.papers = state.papers.filter((p) => p.id !== paperId);
      mockDb.save();
      return { ok: true };
    }
    const { error } = await supabase.from('papers').delete().eq('id', paperId);
    if (error) throw error;
    return { ok: true };
  },

  async exportPaper(paperId: string, format: 'pdf' | 'docx', includeAnswerKey: boolean): Promise<{ record: ExportRecord; exportPaper: QuestionPaper }> {
    if (!isSupabaseConfigured) {
      const user = mockDb.getCurrentUser();
      if (!user) throw new Error('লগইন করুন।');
      const state = mockDb.getState();
      const paper = state.papers.find((p) => p.id === paperId);
      if (!paper) throw new Error('প্রশ্নপত্রটি পাওয়া যায়নি।');
      if (paper.userId !== user.id && user.role !== 'admin') {
        throw new Error('অনুমতি নেই।');
      }
      const record: ExportRecord = {
        id: mockDb.uid('exp'),
        userId: user.id,
        paperId: paper.id,
        paperTitle: paper.title,
        format,
        includedAnswerKey: includeAnswerKey,
        createdAt: new Date().toISOString(),
      };
      state.exports.unshift(record);
      mockDb.save();
      mockDb.logActivity(user, 'paper.export', 'paper', paper.id, `${paper.title} (${format.toUpperCase()})`);
      return { record, exportPaper: structuredClone(paper) };
    }
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
    if (!isSupabaseConfigured) {
      const user = mockDb.getCurrentUser();
      if (!user) return { exports: [] };
      const exports = mockDb
        .getState()
        .exports.filter((e) => e.userId === user.id || user.role === 'admin')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { exports: structuredClone(exports) };
    }
    const { data, error } = await supabase.from('export_history').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return { exports: (data ?? []).map(mapExport) };
  },
};
