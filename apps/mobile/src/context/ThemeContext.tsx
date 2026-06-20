import * as SystemUI from 'expo-system-ui';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Appearance, Platform } from 'react-native';

import { Colors } from '@/constants/theme';
import { dbGetThemeScheme, dbSetThemeScheme, type ThemeScheme } from '@/lib/db';

type ThemeColors = typeof Colors.light | typeof Colors.dark;

interface ThemeContextValue {
  scheme: ThemeScheme;
  colors: ThemeColors;
  toggle: () => void;
  setScheme: (s: ThemeScheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  scheme: 'dark',
  colors: Colors.dark,
  toggle: () => {},
  setScheme: () => {},
});

function applyNativeTheme(scheme: ThemeScheme) {
  Appearance.setColorScheme(scheme);
  if (Platform.OS !== 'web') {
    void SystemUI.setBackgroundColorAsync(Colors[scheme].background);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setSchemeState] = useState<ThemeScheme>(() => dbGetThemeScheme());

  useEffect(() => {
    applyNativeTheme(scheme);
  }, [scheme]);

  const setScheme = useCallback((next: ThemeScheme) => {
    setSchemeState(next);
    dbSetThemeScheme(next);
    applyNativeTheme(next);
  }, []);

  const toggle = useCallback(() => {
    setScheme(scheme === 'light' ? 'dark' : 'light');
  }, [scheme, setScheme]);

  return (
    <ThemeContext value={{ scheme, colors: Colors[scheme], toggle, setScheme }}>
      {children}
    </ThemeContext>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
