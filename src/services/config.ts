export function normalizeLivePath(value: string | undefined): string {
  const normalized = (value || 'live').replace(/^\/+|\/+$/g, '');
  return normalized || 'live';
}

export function liveStateStorageKey(livePath: string): string {
  return `wedding-speech-last-state:${normalizeLivePath(livePath)}`;
}

export const LIVE_PATH = normalizeLivePath(import.meta.env.VITE_FIREBASE_LIVE_PATH);
