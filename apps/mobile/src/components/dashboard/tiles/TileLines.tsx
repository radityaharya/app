import { Text, View } from 'react-native';

import { MONO, type ThemeColors } from '@/components/tokens';

export function TileHero({
  value,
  subtitle,
  C,
  tone = 'default',
}: {
  value: string;
  subtitle?: string;
  C: ThemeColors;
  tone?: 'default' | 'warn' | 'danger';
}) {
  const color =
    tone === 'danger' ? C.destructive : tone === 'warn' ? C.accent : C.text;

  return (
    <View>
      <Text
        style={{
          fontSize: 28,
          fontWeight: '700',
          fontFamily: MONO,
          color,
          fontVariant: ['tabular-nums'],
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, marginTop: 4 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function TileLine({
  label,
  value,
  C,
}: {
  label: string;
  value: string;
  C: ThemeColors;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 8,
      }}
    >
      <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary }}>{label}</Text>
      <Text
        numberOfLines={2}
        style={{
          flex: 1,
          fontSize: 11,
          fontFamily: MONO,
          color: C.text,
          textAlign: 'right',
          lineHeight: 15,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function TileBar({ pct, C }: { pct: number | null; C: ThemeColors }) {
  if (pct == null) return null;

  const clamped = Math.max(0, Math.min(100, pct));
  const fillColor =
    clamped <= 20 ? C.destructive : clamped <= 35 ? C.accent : C.statusActive;

  return (
    <View
      style={{
        marginTop: 12,
        height: 6,
        backgroundColor: C.hairline,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: fillColor }} />
    </View>
  );
}
