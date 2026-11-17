import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return respond(405, { error: 'Method not allowed' });

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return respond(401, { error: 'Authentication required' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('Payment review function is missing Supabase configuration');
      return respond(500, { error: 'Payment review is unavailable' });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return respond(401, { error: 'Invalid session' });

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > 12 * 1024) return respond(413, { error: 'Request is too large' });
    const body: unknown = JSON.parse(rawBody);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return respond(400, { error: 'Invalid request' });
    const input = body as Record<string, unknown>;
    const { paymentId, decision, reviewNote } = input;
    if (typeof paymentId !== 'string' || paymentId.length < 1 || paymentId.length > 100) {
      return respond(400, { error: 'Invalid payment' });
    }
    if (decision !== 'approved' && decision !== 'rejected') {
      return respond(400, { error: 'Choose a valid review decision' });
    }
    if (reviewNote !== undefined && (typeof reviewNote !== 'string' || reviewNote.length > 2000)) {
      return respond(400, { error: 'Review note is too long' });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: roleRow, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', authData.user.id)
      .maybeSingle();
    if (roleError) {
      console.error('Payment reviewer role lookup failed', roleError);
      return respond(500, { error: 'Unable to verify reviewer permissions' });
    }
    if (roleRow?.role !== 'admin') return respond(403, { error: 'Admin access required' });

    const { data, error } = await adminClient.rpc('review_payment_atomic', {
      p_payment_id: paymentId,
      p_admin_id: authData.user.id,
      p_decision: decision,
      p_review_note: typeof reviewNote === 'string' ? reviewNote.trim() : '',
    });
    if (error) {
      console.error('Atomic payment review failed', error);
      return respond(409, { error: 'Payment could not be reviewed; refresh and try again' });
    }

    return respond(200, { result: data });
  } catch (error) {
    console.error('Payment review request failed', error);
    return respond(400, { error: 'Invalid payment review request' });
  }
});
