// Chat image attachments via nuwa's signed-direct Cloudinary flow
// (docs/api/chat.md §5): backend signs per-upload after authz, the device
// uploads straight to Cloudinary, and the message carries the secure_url.
// The backend validates attachment URLs on send, so nothing else gets in.

import * as ImagePicker from 'expo-image-picker';
import { api } from './api';
import type { ChatImageAttachment } from './api-client';

interface CloudinarySignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  preset: string;
  folder: string;
  resourceType: string;
}

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileName: string;
}

/** Open the photo library. Returns null when the user cancels or denies. */
export async function pickChatImage(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    exif: false,
  });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType ?? 'image/jpeg',
    fileName: asset.fileName ?? 'photo.jpg',
  };
}

/**
 * Sign + upload one picked image. Returns the attachment object to include in
 * the message's `attachments`. Throws on signature or upload failure.
 */
export async function uploadChatImage(
  image: PickedImage
): Promise<ChatImageAttachment> {
  // Signing endpoint lives on the root surface (not /api) — auth required.
  const sig = await api<CloudinarySignature>('/uploads/cloudinary-signature', {
    method: 'POST',
    body: { uploadContext: 'chat_attachment' },
  });

  const form = new FormData();
  form.append('file', {
    uri: image.uri,
    name: image.fileName,
    type: image.mimeType,
  } as unknown as Blob);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('upload_preset', sig.preset);
  form.append('folder', sig.folder);
  // Part of the signed payload (backend signs source=uw) — must be sent.
  form.append('source', 'uw');

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`,
    { method: 'POST', body: form }
  );
  const json = await res.json();
  if (!res.ok || !json.secure_url) {
    throw new Error(json?.error?.message ?? 'Upload failed');
  }

  return {
    type: 'image',
    url: json.secure_url,
    width: json.width ?? image.width,
    height: json.height ?? image.height,
  };
}
