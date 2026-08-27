import { describe, expect, it } from 'vitest';
import { liveStateStorageKey, normalizeLivePath } from './config';

describe('Firebase speech path configuration', () => {
  it('normalizes configured database paths', () => {
    expect(normalizeLivePath('/speeches/niklas/live/')).toBe('speeches/niklas/live');
    expect(normalizeLivePath('speeches/wanrong/live')).toBe('speeches/wanrong/live');
  });

  it('keeps cached state isolated by speech path', () => {
    expect(liveStateStorageKey('speeches/niklas/live')).not.toBe(liveStateStorageKey('speeches/wanrong/live'));
  });

  it('falls back to the legacy live path when no path is configured', () => {
    expect(normalizeLivePath(undefined)).toBe('live');
  });
});
