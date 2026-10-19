// MapLibre builds its web workers from its own function source, so any Babel
// helper injected into its prebuilt file is missing inside the worker. DOM
// components (the map's WebView) get legacy transforms that inject helpers,
// which broke the map on iOS and Android. Its dist file is left untouched.
// A function rather than a RegExp: Metro also loads this config with no filename.
const isMaplibreDist = (filename) => /node_modules[\\/]maplibre-gl[\\/]dist[\\/]/.test(filename ?? '');

module.exports = function (api) {
  api.cache(true);
  return {
    overrides: [{ exclude: isMaplibreDist, presets: ['babel-preset-expo'] }],
  };
};
