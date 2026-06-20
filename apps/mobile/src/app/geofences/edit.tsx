import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { GeofenceForm } from '@/components/geofences/geofence-form';
import { MONO } from '@/components/tokens';
import { useThemeContext } from '@/context/ThemeContext';
import { useGeofences } from '@/hooks/useGeofences';
import { setGeofenceDraft } from '@/hooks/useGeofenceDraft';

export default function EditGeofenceSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: C } = useThemeContext();
  const { geofences, update, remove, toggle } = useGeofences();

  const fence = useMemo(() => geofences.find((g) => g.id === id), [geofences, id]);

  useEffect(() => {
    if (!fence) return;
    setGeofenceDraft({
      id: fence.id,
      latitude: fence.latitude,
      longitude: fence.longitude,
      radius: fence.radius_metres,
    });
    return () => setGeofenceDraft(null);
  }, [fence]);

  if (!fence) {
    return null;
  }

  return (
    <GeofenceForm
      latitude={fence.latitude}
      longitude={fence.longitude}
      initial={{
        name: fence.name,
        event_name: fence.event_name,
        radius_metres: fence.radius_metres,
      }}
      submitLabel="save changes"
      onRadiusChange={(radius) =>
        setGeofenceDraft({
          id: fence.id,
          latitude: fence.latitude,
          longitude: fence.longitude,
          radius,
        })
      }
      onSubmit={(values) => {
        update(fence.id, values);
        router.back();
      }}
      footerExtra={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => {
              toggle(fence.id);
              router.back();
            }}
            style={({ pressed }) => ({
              flex: 1,
              borderWidth: 1,
              borderColor: C.hairline,
              paddingVertical: 12,
              alignItems: 'center',
              borderRadius: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', fontFamily: MONO, color: C.text }}>
              {fence.enabled ? 'disable' : 'enable'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert('delete geofence', `delete "${fence.name}"?`, [
                { text: 'cancel', style: 'cancel' },
                {
                  text: 'delete',
                  style: 'destructive',
                  onPress: () => {
                    remove(fence.id);
                    router.back();
                  },
                },
              ]);
            }}
            style={({ pressed }) => ({
              flex: 1,
              borderWidth: 1,
              borderColor: C.destructive,
              paddingVertical: 12,
              alignItems: 'center',
              borderRadius: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', fontFamily: MONO, color: C.destructive }}>
              delete
            </Text>
          </Pressable>
        </View>
      }
    />
  );
}
