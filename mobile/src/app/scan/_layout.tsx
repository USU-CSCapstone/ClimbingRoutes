import { Stack } from 'expo-router';

/**
 * The scan flow, opened full screen over the tabs from a wall that has no model
 * (#49). Its first screen splits it in two under scan/[wall]/: the guide, wall
 * size and camera for photos taken in the app (#50, #51), or the upload screen
 * for photos taken outside it (#52).
 */
export default function ScanLayout() {
  return <Stack screenOptions={{ headerShown: true }} />;
}
