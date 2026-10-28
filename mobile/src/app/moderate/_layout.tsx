import { Stack } from 'expo-router';

import { useProfile } from '@/data/auth';
import { Loading, Message } from '@/ui/components';

/**
 * The moderator section, for the moderator account on a laptop browser. Only
 * the screens are kept from everyone else here; row-level security is what
 * stops other accounts from seeing or changing anything.
 */
export default function ModerateLayout() {
  const { profile, loading, error } = useProfile();

  let gate = null;
  if (loading) gate = <Loading />;
  else if (error) gate = <Message title="Couldn't check your account" detail={error.message} />;
  else if (!profile) gate = <Message title="Sign in first" detail="Moderator tools need the moderator account." />;
  else if (!profile.is_moderator) gate = <Message title="Moderators only" detail="This account can't use moderator tools." />;

  if (gate) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Moderator tools' }} />
        {gate}
      </>
    );
  }
  return (
    <>
      {/* The section's own stack shows the headers, so the gate's header goes. */}
      <Stack.Screen options={{ headerShown: false }} />
      <Stack screenOptions={{ headerShown: true }} />
    </>
  );
}
