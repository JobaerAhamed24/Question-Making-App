import type { UserProfile } from '../types/domain';
import { isSupabaseConfigured, supabase, SUPABASE_URL } from '../lib/supabaseClient';
import { mockDb } from '../lib/mockDb';
import { mapUser } from './supabaseMappers';

const redirectUrl = () =>
  (import.meta.env as ImportMetaEnv & { NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL?: string })
    .NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`;

async function profileFor(userId: string): Promise<UserProfile | null> {
  const [{ data: profile, error: profileError }, { data: role, error: roleError }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
  ]);
  if (profileError) throw profileError;
  if (roleError) throw roleError;
  return profile ? mapUser(profile, role) : null;
}

function authError(error: { code?: string; message: string }): Error {
  if (error.code === 'invalid_credentials' || error.code === 'user_not_found') {
    return new Error('ইমেইল বা পাসওয়ার্ড সঠিক নয়।');
  }
  if (error.code === 'email_not_confirmed') {
    return new Error('লগইন করার আগে ইমেইল যাচাই করুন।');
  }
  if (error.code === 'weak_password' || error.code === 'password_too_short') {
    return new Error('পাসওয়ার্ডটি আরও শক্তিশালী করুন।');
  }
  if (error.code === 'over_email_send_rate_limit' || error.code === 'too_many_requests') {
    return new Error('অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।');
  }
  return new Error(error.message || 'অনুরোধটি সম্পন্ন করা যায়নি।');
}

const QUICK_ADMIN_FLAG = 'qb_quick_admin_session_v1';

export const authService = {
  async getSessionUser(): Promise<{ user: UserProfile | null }> {
    if (!isSupabaseConfigured) return { user: mockDb.getCurrentUser() };
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) {
      if (typeof window !== 'undefined' && window.localStorage.getItem(QUICK_ADMIN_FLAG) === '1') {
        return { user: mockDb.getCurrentUser() };
      }
      return { user: null };
    }

    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user: data.user ? await profileFor(data.user.id) : null };
  },

  async loginAsQuickAdmin(): Promise<{ user: UserProfile }> {
    const state = mockDb.getState();
    let adminUser =
      state.users.find((u) => u.role === 'admin' && u.status === 'active') ||
      state.users.find((u) => u.role === 'admin');
    if (!adminUser) {
      adminUser = {
        id: 'user-quick-admin',
        fullName: 'সুপার অ্যাডমিন',
        email: 'admin@prashnabank.bd',
        phone: '01700000000',
        institution: 'প্রশ্নব্যাংক এডমিন',
        preferredLanguage: 'bn',
        role: 'admin',
        status: 'active',
        emailVerified: true,
        createdAt: new Date().toISOString(),
      };
      state.users.unshift(adminUser);
      mockDb.save();
    }
    mockDb.setCurrentUserId(adminUser.id);
    try {
      window.localStorage.setItem(QUICK_ADMIN_FLAG, '1');
    } catch {
      // ignore storage errors
    }
    mockDb.logActivity(adminUser, 'admin.quick_access', 'user', adminUser.id, 'দ্রুত অ্যাডমিন অ্যাক্সেস চালু করা হয়েছে');
    return { user: adminUser };
  },

  async login(email: string, password: string): Promise<{ user: UserProfile }> {
    if (!isSupabaseConfigured) {
      const state = mockDb.getState();
      const normalized = email.trim().toLowerCase();
      const user = state.users.find((u) => u.email.trim().toLowerCase() === normalized);
      if (!user || state.passwordsByUserId[user.id] !== password) {
        throw new Error('ইমেইল বা পাসওয়ার্ড সঠিক নয়।');
      }
      if (user.status === 'suspended') {
        throw new Error('এই অ্যাকাউন্টটি স্থগিত করা হয়েছে। সাপোর্টে যোগাযোগ করুন।');
      }
      mockDb.setCurrentUserId(user.id);
      mockDb.logActivity(user, 'user.login', 'user', user.id, `${user.email} লগইন করেছেন`);
      return { user };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw authError(error);
    if (!data.user) throw new Error('লগইন সম্পন্ন হয়নি।');
    const user = await profileFor(data.user.id);
    if (!user) throw new Error('আপনার প্রোফাইল পাওয়া যায়নি। সাপোর্টে যোগাযোগ করুন।');
    if (user.status === 'suspended') {
      await supabase.auth.signOut();
      throw new Error('এই অ্যাকাউন্টটি স্থগিত করা হয়েছে। সাপোর্টে যোগাযোগ করুন।');
    }
    return { user };
  },

  async register(input: {
    fullName: string;
    email: string;
    phone: string;
    institution?: string;
    preferredLanguage: 'en' | 'bn';
    password: string;
  }): Promise<{ user: UserProfile }> {
    if (!isSupabaseConfigured) {
      const state = mockDb.getState();
      const normalized = input.email.trim().toLowerCase();
      if (state.users.some((u) => u.email.trim().toLowerCase() === normalized)) {
        throw new Error('এই ইমেইল ঠিকানাটি ইতিমধ্যেই নিবন্ধিত আছে।');
      }
      const user: UserProfile = {
        id: mockDb.uid('u'),
        fullName: input.fullName.trim(),
        email: normalized,
        phone: input.phone.trim(),
        institution: input.institution?.trim() || undefined,
        role: 'student',
        status: 'active',
        emailVerified: true,
        preferredLanguage: input.preferredLanguage,
        createdAt: new Date().toISOString(),
      };
      state.users.unshift(user);
      state.passwordsByUserId[user.id] = input.password;
      mockDb.save();
      mockDb.logActivity(user, 'user.register', 'user', user.id, `${user.email} নিবন্ধন করেছেন`);
      return { user };
    }
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: redirectUrl(),
        data: {
          full_name: input.fullName.trim(),
          phone: input.phone.trim(),
          institution: input.institution?.trim() || null,
          preferred_language: input.preferredLanguage,
        },
      },
    });
    if (error) throw authError(error);
    if (!data.user) throw new Error('অ্যাকাউন্ট তৈরি করা যায়নি।');
    const user = await profileFor(data.user.id);
    if (user) return { user };
    return {
      user: {
        id: data.user.id,
        fullName: input.fullName.trim(),
        email: input.email,
        phone: input.phone.trim(),
        institution: input.institution,
        role: 'student',
        status: 'active',
        emailVerified: false,
        preferredLanguage: input.preferredLanguage,
        createdAt: data.user.created_at || new Date().toISOString(),
      },
    };
  },

  async logout(): Promise<{ ok: boolean }> {
    try {
      window.localStorage.removeItem(QUICK_ADMIN_FLAG);
    } catch {
      // ignore storage errors
    }
    if (!isSupabaseConfigured) {
      mockDb.setCurrentUserId(null);
      return { ok: true };
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { ok: true };
  },

  async forgotPassword(email: string): Promise<{ ok: boolean; message: string }> {
    if (!isSupabaseConfigured) {
      void email;
      return { ok: true, message: 'যদি এই ইমেইলে অ্যাকাউন্ট থাকে, রিসেট লিংক পাঠানো হয়েছে।' };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
    if (error) throw authError(error);
    return { ok: true, message: 'যদি এই ইমেইলে অ্যাকাউন্ট থাকে, রিসেট লিংক পাঠানো হয়েছে।' };
  },

  async resetPassword(_token: string, password: string): Promise<{ ok: boolean }> {
    if (!isSupabaseConfigured) {
      const user = mockDb.getCurrentUser();
      if (user) {
        mockDb.getState().passwordsByUserId[user.id] = password;
        mockDb.save();
      }
      return { ok: true };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw authError(error);
    return { ok: true };
  },

  async completeAuthCallback(): Promise<void> {
    if (!isSupabaseConfigured) return;
    const current = new URL(window.location.href);
    const code = current.searchParams.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw authError(error);
      current.searchParams.delete('code');
      window.history.replaceState({}, document.title, current.pathname + current.search + current.hash);
    }
  },

  getProjectUrl(): string {
    return SUPABASE_URL;
  },
};
