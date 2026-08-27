import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { FakeRealtimeService } from './test/FakeRealtimeService';
function guest(service: FakeRealtimeService, lang: 'de'|'en'|'zh') { return render(<App service={service} initialPath="/" initialLanguage={lang} />); }
describe('live wedding speech', () => {
  it('always shows language selection at the QR guest URL even when a language was remembered', () => {
    localStorage.setItem('wedding-speech-language', 'en');
    const service = new FakeRealtimeService();
    render(<App service={service} initialPath="/" />);
    expect(screen.getByRole('button', { name: 'Deutsch' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'English' })).toBeVisible();
    expect(screen.getByRole('button', { name: '中文' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Change language' })).not.toBeInTheDocument();
  });
  it('offers German, shows welcome first, then displays the first German speech section', async () => {
    const service = new FakeRealtimeService();
    const picker = render(<App service={service} initialPath="/" />);
    await userEvent.click(picker.getByRole('button', { name: /Deutsch/i }));
    expect(picker.getByRole('heading', { name: 'Hochzeitsrede' })).toBeVisible();
    expect(picker.getByRole('heading', { name: 'Willkommen' })).toBeVisible();
    expect(picker.queryByText(/Liebe Familie, liebe Freunde/)).not.toBeInTheDocument();
    act(() => { void service.setCurrentSection(1); });
    expect(picker.getByText(/Liebe Familie, liebe Freunde/)).toBeVisible();
  });

  it('synchronizes English and Chinese guests when presenter advances', async () => {
    const service = new FakeRealtimeService();
    const english = guest(service, 'en'); expect(english.getByRole('heading', { name: 'Welcome' })).toBeVisible(); english.unmount();
    const chinese = guest(service, 'zh'); expect(chinese.getByRole('heading', { name: '欢迎' })).toBeVisible(); chinese.unmount();
    const presenter = render(<App service={service} initialPath="/presenter" />);
    await userEvent.keyboard('{ArrowRight}'); presenter.unmount();
    const enAfter = guest(service, 'en'); expect(enAfter.getByText(/Dear family, dear friends/i)).toBeVisible(); enAfter.unmount();
    const zhAfter = guest(service, 'zh'); expect(zhAfter.getByText(/亲爱的家人、朋友们/)).toBeVisible();
  });
  it('keeps last section offline and jumps to current state on reconnect', async () => {
    const service = new FakeRealtimeService(); await service.setCurrentSection(2); const view = guest(service, 'en');
    act(() => service.disconnect()); expect(screen.getByText('Offline')).toBeVisible();
    service.state = { currentSection: 4, updatedAt: Date.now() }; expect(screen.getByText(/First of all, thank you/i)).toBeVisible();
    act(() => service.reconnect()); expect(screen.getByText(/Five minutes is surprisingly short/i)).toBeVisible(); view.unmount();
  });
  it('renders a configured section image across the full guest background', async () => {
    const service = new FakeRealtimeService(); await service.setCurrentSection(20);
    const view = guest(service, 'en');
    const shell = view.getByText(/weekend trip to Paris/i).closest('main');
    expect(shell).toHaveClass('speech-view--image');
    expect(shell).toHaveStyle({ backgroundPosition: 'center', backgroundSize: 'cover' });
    expect(shell?.getAttribute('style')).toContain('images/paris.webp');
    view.unmount();
  });
  it('shows the configured image behind the current section in presenter view', async () => {
    const service = new FakeRealtimeService(); await service.setCurrentSection(20);
    const view = render(<App service={service} initialPath="/presenter" />);
    const current = view.getByText(/Wochenendtrip nach Paris/i).closest('section');
    expect(current).toHaveClass('current-section--image');
    expect(current).toHaveStyle({ backgroundSize: 'cover' });
    expect(current?.getAttribute('style')).toContain('images/paris.webp');
    view.unmount();
  });
  it('lets the presenter select German, English, or Chinese speech text', async () => {
    const service = new FakeRealtimeService(); await service.setCurrentSection(1);
    const view = render(<App service={service} initialPath="/presenter" />);
    const language = view.getByRole('combobox', { name: 'Presenter language' });
    expect(language).toHaveValue('de');
    expect(view.getByText('Liebe Familie, liebe Freunde, liebe Gäste,')).toBeVisible();
    await userEvent.selectOptions(language, 'en');
    expect(view.getByText('Dear family, dear friends, dear guests,')).toBeVisible();
    expect(view.getByText(/First of all, thank you for being here today/i)).toBeVisible();
    await userEvent.selectOptions(language, 'zh');
    expect(view.getByText('亲爱的家人、朋友们、各位来宾：')).toBeVisible();
    expect(view.getByText(/首先，感谢大家今天来到这里/)).toBeVisible();
    view.unmount();
  });
  it('shows a scannable guest QR code on the presenter welcome section', async () => {
    const service = new FakeRealtimeService();
    render(<App service={service} initialPath="/presenter" />);
    expect(screen.getByRole('heading', { name: 'Wedding Speech Wanrong' })).toBeVisible();
    expect(await screen.findByRole('img', { name: /QR code for guest view/i })).toBeVisible();
    expect(screen.getByText(/Guests scan to follow live/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: /Previous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Next/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reset to welcome/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Space \/ → Next/i)).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Jump to section/i })).toBeVisible();
  });
  it('restores an existing presenter authentication session after reload', () => {
    const service = new FakeRealtimeService(); service.authenticated = false;
    render(<App service={service} initialPath="/presenter" />);
    expect(screen.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
    act(() => service.setAuthenticated(true));
    expect(screen.getByRole('heading', { name: 'Wedding Speech Wanrong' })).toBeVisible();
  });

  it('clamps presenter navigation and supports keyboard control', async () => {
    const service = new FakeRealtimeService(); render(<App service={service} initialPath="/presenter" />);
    await userEvent.keyboard('{ArrowRight}'); expect(service.state.currentSection).toBe(1);
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}'); expect(service.state.currentSection).toBe(0);
  });
});
