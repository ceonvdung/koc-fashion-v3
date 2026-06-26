import { getEnv } from '../lib/env';
import { Buffer } from 'buffer';

function getSupabaseUrl(): string {
  return getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL') || '';
}

function getSupabaseKey(): string {
  return getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || '';
}

function stripBase64Prefix(data: string): string {
  const comma = data.indexOf(',');
  return comma >= 0 ? data.slice(comma + 1) : data;
}

export async function createSignedUrl(path: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();
    if (!url || !key) return null;

    const bucket = 'koc-images';
    const signedUrl = `${url}/storage/v1/object/sign/${bucket}/${path}?expiresIn=${expiresIn}`;
    const response = await fetch(signedUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to create signed URL for ${path}: ${response.status}`);
      return null;
    }

    const data = await response.json() as any;
    return data.signedURL ? `${url}${data.signedURL}` : null;
  } catch (error) {
    console.error('createSignedUrl error:', error);
    return null;
  }
}

export async function uploadImage(
  userId: string,
  generationId: string,
  index: number,
  base64: string,
  mimeType: string
): Promise<string | null> {
  try {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();
    if (!url || !key) {
      console.warn('Supabase URL or key not configured');
      return null;
    }

    const bucket = 'koc-images';
    const ext = mimeType.split('/')[1] || 'png';
    const path = `${userId}/${generationId}/${index}.${ext}`;
    const raw = stripBase64Prefix(base64);
    const buffer = Buffer.from(raw, 'base64');

    const storageUrl = `${url}/storage/v1/object/${bucket}/${path}`;
    const response = await fetch(storageUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': mimeType,
        'x-upsert': 'true',
      },
      body: buffer,
    });

    if (!response.ok) {
      console.warn(`Storage upload failed: ${response.status}, trying to create bucket...`);

      const bucketResult = await fetch(`${url}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: bucket, name: bucket, public: false }),
      }).catch((err) => {
        console.warn('Failed to create storage bucket:', err);
        return null;
      });

      if (!bucketResult || !bucketResult.ok) {
        console.warn(`Storage upload failed permanently: ${response.status}`);
        return null;
      }

      const retry = await fetch(storageUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': mimeType,
          'x-upsert': 'true',
        },
        body: buffer,
      });

      if (!retry.ok) {
        console.warn(`Storage upload retry failed: ${retry.status}`);
        return null;
      }
    }

    const signedUrl = await createSignedUrl(path, 365 * 24 * 60 * 60);
    return signedUrl;
  } catch (error) {
    console.error('uploadImage error:', error);
    return null;
  }
}

export async function deleteImage(path: string): Promise<boolean> {
  try {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();
    if (!url || !key) return false;

    const bucket = 'koc-images';
    const deleteUrl = `${url}/storage/v1/object/${bucket}/${path}`;
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${key}`,
      },
    });

    if (!response.ok) {
      console.warn(`Failed to delete image ${path}: ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('deleteImage error:', error);
    return false;
  }
}