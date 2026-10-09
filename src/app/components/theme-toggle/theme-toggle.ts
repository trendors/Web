import { Component, inject } from '@angular/core';
import { ThemePreference, ThemeService } from '../../core/services/theme/theme.service';

/** System / Light / Dark switch. */
@Component({
  selector: 'app-theme-toggle',
  template: `
    <div class="theme-toggle" role="radiogroup" aria-label="Appearance">
      @for (opt of options; track opt.value) {
        <button
          type="button"
          role="radio"
          class="theme-toggle__opt"
          [class.is-active]="theme.preference() === opt.value"
          [attr.aria-checked]="theme.preference() === opt.value"
          [title]="opt.title"
          (click)="theme.setPreference(opt.value)"
        >
          <i class="ti" [class]="'ti ' + opt.icon" aria-hidden="true"></i>
          <span>{{ opt.label }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .theme-toggle {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
      padding: 3px;
      border: 1px solid var(--border);
      border-radius: var(--radius-input);
      background: var(--surface-2);
    }
    .theme-toggle__opt {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      min-height: 34px;
      padding: 0 6px;
      border: 0;
      border-radius: calc(var(--radius-input) - 3px);
      background: transparent;
      color: var(--muted);
      font-size: var(--fs-caption);
      font-weight: 500;
      cursor: pointer;
    }
    .theme-toggle__opt:hover { color: var(--text); }
    .theme-toggle__opt.is-active {
      background: var(--surface);
      color: var(--text);
      box-shadow: var(--shadow-sm);
    }
    .theme-toggle__opt:focus-visible { outline: none; box-shadow: var(--focus-ring); }
  `,
})
export class ThemeToggle {
  readonly theme = inject(ThemeService);
  readonly options: { value: ThemePreference; label: string; icon: string; title: string }[] = [
    { value: 'system', label: 'Auto', icon: 'ti-device-desktop', title: 'Match your device' },
    { value: 'light', label: 'Light', icon: 'ti-sun', title: 'Light mode' },
    { value: 'dark', label: 'Dark', icon: 'ti-moon', title: 'Night mode' },
  ];
}
