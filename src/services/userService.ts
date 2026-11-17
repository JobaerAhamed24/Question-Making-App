import type { UserProfile } from '../types/domain';
import { apiRequest } from './apiClient';

export const userService = {
  getMyProfile(): Promise<{ user: UserProfile | null }> {
    return apiRequest('/auth/me');
  },

  updateMyProfile(patch: {
    fullName: string;
    phone: string;
    institution?: string;
    preferredLanguage: 'en' | 'bn';
  }): Promise<{ user: UserProfile }> {
    return apiRequest('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
};
