import { apiRequest } from './apiClient';

export type StorageBucketName =
  | 'question-images'
  | 'payment-receipts'
  | 'school-logos'
  | 'profile-images'
  | 'exported-papers';

export const storageService = {
  uploadBase64(params: {
    bucket: StorageBucketName;
    fileName: string;
    dataUrl: string;
    classId?: string;
  }): Promise<{
    object: { id: string; bucket: string; fileName: string; mimeType: string; sizeBytes: number };
    signedUrl: string;
  }> {
    return apiRequest('/storage/upload', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  getSignedUrl(objectId: string): Promise<{ signedUrl: string; expiresInSeconds: number }> {
    return apiRequest(`/storage/signed-url/${encodeURIComponent(objectId)}`);
  },
};
