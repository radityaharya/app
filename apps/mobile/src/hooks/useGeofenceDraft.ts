import { useCallback, useEffect, useState } from 'react';

export interface GeofenceDraft {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
}

type Listener = (draft: GeofenceDraft | null) => void;

let _draft: GeofenceDraft | null = null;
const _listeners = new Set<Listener>();

function notify() {
  _listeners.forEach((fn) => fn(_draft));
}

export function setGeofenceDraft(draft: GeofenceDraft | null) {
  _draft = draft;
  notify();
}

export function getGeofenceDraft() {
  return _draft;
}

export function useGeofenceDraft() {
  const [draft, setDraft] = useState<GeofenceDraft | null>(_draft);

  useEffect(() => {
    const listener: Listener = (next) => setDraft(next);
    _listeners.add(listener);
    setDraft(_draft);
    return () => {
      _listeners.delete(listener);
    };
  }, []);

  const updateDraft = useCallback((patch: Partial<GeofenceDraft>) => {
    if (!_draft) return;
    setGeofenceDraft({ ..._draft, ...patch });
  }, []);

  const clearDraft = useCallback(() => {
    setGeofenceDraft(null);
  }, []);

  return { draft, setGeofenceDraft, updateDraft, clearDraft };
}
