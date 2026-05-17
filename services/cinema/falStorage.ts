// Cinema Studio — fal.ai file upload helper.
//
// Seedance reference-to-video accepts public URLs OR data URLs for refs.
// For real production work we want refs hosted somewhere durable; fal exposes
// its own CDN via the storage upload endpoint at:
//   https://rest.alpha.fal.ai/storage/upload
//
// Returns a permanent fal.media URL that can be pasted into [Image1..9],
// [Video1..3], or [Audio1..3] slots without size limits or CORS pain.

import { ProviderError } from './providers';

const STORAGE_INIT = 'https://rest.alpha.fal.ai/storage/upload/initiate';

interface InitiateResponse {
  file_url: string;     // permanent URL to use as ref input
  upload_url: string;   // signed S3-style URL to PUT the bytes
}

export async function uploadToFalStorage(
  file: File | Blob,
  apiKey: string,
  filename?: string,
): Promise<string> {
  const name = filename ?? (file instanceof File ? file.name : `cinema-${Date.now()}`);
  const contentType = file.type || 'application/octet-stream';

  // Step 1: initiate — fal mints a signed URL pair
  const initRes = await fetch(STORAGE_INIT, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_name: name, content_type: contentType }),
  });
  if (!initRes.ok) {
    const body = await initRes.text().catch(() => '');
    throw new ProviderError('fal', 'fal-storage', 'submit',
      `Storage initiate HTTP ${initRes.status}: ${body.slice(0, 300)}`);
  }
  const init = (await initRes.json()) as InitiateResponse;

  // Step 2: PUT the bytes to the signed upload URL
  const putRes = await fetch(init.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!putRes.ok) {
    throw new ProviderError('fal', 'fal-storage', 'submit',
      `Storage PUT HTTP ${putRes.status}`);
  }

  return init.file_url;
}

// Convenience: upload + return the URL ready to drop into a ref slot.
export async function uploadRefImage(file: File, apiKey: string): Promise<string> {
  return uploadToFalStorage(file, apiKey, file.name);
}
