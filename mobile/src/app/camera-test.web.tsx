import { Redirect } from 'expo-router';

import { Message } from '@/ui/components';

/**
 * Web stand-in for the camera test (issue #48). expo-media-library has no web
 * module and Expo Router loads every route on web, so the real screen in
 * camera-test.tsx must never be imported here.
 */
export default function CameraTestScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Message title="The camera test runs on a phone" detail="Open the app in Expo Go and go to Explore." />;
}
