/**
 * Favicon utilities.
 *
 * fetchFavicon() downloads the icon via Google S2, converts to a base64 data URI,
 * and returns it for SQLite storage. One network hit on add, then served from cache forever.
 */

const S2_BASE = 'https://www.google.com/s2/favicons';

/** Google S2 favicon proxy URL (for one-time fetch, not for rendering). */
export function faviconUrl(pageUrl: string, size: number = 64): string {
  try {
    const { hostname } = new URL(pageUrl);
    return `${S2_BASE}?domain=${hostname}&sz=${size}`;
  } catch {
    return `${S2_BASE}?domain=example.com&sz=${size}`;
  }
}

/**
 * Fetch a favicon and return it as a base64 data URI string.
 * Returns null if the fetch fails for any reason.
 */
export async function fetchFavicon(pageUrl: string, size: number = 64): Promise<string | null> {
  try {
    const url = faviconUrl(pageUrl, size);
    const res = await fetch(url);
    if (!res.ok) return null;

    const blob = await res.blob();
    const mime = blob.type || 'image/png';

    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Extract a short display label from a URL (the hostname without www). */
export function labelFromUrl(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
