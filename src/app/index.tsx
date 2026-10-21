import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '@/context/AppContext';
import { colors } from '@/components/ui';

export default function Index() {
  const { user, loading } = useSession();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} accessibilityLabel="Carregando"><ActivityIndicator size="large" color={colors.blue} /></View>;
  if (!user) return <Redirect href="/auth" />;
  return <Redirect href={user.role === 'driver' ? '/driver' : '/passenger'} />;
}
