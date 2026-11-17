// Supabase Edge Function: submit-payment
// Validates plan & payment method server-side, prevents duplicate transaction references,
// creates a pending manual payment record without ever letting client specify status or expected price.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData.user) {
      return new Response(JSON.stringify({ error: 'Invalid session token' }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { planId, paymentMethodId, senderNumber, transactionRef, submittedAmountBdt, receiptStoragePath, receiptFileName } = body;

    if (!planId || !paymentMethodId || !senderNumber || !transactionRef || !Number(submittedAmountBdt)) {
      return new Response(JSON.stringify({ error: 'Incomplete payment details' }), { status: 400, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: plan, error: planErr } = await adminClient
      .from('plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();
    if (planErr || !plan) {
      return new Response(JSON.stringify({ error: 'Selected plan is unavailable or inactive' }), { status: 400, headers: corsHeaders });
    }

    const { data: method, error: methodErr } = await adminClient
      .from('payment_methods')
      .select('*')
      .eq('id', paymentMethodId)
      .eq('is_active', true)
      .single();
    if (methodErr || !method) {
      return new Response(JSON.stringify({ error: 'Selected payment method is invalid' }), { status: 400, headers: corsHeaders });
    }

    const normalizedRef = String(transactionRef).trim().toUpperCase();
    const { data: dupes } = await adminClient
      .from('payments')
      .select('id, status')
      .eq('payment_method_id', paymentMethodId)
      .neq('status', 'rejected')
      .ilike('transaction_ref', normalizedRef);

    if (dupes && dupes.length > 0) {
      return new Response(JSON.stringify({ error: 'Duplicate transaction reference for this payment method' }), { status: 409, headers: corsHeaders });
    }

    const paymentId = `pay-${crypto.randomUUID().slice(0, 12)}`;
    const { data: created, error: insertErr } = await adminClient
      .from('payments')
      .insert({
        id: paymentId,
        user_id: authData.user.id,
        plan_id: plan.id,
        plan_name_snapshot: plan.name_bn || plan.name,
        expected_amount_bdt: plan.price_bdt,
        submitted_amount_bdt: Number(submittedAmountBdt),
        payment_method_id: method.id,
        payment_method_name_snapshot: method.name,
        sender_number: String(senderNumber).trim(),
        transaction_ref: normalizedRef,
        status: 'pending',
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 400, headers: corsHeaders });
    }

    if (receiptStoragePath && receiptFileName) {
      await adminClient.from('payment_receipts').insert({
        payment_id: paymentId,
        user_id: authData.user.id,
        storage_path: receiptStoragePath,
        file_name: receiptFileName,
      });
    }

    return new Response(JSON.stringify({ payment: created }), {
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
