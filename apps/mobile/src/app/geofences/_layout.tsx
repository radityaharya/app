import { Stack } from 'expo-router';

const sheetOptions = {
  presentation: 'formSheet' as const,
  headerShown: false,
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.55, 0.92],
  sheetInitialDetentIndex: 0,
  sheetLargestUndimmedDetentIndex: 0,
  contentStyle: { backgroundColor: 'transparent' },
};

export default function GeofencesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add" options={sheetOptions} />
      <Stack.Screen name="edit" options={sheetOptions} />
    </Stack>
  );
}
