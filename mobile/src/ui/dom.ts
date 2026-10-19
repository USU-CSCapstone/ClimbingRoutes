import { Platform } from 'react-native';

/**
 * WebView settings for DOM components (the map and 3D viewer). Spread into each
 * one's `dom` prop.
 *
 * Expo Go on Android doesn't include @expo/dom-webview, the default host, so
 * Android uses react-native-webview. That one only hands the page its props at
 * page start when some before-content script is set; without it, Expo's
 * startup script runs first and the component never renders. The script here
 * does nothing itself.
 */
export const DOM_WEBVIEW =
  Platform.OS === 'android' ? { useExpoDOMWebView: false, injectedJavaScriptBeforeContentLoaded: 'true;' } : {};
