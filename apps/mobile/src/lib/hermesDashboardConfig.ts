import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { dbGetHermesDashboardUrl } from '@/lib/db';

const USERNAME_KEY = 'hermes_dashboard_username';
const PASSWORD_KEY = 'hermes_dashboard_password';
const COOKIES_KEY = 'hermes_dashboard_cookies';

let webUsername: string | null = null;
let webPassword: string | null = null;
let webCookies: string | null = null;

export interface DashboardSessionCookies {
  at: string;
  rt?: string;
}

export function getHermesDashboardBaseUrl(): string {
  return dbGetHermesDashboardUrl();
}

export async function getDashboardUsername(): Promise<string | null> {
  if (Platform.OS === 'web') return webUsername;
  try {
    return await SecureStore.getItemAsync(USERNAME_KEY);
  } catch {
    return null;
  }
}

export async function getDashboardPassword(): Promise<string | null> {
  if (Platform.OS === 'web') return webPassword;
  try {
    return await SecureStore.getItemAsync(PASSWORD_KEY);
  } catch {
    return null;
  }
}

export async function setDashboardCredentials(username: string, password: string): Promise<void> {
  const u = username.trim();
  const p = password;
  if (Platform.OS === 'web') {
    webUsername = u || null;
    webPassword = p || null;
    return;
  }
  if (u) await SecureStore.setItemAsync(USERNAME_KEY, u);
  else await SecureStore.deleteItemAsync(USERNAME_KEY);
  if (p) await SecureStore.setItemAsync(PASSWORD_KEY, p);
  else await SecureStore.deleteItemAsync(PASSWORD_KEY);
}

export async function clearDashboardCredentials(): Promise<void> {
  await clearDashboardSession();
  if (Platform.OS === 'web') {
    webUsername = null;
    webPassword = null;
    return;
  }
  try {
    await SecureStore.deleteItemAsync(USERNAME_KEY);
    await SecureStore.deleteItemAsync(PASSWORD_KEY);
  } catch {
    // ignore
  }
}

export async function getDashboardSession(): Promise<DashboardSessionCookies | null> {
  if (Platform.OS === 'web') {
    if (!webCookies) return null;
    try {
      return JSON.parse(webCookies) as DashboardSessionCookies;
    } catch {
      return null;
    }
  }
  try {
    const raw = await SecureStore.getItemAsync(COOKIES_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DashboardSessionCookies;
  } catch {
    return null;
  }
}

export async function setDashboardSession(cookies: DashboardSessionCookies): Promise<void> {
  const raw = JSON.stringify(cookies);
  if (Platform.OS === 'web') {
    webCookies = raw;
    return;
  }
  await SecureStore.setItemAsync(COOKIES_KEY, raw);
}

export async function clearDashboardSession(): Promise<void> {
  if (Platform.OS === 'web') {
    webCookies = null;
    return;
  }
  try {
    await SecureStore.deleteItemAsync(COOKIES_KEY);
  } catch {
    // ignore
  }
}

export async function isDashboardConfigured(): Promise<boolean> {
  const [url, user, pass] = await Promise.all([
    Promise.resolve(getHermesDashboardBaseUrl()),
    getDashboardUsername(),
    getDashboardPassword(),
  ]);
  return Boolean(url && user && pass);
}

export function cookieHeader(session: DashboardSessionCookies): string {
  const parts = [`hermes_session_at=${session.at}`];
  if (session.rt) parts.push(`hermes_session_rt=${session.rt}`);
  return parts.join('; ');
}
