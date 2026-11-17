// Supabase Edge Function: generate-paper
// Generates customized exam papers exclusively from published, class-authorized questions.
// Never duplicates questions, fails explicitly if insufficient matching questions exist,
// calculates total marks server-side, and stores immutable question snapshots.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData } = await userClient.auth.getUser();
    if (!authData.user) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const {
      title,
      examName,
      schoolName,
      classId,
      groupId,
      subjectId,
      chapterIds,
      difficulty,
      durationMinutes,
      instructions,
      requirements,
    } = body;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify class entitlement server-side
    const { data: hasAccess } = await adminClient.rpc('has_active_class_access', {
      check_user_id: authData.user.id,
      target_class_id: classId,
    });

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: active subscription required for the selected class' }),
        { status: 403, headers: corsHeaders }
      );
    }

    let query = adminClient
      .from('questions')
      .select('*, question_options(*), question_answers(*), question_subparts(*), question_stimuli(*)')
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .eq('status', 'published');

    if (groupId) query = query.eq('group_id', groupId);
    if (Array.isArray(chapterIds) && chapterIds.length > 0) query = query.in('chapter_id', chapterIds);
    if (difficulty && difficulty !== 'all') query = query.eq('difficulty', difficulty);

    const { data: pool, error: poolErr } = await query;
    if (poolErr) return new Response(JSON.stringify({ error: poolErr.message }), { status: 400, headers: corsHeaders });

    const pickedIds = new Set<string>();
    const chosen: any[] = [];

    for (const reqItem of requirements || []) {
      const needed = Math.max(0, Number(reqItem.count || 0));
      if (needed === 0) continue;
      const candidates = (pool || []).filter(
        (q: any) => q.question_type_code === reqItem.questionTypeCode && !pickedIds.has(q.id)
      );
      if (candidates.length < needed) {
        return new Response(
          JSON.stringify({
            error: `Insufficient ${reqItem.questionTypeCode} questions: requested ${needed}, available ${candidates.length}`,
          }),
          { status: 422, headers: corsHeaders }
        );
      }
      for (let i = 0; i < needed; i++) {
        pickedIds.add(candidates[i].id);
        chosen.push(candidates[i]);
      }
    }

    const totalMarks = chosen.reduce((sum, q) => sum + Number(q.marks), 0);
    const paperId = `paper-${crypto.randomUUID().slice(0, 12)}`;

    const { data: createdPaper, error: paperErr } = await adminClient
      .from('papers')
      .insert({
        id: paperId,
        user_id: authData.user.id,
        title: title || 'Custom Examination Paper',
        exam_name: examName || 'Evaluation Exam',
        school_name: schoolName || 'Model Academy',
        class_id: classId,
        group_id: groupId || null,
        subject_id: subjectId,
        duration: Number(durationMinutes) || 60,
        instructions: instructions || '',
        total_marks: totalMarks,
        status: 'saved',
      })
      .select()
      .single();

    if (paperErr) return new Response(JSON.stringify({ error: paperErr.message }), { status: 400, headers: corsHeaders });

    const paperItems = chosen.map((q, index) => ({
      id: `pi-${crypto.randomUUID().slice(0, 10)}`,
      paper_id: paperId,
      question_id: q.id,
      question_order: index,
      custom_marks: Number(q.marks),
      question_snapshot: {
        classId: q.class_id,
        subjectId: q.subject_id,
        chapterId: q.chapter_id,
        questionTypeCode: q.question_type_code,
        language: q.language,
        prompt: q.question_text,
        stimulus: q.question_stimuli?.stimulus_text,
        equationLatex: q.equation_latex,
        imageUrl: q.question_image,
        options: q.question_options,
        subParts: q.question_subparts,
        correctAnswerText: q.question_answers?.correct_answer_text,
        explanation: q.question_answers?.explanation,
      },
    }));

    if (paperItems.length > 0) {
      await adminClient.from('paper_questions').insert(paperItems);
    }

    return new Response(JSON.stringify({ paper: createdPaper, items: paperItems }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
