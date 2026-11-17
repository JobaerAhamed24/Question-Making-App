import { supabase } from '../lib/supabaseClient';

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('লগইন করুন।');
  return data.user.id;
}

async function toggle(table: 'favorites' | 'saved_questions', questionId: string): Promise<string[]> {
  const userId = await currentUserId();
  const { data: existing, error: selectError } = await supabase
    .from(table)
    .select('question_id')
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId).eq('question_id', questionId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from(table).insert({ user_id: userId, question_id: questionId });
    if (error) throw error;
  }
  const { data, error } = await supabase.from(table).select('question_id').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.question_id);
}

export const favoriteService = {
  async getCollections(): Promise<{ favoriteIds: string[]; savedIds: string[] }> {
    const userId = await currentUserId();
    const [favorites, saved] = await Promise.all([
      supabase.from('favorites').select('question_id').eq('user_id', userId),
      supabase.from('saved_questions').select('question_id').eq('user_id', userId),
    ]);
    if (favorites.error) throw favorites.error;
    if (saved.error) throw saved.error;
    return {
      favoriteIds: (favorites.data ?? []).map((row) => row.question_id),
      savedIds: (saved.data ?? []).map((row) => row.question_id),
    };
  },

  async toggleFavorite(questionId: string): Promise<{ favoriteIds: string[] }> {
    return { favoriteIds: await toggle('favorites', questionId) };
  },

  async toggleSaved(questionId: string): Promise<{ savedIds: string[] }> {
    return { savedIds: await toggle('saved_questions', questionId) };
  },
};
