import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import speech from './speech.json';
import type { ConnectionStatus, LiveState, RealtimeService } from './services/types';

type Language = 'de' | 'en' | 'zh';
type Props = { service: RealtimeService; initialPath?: string; initialLanguage?: Language };
const LAST_STATE: LiveState = { currentSection: 0, updatedAt: 0 };
const clamp = (value: number) => Math.max(0, Math.min(speech.length, value));
const imageUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
const welcome = {
  de: { heading: 'Willkommen', text: 'Die Hochzeitsrede beginnt in Kürze.', note: 'Lehnt euch zurück – die Abschnitte wechseln automatisch.' },
  en: { heading: 'Welcome', text: 'The wedding speech will begin shortly.', note: 'Sit back—the sections will advance automatically.' },
  zh: { heading: '欢迎', text: '婚礼致辞即将开始。', note: '请轻松观看，内容会自动切换。' }
};

function useLiveState(service: RealtimeService) {
  const [state, setState] = useState<LiveState>(LAST_STATE);
  const [status, setStatus] = useState<ConnectionStatus>(navigator.onLine ? 'reconnecting' : 'offline');
  useEffect(() => service.subscribe(next => setState({ ...next, currentSection: clamp(next.currentSection) }), setStatus), [service]);
  return { state, status };
}

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const label = status === 'connected' ? 'Connected' : status === 'reconnecting' ? 'Reconnecting' : 'Offline';
  return <span className={`connection connection--${status}`} role="status"><i />{label}</span>;
}

