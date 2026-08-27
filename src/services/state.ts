import type { LiveState } from './types';

export function parseLiveState(value: unknown): LiveState | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (!Number.isInteger(candidate.currentSection) || Number(candidate.currentSection) < 0) return null;
  if (typeof candidate.updatedAt !== 'number' || !Number.isFinite(candidate.updatedAt)) return null;
  return { currentSection: Number(candidate.currentSection), updatedAt: candidate.updatedAt };
}
