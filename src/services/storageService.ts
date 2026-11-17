import { supabase } from '../lib/supabaseClient';

export type StorageBucketName =
  | 'question-images'
  | 'payment-receipts'
  | 'school-logos'
  | 'profile-images'
  | 'exported-papers';

function decodeDataUrl(dataUrl: string): { blob: Blob; mimeType: string } {
  const match = /^data:([\w.+-]+\/[\w.+-]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new Error('ফাইলের ডেটা সঠিক নয়।');
  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  return { blob: new Blob([bytes], { type: match[1] }), mimeType: match[1] };
}

function parseObjectId(objectId: string): { bucket: StorageBucketName; path: string } {
  const separator = objectId.indexOf(':');
  const bucket = objectId.slice(0, separator) as StorageBucketName;
  const path = objectId.slice(separator + 1);
  if (separator < 1 || !path || !['question-images', 'payment-receipts', 'school-logos', 'profile-images', 'exported-papers'].includes(bucket)) {
    throw new Error('স্টোরেজ ফাইলের ঠিকানা সঠিক নয়।');
  }
  return { bucket, path };
}

export const storageService = {
  async uploadBase64(params: {
    bucket: StorageBucketName;
    fileName: string;
    dataUrl: string;
    classId?: string;
  }): Promise<{
    object: { id: string; bucket: string; fileName: string; mimeType: string; sizeBytes: number };
    signedUrl: string;
  }> {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!auth.user) throw new Error('ফাইল আপলোড করতে লগইন করুন।');
    const { blob, mimeType } = decodeDataUrl(params.dataUrl);
    if (blob.size > 15 * 1024 * 1024) throw new Error('ফাইল ১৫ MB-এর বেশি হতে পারবে না।');
    const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 100) || 'upload';
    const folder = params.bucket === 'question-images' ? params.classId : auth.user.id;
    if (!folder) throw new Error('প্রশ্নের ছবির জন্য শ্রেণি নির্বাচন করুন।');
    const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from(params.bucket).upload(path, blob, { contentType: mimeType, upsert: false });
    if (error) throw error;
    const { data: signed, error: signedError } = await supabase.storage.from(params.bucket).createSignedUrl(path, 15 * 60);
    if (signedError) throw signedError;
    return {
      object: { id: `${params.bucket}:${path}`, bucket: params.bucket, fileName: safeName, mimeType, sizeBytes: blob.size },
      signedUrl: signed.signedUrl,
    };
  },

  async getSignedUrl(objectId: string): Promise<{ signedUrl: string; expiresInSeconds: number }> {
    const { bucket, path } = parseObjectId(objectId);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 10 * 60);
    if (error) throw error;
    return { signedUrl: data.signedUrl, expiresInSeconds: 600 };
  },
};
