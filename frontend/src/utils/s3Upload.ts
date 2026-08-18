import api from '../services/api';
import axios from 'axios';

interface UploadOptions {
  folder?: string;
  onProgress?: (percent: number) => void;
}

interface UploadResult {
  file_url: string;
  key: string;
  storage: 's3' | 'local';
}

/**
 * Uploads a file using S3 Presigned URL if S3 is active on the backend,
 * or returns local target details if operating in local storage mode.
 */
export async function uploadImageWithPresignedUrl(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { folder = 'products/images', onProgress } = options;

  // 1. Request presigned upload URL from backend API
  const presignedRes = await api.post('/uploads/presigned-url/', {
    filename: file.name,
    content_type: file.type || 'image/jpeg',
    folder,
  });

  const { upload_url, file_url, key, storage } = presignedRes.data;

  // 2. Direct upload to AWS S3 if presigned URL is available
  if (upload_url && storage === 's3') {
    await axios.put(upload_url, file, {
      headers: {
        'Content-Type': file.type || 'image/jpeg',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
  }

  return {
    file_url,
    key,
    storage,
  };
}
