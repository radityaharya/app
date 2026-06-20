import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { dbGetHermesUrl } from '@/lib/db';

const HERMES_API_KEY = 'hermes_api_key';

let webApiKey: string | null = null;

export function getHermesBaseUrl(): string {
  return dbGetHermesUrl();
}

export async function getHermesApiKey(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return webApiKey;
  }
  try {
    return await SecureStore.getItemAsync(HERMES_API_KEY);
  } catch {
    return null;
  }
}

export async function setHermesApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (Platform.OS === 'web') {
    webApiKey = trimmed || null;
    return;
  }
  if (trimmed) {
    await SecureStore.setItemAsync(HERMES_API_KEY, trimmed);
  } else {
    await SecureStore.deleteItemAsync(HERMES_API_KEY);
  }
}

export async function clearHermesApiKey(): Promise<void> {
  if (Platform.OS === 'web') {
    webApiKey = null;
    return;
  }
  try {
    await SecureStore.deleteItemAsync(HERMES_API_KEY);
  } catch {
    // ignore
  }
}

export async function isHermesConfigured(): Promise<boolean> {
  const key = await getHermesApiKey();
  return Boolean(key && getHermesBaseUrl());
}

export async function getHermesAuthHeaders(): Promise<Record<string, string>> {
  const key = await getHermesApiKey();
  if (!key) {
    throw new Error('Hermes API key not configured');
  }
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}
