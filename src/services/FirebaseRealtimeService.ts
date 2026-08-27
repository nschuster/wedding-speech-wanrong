import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { getDatabase, onValue, ref, set, serverTimestamp } from 'firebase/database';
import type { ConnectionStatus, LiveState, RealtimeService, Unsubscribe } from './types';
import { parseLiveState } from './state';

const LAST_STATE_KEY = 'wedding-speech-wanrong-last-state';
export class FirebaseRealtimeService implements RealtimeService {
  private auth;
  private database;
  private authenticated = false;
  constructor() {
    const config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
    if (Object.values(config).some(value => !value)) throw new Error('Firebase configuration is incomplete. See README.md and .env.example.');
    const app = initializeApp(config);
    this.auth = getAuth(app); this.database = getDatabase(app);
    onAuthStateChanged(this.auth, user => { this.authenticated = Boolean(user); });
  }
  subscribe(onState: (state: LiveState) => void, onStatus: (status: ConnectionStatus) => void): Unsubscribe {
    const cached = localStorage.getItem(LAST_STATE_KEY);
    if (cached) {
      try {
        const parsed = parseLiveState(JSON.parse(cached));
        if (parsed) onState(parsed); else localStorage.removeItem(LAST_STATE_KEY);
      } catch { localStorage.removeItem(LAST_STATE_KEY); }
    }
    const listenerFailed = () => onStatus(navigator.onLine ? 'reconnecting' : 'offline');
    const stopState = onValue(ref(this.database, 'live'), snapshot => {
      const value = parseLiveState(snapshot.val());
      if (value) { onState(value); localStorage.setItem(LAST_STATE_KEY, JSON.stringify(value)); }
    }, listenerFailed);
    const stopConnection = onValue(
      ref(this.database, '.info/connected'),
      snapshot => onStatus(snapshot.val() === true ? 'connected' : navigator.onLine ? 'reconnecting' : 'offline'),
      listenerFailed
    );
    const online = () => onStatus('reconnecting'); const offline = () => onStatus('offline');
    window.addEventListener('online', online); window.addEventListener('offline', offline);
    return () => { stopState(); stopConnection(); window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }
  async setCurrentSection(currentSection: number) { await set(ref(this.database, 'live'), { currentSection, updatedAt: serverTimestamp() }); }
  async signIn(email: string, password: string) { await signInWithEmailAndPassword(this.auth, email, password); this.authenticated = true; }
  async signOut() { await firebaseSignOut(this.auth); this.authenticated = false; }
  isAuthenticated() { return this.authenticated || Boolean(this.auth.currentUser); }
  subscribeAuth(listener: (authenticated: boolean) => void) { return onAuthStateChanged(this.auth, user => { this.authenticated = Boolean(user); listener(Boolean(user)); }); }
}
