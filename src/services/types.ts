export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline';
export type LiveState = { currentSection: number; updatedAt: number };
export type Unsubscribe = () => void;
export interface RealtimeService {
  subscribe(onState: (state: LiveState) => void, onStatus: (status: ConnectionStatus) => void): Unsubscribe;
  setCurrentSection(index: number): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  isAuthenticated(): boolean;
  subscribeAuth(listener: (authenticated: boolean) => void): Unsubscribe;
}
