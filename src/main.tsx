import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { FirebaseRealtimeService } from './services/FirebaseRealtimeService';
import { LocalRealtimeService } from './services/LocalRealtimeService';
import './styles.css';

const root = createRoot(document.getElementById('root')!);
try {
  const service = import.meta.env.VITE_DEMO_MODE === 'true' ? new LocalRealtimeService() : new FirebaseRealtimeService();
  root.render(<StrictMode><App service={service} /></StrictMode>);
} catch (error) {
  root.render(<main className="fatal"><h1>Configuration needed</h1><p>{error instanceof Error ? error.message : 'Unable to start the application.'}</p></main>);
}
