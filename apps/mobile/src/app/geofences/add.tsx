import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { GeofenceForm } from '@/components/geofences/geofence-form';
import { useGeofences } from '@/hooks/useGeofences';
import { setGeofenceDraft } from '@/hooks/useGeofenceDraft';

export default function AddGeofenceSheet() {
  const { lat, lng } = useLocalSearchParams<{ lat: string; lng: string }>();
  const { add } = useGeofences();

  const latitude = parseFloat(lat ?? '0');
  const longitude = parseFloat(lng ?? '0');

  useEffect(() => {
    setGeofenceDraft({
      id: '__draft__',
      latitude,
      longitude,
      radius: 300,
    });
    return () => setGeofenceDraft(null);
  }, [latitude, longitude]);

  return (
    <GeofenceForm
      latitude={latitude}
      longitude={longitude}
      submitLabel="add geofence"
      onRadiusChange={(radius) =>
        setGeofenceDraft({ id: '__draft__', latitude, longitude, radius })
      }
      onSubmit={(values) => {
        add({
          ...values,
          latitude,
          longitude,
          enabled: true,
        });
        router.back();
      }}
    />
  );
}
