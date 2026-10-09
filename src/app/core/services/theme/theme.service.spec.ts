import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { THEME_CHROME_COLOR, THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  let listeners: ((e: { matches: boolean }) => void)[];
  let systemDark: boolean;

  function create(): ThemeService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(ThemeService);
  }

  beforeEach(() => {
    listeners = [];
    systemDark = false;
    // jsdom has no matchMedia: install a controllable stub.
    (window as any).matchMedia = vi.fn(
      () =>
        ({
          get matches() {
            return systemDark;
          },
          addEventListener: (_: string, fn: any) => listeners.push(fn),
        }) as any,
    );
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
    document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).matchMedia;
  });

  it('follows the device by default (no data-theme set)', () => {
    systemDark = true;
    const theme = create();
    expect(theme.preference()).toBe('system');
    expect(theme.theme()).toBe('dark');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('switches live when the device setting changes', () => {
    const theme = create();
    expect(theme.theme()).toBe('light');
    listeners.forEach((fn) => fn({ matches: true }));
    expect(theme.theme()).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(THEME_CHROME_COLOR.dark);
  });

  it('an explicit choice overrides the device, is applied to <html>, and is remembered', () => {
    systemDark = true;
    const theme = create();
    theme.setPreference('light');
    expect(theme.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    const reopened = create();
    expect(reopened.preference()).toBe('light');
  });

  it('going back to "Auto" forgets the choice', () => {
    const theme = create();
    theme.setPreference('dark');
    theme.setPreference('system');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('ignores junk in storage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    expect(create().preference()).toBe('system');
  });

  it('still applies the choice when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const theme = create();
    expect(() => theme.setPreference('dark')).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
