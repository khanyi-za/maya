// Resolves an API media URL to an expo-image / expo-video source.
// Real backend URLs are absolute (Cloudinary) and pass through as { uri }.
// Legacy /demo-assets/ paths resolve to bundled assets via getLocalAsset —
// that branch (and this distinction) disappears once fixtures are retired.

import { getLocalAsset } from './local-assets';

const VIDEO_UPLOAD = '/video/upload/';

/**
 * Force Cloudinary to deliver H.264 for video URLs. Instagram reels arrive as
 * VP9, which iOS AVPlayer (expo-video on iOS) cannot decode — the video would
 * silently not play. Inserting the `vc_h264` codec transform makes Cloudinary
 * transcode on delivery (cached after first request). Image URLs (/image/upload/)
 * and local assets are untouched.
 */
function toPlayableVideoUrl(url: string): string {
  const i = url.indexOf(VIDEO_UPLOAD);
  if (i === -1) return url;
  const after = i + VIDEO_UPLOAD.length;
  if (url.slice(after).startsWith('vc_')) return url; // already transformed
  return `${url.slice(0, after)}vc_h264/${url.slice(after)}`;
}

export function imageSource(url: string | null | undefined): any {
  if (!url) return undefined;
  if (url.startsWith('http')) return { uri: toPlayableVideoUrl(url) };
  return getLocalAsset(url) ?? undefined;
}
