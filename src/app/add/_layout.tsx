import { Stack } from 'expo-router';
import { colors } from '../../theme';

export default function AddLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
        presentation: 'modal',
        animation: 'slide_from_bottom',
      }}
    />
  );
}
