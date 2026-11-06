// Whether the camera shows the overlap guide (#53), the faint copy of the last
// photo. On unless turned off, and remembered on this device in the same
// localStorage as scan-guide.ts.
import 'expo-sqlite/localStorage/install';

const KEY = 'overlap-guide-off';

export function overlapGuideOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== '1';
  } catch {
    return true;
  }
}

export function setOverlapGuideOn(on: boolean) {
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, '1');
  } catch {
    // Not saved: it's back on next time, which does no harm.
  }
}
