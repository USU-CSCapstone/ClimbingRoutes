import { Stack } from 'expo-router';

/**
 * The scan flow, opened full screen over the tabs from a wall that has no model
 * (#49). The guide, camera and review screens (#50–#52) join this stack under
 * scan/[wall]/.
 */
export default function ScanLayout() {
  return <Stack screenOptions={{ headerShown: true }} />;
}
