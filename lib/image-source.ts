// Resolves an API media URL to an expo-image source.
// Real backend URLs are absolute (Cloudinary) and pass through as { uri }.
// Legacy /demo-assets/ paths resolve to bundled assets via getLocalAsset —
// that branch (and this distinction) disappears once fixtures are retired.

import { getLocalAsset } from './local-assets';

export function imageSource(url: string | null | undefined): any {
  if (!url) return undefined;
  if (url.startsWith('http')) return { uri: url };
  return getLocalAsset(url) ?? undefined;
}
