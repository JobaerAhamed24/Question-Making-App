import { apiRequest } from './apiClient';

export const favoriteService = {
  getCollections(): Promise<{ favoriteIds: string[]; savedIds: string[] }> {
    return apiRequest('/collections');
  },

  toggleFavorite(questionId: string): Promise<{ favoriteIds: string[] }> {
    return apiRequest(`/favorites/${encodeURIComponent(questionId)}/toggle`, {
      method: 'POST',
    });
  },

  toggleSaved(questionId: string): Promise<{ savedIds: string[] }> {
    return apiRequest(`/saved/${encodeURIComponent(questionId)}/toggle`, {
      method: 'POST',
    });
  },
};
