import { Redirect } from 'expo-router';

// Explicit entry point for the (tabs) group so `router.replace('/(tabs)')`
// resolves cleanly. The Today tab is the home of the app.
export default function TabsIndex() {
  return <Redirect href="/today" />;
}
