import * as Calendar from 'expo-calendar';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

export type AgendaEvent = {
  id: string;
  title: string;
  timeLabel: string;
  startMs: number;
};

const PREVIEW_LIMIT = 3;

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatEventTime(event: Pick<Calendar.ExpoCalendarEvent, 'allDay' | 'startDate'>) {
  if (event.allDay) return 'all day';
  const start = new Date(event.startDate);
  const h = start.getHours().toString().padStart(2, '0');
  const m = start.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function toAgendaEvents(events: Calendar.ExpoCalendarEvent[]): AgendaEvent[] {
  const now = Date.now();

  return events
    .filter((event) => new Date(event.endDate).getTime() > now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, PREVIEW_LIMIT)
    .map((event) => ({
      id: event.id,
      title: event.title?.trim() || 'untitled event',
      timeLabel: formatEventTime(event),
      startMs: new Date(event.startDate).getTime(),
    }));
}

export function useCalendarAgenda() {
  const [permission, requestPermission] = Calendar.useCalendarPermissions();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const unavailable = Platform.OS === 'web';

  const refresh = useCallback(async () => {
    if (unavailable) {
      setEvents([]);
      return;
    }

    if (!permission?.granted) {
      setEvents([]);
      return;
    }

    setLoading(true);
    try {
      const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
      if (calendars.length === 0) {
        setEvents([]);
        return;
      }

      const start = startOfDay();
      const end = endOfDay();
      const raw = await Calendar.listEvents(calendars, start, end);
      setEvents(toAgendaEvents(raw));
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [permission?.granted, unavailable]);

  const requestAccess = useCallback(async () => {
    const result = await requestPermission();
    if (result.granted) {
      await refresh();
    }
    return result.granted;
  }, [requestPermission, refresh]);

  return {
    events,
    loading,
    unavailable,
    granted: permission?.granted ?? false,
    canAskAgain: permission?.canAskAgain ?? true,
    refresh,
    requestAccess,
  };
}
