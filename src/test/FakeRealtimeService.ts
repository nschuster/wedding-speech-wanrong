import type { ConnectionStatus, LiveState, RealtimeService, Unsubscribe } from '../services/types';
export class FakeRealtimeService implements RealtimeService {
  state: LiveState = { currentSection: 0, updatedAt: 0 };
  status: ConnectionStatus = 'connected';
  private stateListeners = new Set<(state: LiveState) => void>();
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private authListeners = new Set<(authenticated: boolean) => void>();
  authenticated = true;
  subscribe(onState: (state: LiveState) => void, onStatus: (status: ConnectionStatus) => void): Unsubscribe { this.stateListeners.add(onState); this.statusListeners.add(onStatus); onState(this.state); onStatus(this.status); return () => { this.stateListeners.delete(onState); this.statusListeners.delete(onStatus); }; }
  async setCurrentSection(currentSection: number) { this.state = { currentSection, updatedAt: Date.now() }; this.stateListeners.forEach(fn => fn(this.state)); }
  async signIn() { this.setAuthenticated(true); }
  async signOut() { this.setAuthenticated(false); }
  isAuthenticated() { return this.authenticated; }
  subscribeAuth(listener: (authenticated: boolean) => void) { this.authListeners.add(listener); listener(this.authenticated); return () => this.authListeners.delete(listener); }
  setAuthenticated(authenticated: boolean) { this.authenticated = authenticated; this.authListeners.forEach(fn => fn(authenticated)); }
  disconnect() { this.status = 'offline'; this.statusListeners.forEach(fn => fn(this.status)); }
  reconnect() { this.status = 'connected'; this.statusListeners.forEach(fn => fn(this.status)); this.stateListeners.forEach(fn => fn(this.state)); }
}
