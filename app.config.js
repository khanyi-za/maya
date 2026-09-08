// Dynamic Expo config layered over app.json (which stays the source of truth).
//
// One override: locally (expo start / Expo Go), the app icon becomes the
// Y-glyph — Expo Go's project-loading card thumbnails the icon so small that
// the five-letter wordmark icon fuses into a solid black bar. EAS builds set
// EAS_BUILD=true and keep the wordmark icon from app.json (the owner's call
// for everything users install).
module.exports = ({ config }) => {
  if (!process.env.EAS_BUILD) {
    return { ...config, icon: './assets/images/dev-icon.png' };
  }
  return config;
};
