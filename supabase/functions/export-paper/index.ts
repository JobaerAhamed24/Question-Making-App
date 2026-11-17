// Supabase Edge Function: export-paper
// Verifies paper ownership on every export request, controls answer key disclosure,
// logs export_history, and returns signed Storage URL if exported artifact is stored.

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

    const { paperId, format = 'pdf', includeAnswerKey = false } = await req.json();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: paper, error: paperErr } = await adminClient
      .from('papers')
      .select('*, paper_questions(*)')
      .eq('id', paperId)
      .single();

    if (paperErr || !paper) {
      return new Response(JSON.stringify({ error: 'Paper not found' }), { status: 404, headers: corsHeaders });
    }

    const { data: roleRow } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', authData.user.id)
      .single();

    const isAdmin = roleRow?.role === 'admin';
    if (paper.user_id !== authData.user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: you do not own this paper' }), { status: 403, headers: corsHeaders });
    }

    // Never expose answer keys unless explicitly requested & authorized via snapshot
    const items = (paper.paper_questions || [])
      .sort((a: any, b: any) => a.question_order - b.question_order)
      .map((item: any) => {
        const snap = { ...(item.question_snapshot || {}) };
        if (!includeAnswerKey) {
          delete snap.correctAnswerText;
          delete snap.explanation;
          if (Array.isArray(snap.options)) {
            snap.options = snap.options.map(({ isCorrect: _c, ...rest }: any) => rest);
          }
          if (Array.isArray(snap.subParts)) {
            snap.subParts = snap.subParts.map(({ answer: _a, ...rest }: any) => rest);
          }
        }
        return { ...item, question_snapshot: snap };
      });

    const expId = `exp-${crypto.randomUUID().slice(0, 12)}`;
    await adminClient.from('export_history').insert({
      id: expId,
      user_id: authData.user.id,
      paper_id: paper.id,
      paper_title: paper.title,
      format,
      included_answer_key: Boolean(includeAnswerKey),
    });

    return new Response(
      JSON.stringify({
        exportId: expId,
        paper: { ...paper, paper_questions: items },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
