import type { Subscription } from '../types/domain';
import { apiRequest } from './apiClient';

export const subscriptionService = {
  getMySubscriptions(): Promise<{ subscriptions: Subscription[] }> {
    return apiRequest('/subscriptions');
  },

  getMyPermittedClassIds(): Promise<{ permittedClassIds: string[] }> {
    return apiRequest('/subscriptions/permitted-classes');
  },
};
