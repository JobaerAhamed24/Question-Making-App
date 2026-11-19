import type { Subscription } from '../types/domain';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { mockDb } from '../lib/mockDb';
import { getUserPermittedClassIds } from '../lib/rules';
import { mapSubscription } from './supabaseMappers';

export const subscriptionService = {
  async getMySubscriptions(): Promise<{ subscriptions: Subscription[] }> {
    if (!isSupabaseConfigured) {
      const user = mockDb.getCurrentUser();
      if (!user) return { subscriptions: [] };
      const subs = mockDb
        .getState()
        .subscriptions.filter((s) => s.userId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { subscriptions: subs };
    }
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, subscription_classes(class_id)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { subscriptions: (data ?? []).map(mapSubscription) };
  },

  async getMyPermittedClassIds(): Promise<{ permittedClassIds: string[] }> {
    if (!isSupabaseConfigured) {
      const user = mockDb.getCurrentUser();
      if (!user) return { permittedClassIds: [] };
      return { permittedClassIds: getUserPermittedClassIds(mockDb.getState().subscriptions, user.id) };
    }
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!auth.user) return { permittedClassIds: [] };
    const { data, error } = await supabase
      .from('subscription_classes')
      .select('class_id, subscriptions!inner(user_id,status,starts_at,expires_at)')
      .eq('subscriptions.user_id', auth.user.id)
      .eq('subscriptions.status', 'active')
      .lte('subscriptions.starts_at', new Date().toISOString())
      .gt('subscriptions.expires_at', new Date().toISOString());
    if (error) throw error;
    return { permittedClassIds: [...new Set((data ?? []).map((row) => row.class_id))] };
  },
};
