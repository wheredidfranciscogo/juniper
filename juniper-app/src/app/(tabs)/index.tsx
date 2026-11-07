import { Redirect } from 'expo-router';

// Explicit entry point for the (tabs) group so `router.replace('/(tabs)')` resolves
// cleanly. The Garden grid is the home of the app — it replaced the Today carousel
// (DECISIONS.md D12).
export default function TabsIndex() {
  return <Redirect href="/garden" />;
}
