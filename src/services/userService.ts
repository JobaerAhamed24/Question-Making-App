import type { UserProfile } from '../types/domain';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { mockDb } from '../lib/mockDb';
import { mapUser } from './supabaseMappers';

export const userService = {
  async getMyProfile(): Promise<{ user: UserProfile | null }> {
    if (!isSupabaseConfigured) {
      return { user: mockDb.getCurrentUser() };
    }
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!auth.user) return { user: null };
    const [{ data: profile, error: profileError }, { data: role, error: roleError }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', auth.user.id).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', auth.user.id).maybeSingle(),
    ]);
    if (profileError) throw profileError;
    if (roleError) throw roleError;
    return { user: profile ? mapUser(profile, role) : null };
  },

  async updateMyProfile(patch: {
    fullName: string;
    phone: string;
    institution?: string;
    classId?: string;
    avatarUrl?: string;
    bio?: string;
    privacySettings?: UserProfile['privacySettings'];
    preferredLanguage: 'en' | 'bn';
  }): Promise<{ user: UserProfile }> {
    if (!isSupabaseConfigured) {
      const current = mockDb.getCurrentUser();
      if (!current) throw new Error('লগইন করুন।');
      const state = mockDb.getState();
      const idx = state.users.findIndex((u) => u.id === current.id);
      if (idx === -1) throw new Error('ব্যবহারকারী পাওয়া যায়নি।');
      const updated: UserProfile = {
        ...state.users[idx],
        fullName: patch.fullName.trim(),
        phone: patch.phone.trim(),
        institution: patch.institution?.trim() || undefined,
        classId: patch.classId ?? state.users[idx].classId,
        avatarUrl: patch.avatarUrl !== undefined ? (patch.avatarUrl || undefined) : state.users[idx].avatarUrl,
        bio: patch.bio !== undefined ? (patch.bio.trim() || undefined) : state.users[idx].bio,
        privacySettings: patch.privacySettings ?? state.users[idx].privacySettings,
        preferredLanguage: patch.preferredLanguage,
      };
      state.users[idx] = updated;
      mockDb.save();
      return { user: updated };
    }
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!auth.user) throw new Error('লগইন করুন।');
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        full_name: patch.fullName.trim(),
        phone: patch.phone.trim(),
        institution: patch.institution?.trim() || null,
        preferred_language: patch.preferredLanguage,
      })
      .eq('id', auth.user.id)
      .select('*')
      .single();
    if (error) throw error;
    const { data: role, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (roleError) throw roleError;
    return { user: mapUser(profile, role) };
  },
};
