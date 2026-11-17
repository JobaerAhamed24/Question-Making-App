import type { UserProfile } from '../types/domain';
import { apiRequest } from './apiClient';

export const authService = {
  getSessionUser(): Promise<{ user: UserProfile | null }> {
    return apiRequest('/auth/me');
  },

  login(email: string, password: string): Promise<{ user: UserProfile }> {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  quickDemoLogin(userId: string): Promise<{ user: UserProfile }> {
    return apiRequest('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  register(input: {
    fullName: string;
    email: string;
    phone: string;
    institution?: string;
    preferredLanguage: 'en' | 'bn';
    password: string;
  }): Promise<{ user: UserProfile }> {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  logout(): Promise<{ ok: boolean }> {
    return apiRequest('/auth/logout', { method: 'POST' });
  },

  forgotPassword(email: string): Promise<{ ok: boolean; message: string }> {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(token: string, password: string): Promise<{ ok: boolean }> {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },
};
