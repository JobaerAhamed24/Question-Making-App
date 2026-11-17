import type {
  AcademicClass,
  AcademicGroup,
  ActivityLog,
  Chapter,
  FaqItem,
  Notice,
  Payment,
  PaymentMethod,
  Plan,
  Question,
  SiteSettings,
  Subject,
  Subscription,
  Topic,
  UserRole,
} from '../types/domain';
import type { AppDatabaseState } from '../data/seedData';
import { apiRequest } from './apiClient';

export const adminService = {
  getSnapshot(): Promise<Omit<AppDatabaseState, 'passwordsByUserId'>> {
    return apiRequest('/admin/snapshot');
  },

  addClass(input: Omit<AcademicClass, 'id'>): Promise<AcademicClass> {
    return apiRequest('/admin/academic/classes', { method: 'POST', body: JSON.stringify(input) });
  },

  addGroup(input: Omit<AcademicGroup, 'id'>): Promise<AcademicGroup> {
    return apiRequest('/admin/academic/groups', { method: 'POST', body: JSON.stringify(input) });
  },

  addSubject(input: Omit<Subject, 'id'>): Promise<Subject> {
    return apiRequest('/admin/academic/subjects', { method: 'POST', body: JSON.stringify(input) });
  },

  addChapter(input: Omit<Chapter, 'id'>): Promise<Chapter> {
    return apiRequest('/admin/academic/chapters', { method: 'POST', body: JSON.stringify(input) });
  },

  addTopic(input: Omit<Topic, 'id'>): Promise<Topic> {
    return apiRequest('/admin/academic/topics', { method: 'POST', body: JSON.stringify(input) });
  },

  saveQuestion(
    input: Omit<Question, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<Question> {
    if (input.id) {
      return apiRequest(`/admin/questions/${encodeURIComponent(input.id)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    }
    return apiRequest('/admin/questions', { method: 'POST', body: JSON.stringify(input) });
  },

  deleteQuestion(questionId: string): Promise<{ ok: boolean }> {
    return apiRequest(`/admin/questions/${encodeURIComponent(questionId)}`, { method: 'DELETE' });
  },

  bulkImportQuestions(
    items: Array<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ importedCount: number }> {
    return apiRequest('/admin/questions/bulk', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  savePlan(input: Omit<Plan, 'id'> & { id?: string }): Promise<Plan> {
    if (input.id) {
      return apiRequest(`/admin/plans/${encodeURIComponent(input.id)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    }
    return apiRequest('/admin/plans', { method: 'POST', body: JSON.stringify(input) });
  },

  savePaymentMethod(input: Omit<PaymentMethod, 'id'> & { id?: string }): Promise<PaymentMethod> {
    if (input.id) {
      return apiRequest(`/admin/payment-methods/${encodeURIComponent(input.id)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    }
    return apiRequest('/admin/payment-methods', { method: 'POST', body: JSON.stringify(input) });
  },

  reviewPayment(
    paymentId: string,
    decision: 'approved' | 'rejected',
    reviewNote: string
  ): Promise<{ payment: Payment; subscription?: Subscription }> {
    return apiRequest(`/admin/payments/${encodeURIComponent(paymentId)}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, reviewNote }),
    });
  },

  manualActivateSubscription(userId: string, planId: string): Promise<Subscription> {
    return apiRequest('/admin/subscriptions/activate', {
      method: 'POST',
      body: JSON.stringify({ userId, planId }),
    });
  },

  updateSubscriptionStatus(subscriptionId: string, status: Subscription['status']): Promise<{ ok: boolean }> {
    return apiRequest(`/admin/subscriptions/${encodeURIComponent(subscriptionId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<{ ok: boolean }> {
    return apiRequest(`/admin/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  updateUserRole(userId: string, role: UserRole): Promise<{ ok: boolean }> {
    return apiRequest(`/admin/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  updateSiteSettings(settings: SiteSettings): Promise<SiteSettings> {
    return apiRequest('/admin/site-settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  saveNotice(input: Omit<Notice, 'id' | 'createdAt'> & { id?: string }): Promise<Notice> {
    return apiRequest('/admin/notices', { method: 'POST', body: JSON.stringify(input) });
  },

  saveFaq(input: Omit<FaqItem, 'id'> & { id?: string }): Promise<FaqItem> {
    return apiRequest('/admin/faqs', { method: 'POST', body: JSON.stringify(input) });
  },

  resolveContactMessage(messageId: string): Promise<{ ok: boolean }> {
    return apiRequest(`/admin/contact-messages/${encodeURIComponent(messageId)}/resolve`, {
      method: 'PATCH',
    });
  },

  getActivityLogs(): Promise<{ logs: ActivityLog[] }> {
    return apiRequest('/admin/activity-logs');
  },

  getReports(): Promise<{
    totalUsers: number;
    totalQuestions: number;
    publishedQuestions: number;
    totalPapers: number;
    totalExports: number;
    pendingPayments: number;
    approvedRevenueBdt: number;
  }> {
    return apiRequest('/admin/reports');
  },
};
