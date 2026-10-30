import { Platform } from 'react-native';

/**
 * Runs in the page before its content on Android. Expo's page copies the host
 * OS and initial props from `ReactNativeWebView.injectedObjectJson()` onto
 * `window.$$EXPO_*` in an inline script, but react-native-webview defines that
 * function asynchronously at page start, so the inline script can run first
 * and leave them unset ("Top OS ($$EXPO_DOM_HOST_OS) is not defined").
 * Getters read the object when the bundle asks instead, by which time the
 * bundle has loaded from the dev server and the object is always there.
 */
const READ_INJECTED_OBJECT = `
  [['$$EXPO_DOM_HOST_OS', 'EXPO_DOM_HOST_OS'], ['$$EXPO_INITIAL_PROPS', 'initialProps']].forEach(function (pair) {
    Object.defineProperty(window, pair[0], {
      configurable: true,
      get: function () {
        return JSON.parse(window.ReactNativeWebView.injectedObjectJson())[pair[1]];
      },
      set: function () {},
    });
  });
  true;
`;

/**
 * WebView settings for DOM components (the map and 3D viewer). Spread into each
 * one's `dom` prop.
 *
 * Expo Go on Android doesn't include @expo/dom-webview, the default host, so
 * Android uses react-native-webview, with the script above to hand the page
 * its props reliably.
 */
export const DOM_WEBVIEW =
  Platform.OS === 'android'
    ? { useExpoDOMWebView: false, injectedJavaScriptBeforeContentLoaded: READ_INJECTED_OBJECT }
    : {};
