import type { Payment } from '../types/domain';
import { supabase } from '../lib/supabaseClient';
import { mapPayment } from './supabaseMappers';

function decodeDataUrl(dataUrl: string): { blob: Blob; mimeType: string } {
  const match = /^data:([\w.+-]+\/[\w.+-]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new Error('রসিদের ছবিটি সঠিকভাবে পড়া যায়নি।');
  const raw = atob(match[2]);
  const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0));
  return { blob: new Blob([bytes], { type: match[1] }), mimeType: match[1] };
}

export const paymentService = {
  async getMyPayments(): Promise<{ payments: Payment[] }> {
    const { data, error } = await supabase
      .from('payments')
      .select('*, payment_receipts(file_name,storage_path,mime_type)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { payments: (data ?? []).map(mapPayment) };
  },

  async submitManualPayment(input: {
    planId: string;
    paymentMethodId: string;
    senderNumber: string;
    transactionRef: string;
    submittedAmountBdt: number;
    receiptDataUrl?: string;
    receiptFileName?: string;
  }): Promise<{ payment: Payment }> {
    if (!Number.isFinite(input.submittedAmountBdt) || input.submittedAmountBdt <= 0) {
      throw new Error('পেমেন্টের পরিমাণ সঠিকভাবে লিখুন।');
    }
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!auth.user) throw new Error('পেমেন্ট জমা দিতে লগইন করুন।');

    let receiptStoragePath: string | undefined;
    let receiptFileName: string | undefined;
    let receiptMimeType: string | undefined;
    if (input.receiptDataUrl) {
      const { blob, mimeType } = decodeDataUrl(input.receiptDataUrl);
      receiptMimeType = mimeType;
      if (!['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(mimeType)) {
        throw new Error('PNG, JPG, WebP অথবা PDF রসিদ আপলোড করুন।');
      }
      if (blob.size > 5 * 1024 * 1024) throw new Error('রসিদ ৫ MB-এর কম হতে হবে।');
      receiptFileName = (input.receiptFileName || 'receipt').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 100);
      receiptStoragePath = `${auth.user.id}/${crypto.randomUUID()}-${receiptFileName}`;
      const { error } = await supabase.storage.from('payment-receipts').upload(receiptStoragePath, blob, {
        contentType: mimeType,
        upsert: false,
      });
      if (error) throw error;
    }

    const { data, error } = await supabase.functions.invoke('submit-payment', {
      body: {
        planId: input.planId,
        paymentMethodId: input.paymentMethodId,
        senderNumber: input.senderNumber.trim(),
        transactionRef: input.transactionRef.trim(),
        submittedAmountBdt: input.submittedAmountBdt,
        receiptStoragePath,
        receiptFileName,
        receiptMimeType,
      },
    });
    if (error) throw error;
    if (!data?.payment) throw new Error('পেমেন্ট জমা দেওয়া যায়নি।');
    return { payment: mapPayment(data.payment) };
  },
};
