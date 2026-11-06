import { Stack } from 'expo-router';

import { Message } from '@/ui/components';

/**
 * The guided camera's stand-in on the web, where photos are picked from the
 * computer instead (#52). The camera (#51) and its scan storage are phone only.
 */
export default function CameraScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Camera' }} />
      <Message
        title="The camera is in the phone app"
        detail="On the web, you'll pick the photos from your computer instead. That's coming soon."
      />
    </>
  );
}
