// NativeWind v4 requires the jsxImportSource + the nativewind/babel preset.
// (maya had no babel.config.js before — Expo used babel-preset-expo by default;
// this preserves that and adds NativeWind.)
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  }
}
