import type { UserProfile } from '../types/domain';
import { supabase } from '../lib/supabaseClient';
import { mapUser } from './supabaseMappers';

export const userService = {
  async getMyProfile(): Promise<{ user: UserProfile | null }> {
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
    preferredLanguage: 'en' | 'bn';
  }): Promise<{ user: UserProfile }> {
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
