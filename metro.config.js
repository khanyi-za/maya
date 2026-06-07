const { getDefaultConfig } = require('expo/metro-config');

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

module.exports = config;
