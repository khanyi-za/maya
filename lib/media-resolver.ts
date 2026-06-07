// Yiiva Media Path Resolver
// Converts API URLs to local asset paths for offline/bundled media

import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

/**
 * Extract merchant folder and filename from API URL
 *
 * @param apiUrl - Full URL from API
 * @returns Object with merchantFolder and filename, or null
 */
export function parseMediaUrl(apiUrl: string | null): { merchantFolder: string; filename: string } | null {
  if (!apiUrl) return null;

  try {
    const match = apiUrl.match(/\/demo-assets\/([^/]+)\/(.+)/);

    if (!match || !match[1] || !match[2]) {
      return null;
    }

    return {
      merchantFolder: match[1],
      filename: decodeURIComponent(match[2]),
    };
  } catch (error) {
    console.error('Error parsing media URL:', error);
    return null;
  }
}

/**
 * Convert API URL to a local file path that can be used with expo-image and expo-video
 * This uses the file system path directly instead of network URLs
 *
 * @param apiUrl - API URL to convert
 * @returns Local file URI or null
 */
export function getLocalMediaUri(apiUrl: string | null): string | null {
  const parsed = parseMediaUrl(apiUrl);
  if (!parsed) return null;

  const { merchantFolder, filename } = parsed;

  // For development/prototype: construct file:// URI
  // Metro bundler will include these files in the bundle
  // The path structure matches our assets/media folder

  // Platform-specific file paths
  if (Platform.OS === 'android') {
    // Android uses asset:// protocol for bundled assets
    return `asset:///media/${merchantFolder}/${filename}`;
  } else if (Platform.OS === 'ios') {
    // iOS can use file:// with the bundle path
    // Note: In production, you'd use Asset.fromModule() but for now we use direct paths
    return `file:///var/mobile/Containers/Bundle/Application/media/${merchantFolder}/${filename}`;
  }

  // Fallback for web or other platforms
  return `./assets/media/${merchantFolder}/${filename}`;
}
