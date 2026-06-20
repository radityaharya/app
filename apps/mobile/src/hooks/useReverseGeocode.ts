import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

/**
 * Reverse-geocodes a lat/lng pair into a short human-readable label.
 * Debounced to 5 s so it doesn't fire on every location tick.
 * Returns null until the first result arrives.
 */
export function useReverseGeocode(
  coords: { latitude: number; longitude: number } | null,
): string | null {
  const [label, setLabel] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!coords) return;

    // Skip if coords haven't moved meaningfully (4 decimal places ≈ 11 m).
    const prev = lastCoordsRef.current;
    if (
      prev &&
      Math.abs(prev.latitude - coords.latitude) < 0.0001 &&
      Math.abs(prev.longitude - coords.longitude) < 0.0001
    ) {
      return;
    }

    // Debounce: wait 5 s before firing so rapid updates don't spam the API.
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        lastCoordsRef.current = coords;
        const results = await Location.reverseGeocodeAsync(coords);
        const r = results[0];
        if (!r) return;

        // Build a compact label: "District, City" or fall back to formattedAddress.
        const parts = [r.district ?? r.name, r.city]
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i); // dedupe

        if (parts.length > 0) {
          setLabel(parts.join(', '));
        } else if (r.formattedAddress) {
          // Take just the first two comma-separated segments.
          setLabel(r.formattedAddress.split(',').slice(0, 2).join(',').trim());
        }
      } catch {
        // Silently ignore — location label is non-critical.
      }
    }, 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [coords?.latitude, coords?.longitude]);

  return label;
}
