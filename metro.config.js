const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Add support for video files as assets
config.resolver.assetExts.push(
  // Video formats
  'mp4',
  'mov',
  'avi',
  'webm',
  'm4v',
  'mkv'
);

// NativeWind — process global.css tokens/utilities.
module.exports = withNativeWind(config, { input: './global.css' });
