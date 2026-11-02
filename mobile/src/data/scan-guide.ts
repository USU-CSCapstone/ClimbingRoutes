// Whether this device has been through the full capture guide, so later scans
// get a one-screen reminder instead. Kept in the same localStorage as
// device-cache.ts: the browser's on web, and expo-sqlite's on iOS and Android.
import 'expo-sqlite/localStorage/install';

const KEY = 'scan-guide-seen';

export function hasSeenGuide(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markGuideSeen() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // Not saved: the full guide shows again next time, which does no harm.
  }
}
