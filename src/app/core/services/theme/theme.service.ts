import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';
/** Browser/OS chrome colour per theme (address bar, Android task switcher). */
export const THEME_CHROME_COLOR: Record<Theme, string> = { light: '#ffffff', dark: '#0f1115' };

/**
 * Night mode. The preference is stored per device; "system" follows the
 * device setting live. Applying a theme only sets `data-theme` on <html>:
 * the colour tokens in styles.scss do the rest. index.html applies the stored
 * choice before Angular starts, so there is no light flash on load.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly media = this.isBrowser ? this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)') ?? null : null;

  private readonly systemDark = signal(this.media?.matches ?? false);
  readonly preference = signal<ThemePreference>(this.readStored());
  /** The theme actually showing. */
  readonly theme = computed<Theme>(() => {
    const pref = this.preference();
    return pref === 'system' ? (this.systemDark() ? 'dark' : 'light') : pref;
  });

  constructor() {
    this.media?.addEventListener?.('change', (e) => {
      this.systemDark.set(e.matches);
      this.applyChrome();
    });
    this.apply();
  }

  setPreference(pref: ThemePreference): void {
    this.preference.set(pref);
    try {
      if (pref === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      // storage blocked (private mode): the choice still applies for this visit
    }
    this.apply();
  }

  private readStored(): ThemePreference {
    if (!this.isBrowser) return 'system';
    try {
      const v = localStorage.getItem(THEME_STORAGE_KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch {
      return 'system';
    }
  }

  private apply(): void {
    if (!this.isBrowser) return;
    const root = this.doc.documentElement;
    const pref = this.preference();
    if (pref === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', pref);
    this.applyChrome();
  }

  /** Keep the browser/OS chrome in step (the media-specific metas only cover "system"). */
  private applyChrome(): void {
    if (!this.isBrowser) return;
    const color = THEME_CHROME_COLOR[this.theme()];
    this.doc.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color));
  }
}
