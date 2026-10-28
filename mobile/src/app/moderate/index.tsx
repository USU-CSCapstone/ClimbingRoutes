import { Stack } from 'expo-router';

import { Message } from '@/ui/components';

export default function ModerateScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Moderator tools' }} />
      <Message title="Review queue" detail="Models waiting for review will be listed here." />
    </>
  );
}
