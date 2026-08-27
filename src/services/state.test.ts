import { describe, expect, it } from 'vitest';
import { parseLiveState } from './state';

describe('parseLiveState', () => {
  it('accepts valid realtime state', () => {
    expect(parseLiveState({ currentSection: 3, updatedAt: 123 })).toEqual({ currentSection: 3, updatedAt: 123 });
  });

  it.each([
    null,
    {},
    { currentSection: 'bad', updatedAt: 123 },
    { currentSection: null, updatedAt: 123 },
    { currentSection: Number.NaN, updatedAt: 123 },
    { currentSection: 1.5, updatedAt: 123 },
    { currentSection: -1, updatedAt: 123 },
    { currentSection: 1, updatedAt: 'bad' }
  ])('rejects malformed cached state %#', value => {
    expect(parseLiveState(value)).toBeNull();
  });
});
