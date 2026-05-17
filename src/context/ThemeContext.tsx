import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

import { Colors } from '@/constants/theme';

type Scheme = 'light' | 'dark';

interface ThemeContextValue {
  scheme: Scheme;
  colors: typeof Colors.light;
  toggle: () => void;
  setScheme: (s: Scheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  scheme: 'light',
  colors: Colors.light,
  toggle: () => {},
  setScheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setSchemeState] = useState<Scheme>('light');

  // Sync if OS overrides (e.g. developer toggling system theme while debugging)
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme === 'dark' || colorScheme === 'light') {
        setSchemeState(colorScheme);
      }
    });
    return () => sub.remove();
  }, []);

  const setScheme = useCallback((s: Scheme) => {
    setSchemeState(s);
    // Tell RN's Appearance system — this propagates into useColorScheme() everywhere,
    // including inside NativeTabs, so the native Android tab bar follows suit.
    Appearance.setColorScheme(s);
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
