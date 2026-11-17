import type { Payment } from '../types/domain';
import { apiRequest } from './apiClient';

export const paymentService = {
  getMyPayments(): Promise<{ payments: Payment[] }> {
    return apiRequest('/payments');
  },

  submitManualPayment(input: {
    planId: string;
    paymentMethodId: string;
    senderNumber: string;
    transactionRef: string;
    submittedAmountBdt: number;
    receiptDataUrl?: string;
    receiptFileName?: string;
  }): Promise<{ payment: Payment }> {
    return apiRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
