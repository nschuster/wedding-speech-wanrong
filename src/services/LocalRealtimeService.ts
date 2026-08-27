import type { ConnectionStatus, LiveState, RealtimeService, Unsubscribe } from './types';
import { parseLiveState } from './state';
const KEY = 'wedding-speech-wanrong-demo-state';
export class LocalRealtimeService implements RealtimeService {
  private authenticated = true;
  private read(): LiveState {
    try { return parseLiveState(JSON.parse(localStorage.getItem(KEY) || '')) ?? { currentSection: 0, updatedAt: 0 }; }
    catch { return { currentSection: 0, updatedAt: 0 }; }
  }
  subscribe(onState: (state: LiveState) => void, onStatus: (status: ConnectionStatus) => void): Unsubscribe {
    const update = (event: StorageEvent) => {
      if (event.key !== KEY || !event.newValue) return;
      try { const state = parseLiveState(JSON.parse(event.newValue)); if (state) onState(state); } catch { /* Ignore malformed demo state. */ }
    };
    window.addEventListener('storage', update); onState(this.read()); onStatus('connected');
    return () => window.removeEventListener('storage', update);
  }
  async setCurrentSection(currentSection: number) { const state = { currentSection, updatedAt: Date.now() }; localStorage.setItem(KEY, JSON.stringify(state)); window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: JSON.stringify(state) })); }
  async signIn() { this.authenticated = true; }
  async signOut() { this.authenticated = false; }
  isAuthenticated() { return this.authenticated; }
  subscribeAuth(listener: (authenticated: boolean) => void) { listener(this.authenticated); return () => undefined; }
}
