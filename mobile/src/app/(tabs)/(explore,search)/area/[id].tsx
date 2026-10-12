import { useLocalSearchParams } from 'expo-router';

import { AreaView } from '@/ui/area-view';

export default function AreaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AreaView uuid={id} />;
}
