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
      console.error('Payment function is missing Supabase configuration');
      return respond(500, { error: 'Payment service is unavailable' });
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
    const { planId, paymentMethodId, senderNumber, transactionRef, submittedAmountBdt, receiptStoragePath, receiptFileName, receiptMimeType } = input;
    if (typeof planId !== 'string' || planId.length < 1 || planId.length > 100 ||
        typeof paymentMethodId !== 'string' || paymentMethodId.length < 1 || paymentMethodId.length > 100) {
      return respond(400, { error: 'Select a valid plan and payment method' });
    }
    if (typeof senderNumber !== 'string' || !/^[0-9+()\-\s]{7,24}$/.test(senderNumber.trim())) {
      return respond(400, { error: 'Enter a valid sender number' });
    }
    if (typeof transactionRef !== 'string' || !/^[A-Za-z0-9-]{4,64}$/.test(transactionRef.trim())) {
      return respond(400, { error: 'Enter a valid transaction reference' });
    }
    if (typeof submittedAmountBdt !== 'number' || !Number.isSafeInteger(submittedAmountBdt) || submittedAmountBdt < 1 || submittedAmountBdt > 10_000_000) {
      return respond(400, { error: 'Enter a valid payment amount' });
    }

    const hasReceipt = receiptStoragePath !== undefined || receiptFileName !== undefined || receiptMimeType !== undefined;
    if (hasReceipt) {
      const safeFileName = typeof receiptFileName === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(receiptFileName);
      const ownedPath = typeof receiptStoragePath === 'string' &&
        receiptStoragePath.startsWith(`${authData.user.id}/`) &&
        receiptStoragePath.length <= 220 && !receiptStoragePath.includes('..');
      const safeMimeType = typeof receiptMimeType === 'string' &&
        ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(receiptMimeType);
      if (!safeFileName || !ownedPath || !safeMimeType) return respond(400, { error: 'Receipt details are invalid' });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: approvedPayment, error: approvedPaymentError } = await adminClient
      .from('payments')
      .select('id')
      .eq('user_id', authData.user.id)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle();
    if (approvedPaymentError) {
      console.error('Approved payment lookup failed', approvedPaymentError);
      return respond(500, { error: 'Unable to validate this payment' });
    }
    if (approvedPayment) {
      return respond(409, { error: 'You have already made an approved payment' });
    }

    const { data: plan, error: planError } = await adminClient
      .from('plans')
      .select('id, name, name_bn, price_bdt')
      .eq('id', planId)
      .eq('is_active', true)
      .maybeSingle();
    if (planError || !plan) return respond(400, { error: 'Selected plan is unavailable' });

    const { data: method, error: methodError } = await adminClient
      .from('payment_methods')
      .select('id, name, is_active')
      .eq('id', paymentMethodId)
      .eq('is_active', true)
      .maybeSingle();
    if (methodError || !method) return respond(400, { error: 'Selected payment method is unavailable' });

    const expectedAmount = Number(plan.price_bdt);
    if (!Number.isSafeInteger(expectedAmount) || submittedAmountBdt !== expectedAmount) {
      return respond(400, { error: 'Submitted amount does not match the selected plan' });
    }

    const normalizedRef = transactionRef.trim().toUpperCase();
    const { data: duplicate, error: duplicateError } = await adminClient
      .from('payments')
      .select('id')
      .eq('payment_method_id', method.id)
      .eq('transaction_ref', normalizedRef)
      .neq('status', 'rejected')
      .limit(1);
    if (duplicateError) {
      console.error('Payment duplicate check failed', duplicateError);
      return respond(500, { error: 'Unable to validate this payment' });
    }
    if (duplicate?.length) return respond(409, { error: 'This transaction reference was already submitted' });

    const paymentId = `pay-${crypto.randomUUID()}`;
    const { data: created, error: insertError } = await adminClient
      .from('payments')
      .insert({
        id: paymentId,
        user_id: authData.user.id,
        plan_id: plan.id,
        plan_name_snapshot: plan.name_bn || plan.name,
        expected_amount_bdt: expectedAmount,
        submitted_amount_bdt: submittedAmountBdt,
        payment_method_id: method.id,
        payment_method_name_snapshot: method.name,
        sender_number: senderNumber.trim(),
        transaction_ref: normalizedRef,
        status: 'pending',
      })
      .select('id, user_id, plan_id, plan_name_snapshot, expected_amount_bdt, submitted_amount_bdt, payment_method_id, payment_method_name_snapshot, sender_number, transaction_ref, status, reviewed_by_admin_id, reviewed_at, review_note, created_at')
      .single();
    if (insertError || !created) {
      if (insertError?.code === '23505') return respond(409, { error: 'This transaction reference was already submitted' });
      console.error('Payment insert failed', insertError);
      return respond(500, { error: 'Unable to submit payment right now' });
    }

    if (hasReceipt) {
      const { error: receiptError } = await adminClient.from('payment_receipts').insert({
        payment_id: paymentId,
        user_id: authData.user.id,
        storage_path: receiptStoragePath,
        file_name: receiptFileName,
        mime_type: receiptMimeType,
      });
      if (receiptError) {
        await adminClient.from('payments').delete().eq('id', paymentId).eq('user_id', authData.user.id);
        await adminClient.storage.from('payment-receipts').remove([receiptStoragePath as string]);
        console.error('Payment receipt metadata insert failed', receiptError);
        return respond(500, { error: 'Unable to attach receipt to payment' });
      }
      created.payment_receipts = { file_name: receiptFileName, storage_path: receiptStoragePath, mime_type: receiptMimeType };
    }

    return respond(201, { payment: created });
  } catch (error) {
    console.error('Payment submission failed', error);
    return respond(400, { error: 'Invalid payment request' });
  }
});
