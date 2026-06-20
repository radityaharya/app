import { Text, View } from 'react-native';

import { type Schedule } from '@/lib/api';
import { lineColor } from '@/lib/color';
import { MONO } from '@/components/tokens';
import type { ThemeColors } from '@/components/tokens';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

function minutesUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

interface DepartureRowProps {
  schedule: Schedule;
  stationNameById: Map<string, string>;
  C: ThemeColors;
  compact?: boolean;
}

export function DepartureRow({ schedule: s, stationNameById, C, compact }: DepartureRowProps) {
  const mins = minutesUntil(s.departs_at);
  const isSoon = mins >= 0 && mins <= 5;
  const destName = stationNameById.get(s.station_destination_id) ?? s.station_destination_id;
  const safeColor = lineColor(s.metadata?.origin?.color, s.line, destName);
  const lineName = s.line.replace('COMMUTER LINE ', '');
  const countdown = mins === 0 ? 'NOW' : mins < 0 ? `${Math.abs(mins)}m ago` : `${mins}m`;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: compact ? 8 : 12,
        paddingHorizontal: compact ? 0 : 16,
        gap: 12,
      }}
    >
      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: safeColor, flexShrink: 0, marginTop: 1 }} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ fontSize: 14, fontWeight: '600', fontFamily: MONO, color: C.text, letterSpacing: -0.1 }}
          numberOfLines={1}
        >
          {destName.replace(/\bSTASIUN\b/g, '').trim()}
        </Text>
        <Text
          style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, marginTop: 2, letterSpacing: 0.2 }}
          numberOfLines={1}
        >
          {lineName}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text
          style={{
            fontSize: compact ? 18 : 20,
            fontWeight: '700',
            fontFamily: MONO,
            color: isSoon ? safeColor : C.text,
            fontVariant: ['tabular-nums'],
            letterSpacing: -0.5,
          }}
        >
          {fmtTime(s.departs_at)}
        </Text>
        <Text style={{ fontSize: 10, fontWeight: '600', fontFamily: MONO, color: isSoon ? safeColor : C.textSecondary, letterSpacing: 0.4 }}>
          {countdown}
        </Text>
      </View>
    </View>
  );
}