function GuestQrCode() {
  const [source, setSource] = useState('');
  const guestUrl = useMemo(() => new URL(import.meta.env.BASE_URL, window.location.origin).toString(), []);
  useEffect(() => {
    let active = true;
    void QRCode.toString(guestUrl, { type: 'svg', margin: 1, width: 360, color: { dark: '#17201c', light: '#ffffff' } })
      .then(svg => { if (active) setSource(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`); });
    return () => { active = false; };
  }, [guestUrl]);
  return <div className="presenter-welcome">
    <div className="qr-frame">{source && <img src={source} alt="QR code for guest view" />}</div>
    <div><p className="section-label">Welcome screen</p><h2>Guests scan to follow live</h2><p>Deutsch · English · 中文</p><code>{guestUrl}</code></div>
  </div>;
}

function LanguageChoice({ onChoose }: { onChoose: (language: Language) => void }) {
  return <main className="guest-shell welcome">
    <div className="ornament" aria-hidden="true">N <span>&</span> W</div>
    <p className="eyebrow">Niklas &amp; Wanrong</p><h1>Wedding Speech</h1>
    <p className="welcome-copy">Choose your language to follow the speech live.</p>
    <div className="language-options">
      <button onClick={() => onChoose('de')}><span aria-hidden="true">🇩🇪</span><strong>Deutsch</strong></button>
      <button onClick={() => onChoose('en')}><span aria-hidden="true">🇬🇧</span><strong>English</strong></button>
      <button onClick={() => onChoose('zh')}><span aria-hidden="true">🇨🇳</span><strong>中文</strong></button>
    </div>
    <p className="live-note"><i /> The text will advance automatically</p>
  </main>;
}

function GuestView({ service, initialLanguage }: { service: RealtimeService; initialLanguage?: Language }) {
  const queryLanguage = new URLSearchParams(window.location.search).get('lang');
  const valid = (value: unknown): value is Language => value === 'de' || value === 'en' || value === 'zh';
  const [language, setLanguage] = useState<Language | null>(initialLanguage ?? (valid(queryLanguage) ? queryLanguage : null));
  const { state, status } = useLiveState(service);
  const choose = async (next: Language) => {
    localStorage.setItem('wedding-speech-language', next); setLanguage(next);
    try { await navigator.wakeLock?.request('screen'); } catch { /* Optional API; continue normally. */ }
  };
  if (!language) return <LanguageChoice onChoose={choose} />;
  const isWelcome = state.currentSection === 0;
  const section = isWelcome ? null : speech[state.currentSection - 1];
  const sectionImage = section && 'image' in section ? section.image : undefined;
  const imagePosition = section && 'imagePosition' in section ? section.imagePosition : 'center';
  const imageFit = section && 'imageFit' in section ? section.imageFit : 'cover';
  const title = language === 'de' ? 'Hochzeitsrede' : language === 'zh' ? '婚礼致辞' : 'Wedding Speech';
  const languageLabel = language === 'de' ? 'DE' : language === 'en' ? 'EN' : '中文';
  return <main
    className={`guest-shell speech-view${sectionImage ? ' speech-view--image' : ''}`}
    lang={language === 'zh' ? 'zh-Hans' : language}
    style={sectionImage ? {
      backgroundImage: `linear-gradient(rgba(18, 25, 22, .62), rgba(18, 25, 22, .72)), url("${imageUrl(sectionImage)}")`,
      backgroundPosition: imagePosition,
      backgroundSize: imageFit
    } : undefined}
  >
    <header><div><p className="eyebrow">Niklas &amp; Wanrong</p><h1>{title}</h1></div><button className="language-switch" onClick={() => setLanguage(null)} aria-label="Change language">{languageLabel}</button></header>
    {isWelcome ? <section className="speech-card guest-welcome" key={`${language}-welcome`} aria-live="polite"><div><span className="welcome-rings" aria-hidden="true">N <i>&amp;</i> W</span><h2>{welcome[language].heading}</h2><p>{welcome[language].text}</p><small>{welcome[language].note}</small></div></section> :
      <section className="speech-card" key={`${language}-${state.currentSection}`} aria-live="polite"><span className="quote-mark" aria-hidden="true">“</span><p>{section![language]}</p></section>}
    <footer><div className="progress" aria-label={isWelcome ? 'Waiting for speech to begin' : `Section ${state.currentSection} of ${speech.length}`}>{isWelcome ? <span className="ready-label">Ready</span> : <><span>{state.currentSection}</span><em>/</em><span>{speech.length}</span></>}</div><ConnectionBadge status={status} /></footer>
  </main>;
}

function Login({ service, onSuccess }: { service: RealtimeService; onSuccess: () => void }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(''); const data = new FormData(event.currentTarget);
    try { await service.signIn(String(data.get('email')), String(data.get('password'))); onSuccess(); }
    catch { setError('Anmeldung fehlgeschlagen. E-Mail und Passwort prüfen.'); } finally { setBusy(false); }
  };
  return <main className="presenter-shell login"><form onSubmit={submit}><p className="eyebrow">Presenter View</p><h1>Anmelden</h1><label>E-Mail<input required name="email" type="email" autoComplete="username" /></label><label>Passwort<input required name="password" type="password" autoComplete="current-password" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Anmeldung…' : 'Anmelden'}</button></form></main>;
}

function PresenterView({ service }: { service: RealtimeService }) {
  const { state, status } = useLiveState(service); const [authenticated, setAuthenticated] = useState(service.isAuthenticated()); const [writeError, setWriteError] = useState(''); const [presenterLanguage, setPresenterLanguage] = useState<Language>('de');
  useEffect(() => service.subscribeAuth(setAuthenticated), [service]);
  const move = useCallback(async (target: number) => { setWriteError(''); try { await service.setCurrentSection(clamp(target)); } catch { setWriteError('Update fehlgeschlagen. Verbindung prüfen.'); } }, [service]);
  useEffect(() => {
    const keys = (event: KeyboardEvent) => { if ((event.target as HTMLElement).matches('input,select,button')) return; if (event.key === 'ArrowRight' || event.key === ' ') { event.preventDefault(); void move(state.currentSection + 1); } if (event.key === 'ArrowLeft') { event.preventDefault(); void move(state.currentSection - 1); } };
    window.addEventListener('keydown', keys); return () => window.removeEventListener('keydown', keys);
  }, [move, state.currentSection]);
  const isWelcome = state.currentSection === 0;
  const current = isWelcome ? null : speech[state.currentSection - 1];
  const next = speech[state.currentSection];
  const currentImage = current && 'image' in current ? current.image : undefined;
  const currentImagePosition = current && 'imagePosition' in current ? current.imagePosition : 'center';
  const currentImageFit = current && 'imageFit' in current ? current.imageFit : 'cover';
  if (!authenticated) return <Login service={service} onSuccess={() => setAuthenticated(true)} />;
  return <main className="presenter-shell">
    <header><div><p className="eyebrow">Niklas &amp; Wanrong</p><h1>Wedding Speech Wanrong</h1></div><div className="presenter-tools"><ConnectionBadge status={status} /><label className="floating-jump"><span>Language</span><select aria-label="Presenter language" value={presenterLanguage} onChange={event => setPresenterLanguage(event.target.value as Language)}><option value="de">Deutsch</option><option value="en">English</option><option value="zh">中文</option></select></label><label className="floating-jump"><span>Jump</span><select aria-label="Jump to section" value={state.currentSection} onChange={event => void move(Number(event.target.value))}><option value={0}>Welcome</option>{speech.map((item, index) => <option key={item.id} value={index + 1}>Section {index + 1}</option>)}</select></label><button onClick={() => document.documentElement.requestFullscreen?.()} aria-label="Fullscreen">⛶</button><button onClick={async () => { await service.signOut(); setAuthenticated(false); }} aria-label="Sign out">↪</button></div></header>
    <div className="presenter-progress"><strong>{isWelcome ? 'Welcome' : state.currentSection}</strong><span>/ {speech.length}</span><div><i style={{ width: `${(state.currentSection / speech.length) * 100}%` }} /></div></div>
    <section
      className={`current-section${isWelcome ? ' current-section--welcome' : ''}${currentImage ? ' current-section--image' : ''}`}
      style={currentImage ? {
        backgroundImage: `linear-gradient(rgba(18, 25, 22, .7), rgba(18, 25, 22, .78)), url("${imageUrl(currentImage)}")`,
        backgroundPosition: currentImagePosition,
        backgroundSize: currentImageFit
      } : undefined}
    >{isWelcome ? <GuestQrCode /> : <><p className="section-label">Aktueller Abschnitt</p><p lang={presenterLanguage === 'zh' ? 'zh-Hans' : presenterLanguage}>{current![presenterLanguage]}</p></>}</section>
    <section className="next-section"><p className="section-label">Als Nächstes</p><p lang={presenterLanguage === 'zh' ? 'zh-Hans' : presenterLanguage}>{next?.[presenterLanguage] ?? '— Ende der Rede —'}</p></section>
    {writeError && <p className="form-error" role="alert">{writeError}</p>}
  </main>;
}

export function App({ service, initialPath = window.location.pathname, initialLanguage }: Props) {
  const isPresenter = useMemo(() => initialPath.replace(/\/$/, '').endsWith('/presenter'), [initialPath]);
  return isPresenter ? <PresenterView service={service} /> : <GuestView service={service} initialLanguage={initialLanguage} />;
}
