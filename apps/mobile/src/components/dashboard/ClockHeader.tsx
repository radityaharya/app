import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { MONO, type ThemeColors } from '@/components/tokens';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

function formatClock(now: Date) {
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const day = DAYS[now.getDay()];
  const date = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  return { time: `${h}:${m}`, date: `${day} · ${date}` };
}

interface ClockHeaderProps {
  C: ThemeColors;
}

export function ClockHeader({ C }: ClockHeaderProps) {
  const [clock, setClock] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <View>
      <Text
        style={{
          fontSize: 48,
          fontWeight: '700',
          fontFamily: MONO,
          color: C.text,
          letterSpacing: -2,
          fontVariant: ['tabular-nums'],
          lineHeight: 52,
        }}
      >
        {clock.time}
      </Text>
      <Text
        style={{
          fontSize: 13,
          fontFamily: MONO,
          color: C.textSecondary,
          marginTop: 6,
          letterSpacing: 0.2,
        }}
      >
        {clock.date}
      </Text>
    </View>
  );
}
