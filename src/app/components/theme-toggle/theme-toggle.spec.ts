import { TestBed } from '@angular/core/testing';
import { ThemeToggle } from './theme-toggle';
import { ThemeService } from '../../core/services/theme/theme.service';

describe('ThemeToggle', () => {
  it('shows Auto / Light / Dark and switches the preference', async () => {
    TestBed.configureTestingModule({ imports: [ThemeToggle] });
    const fixture = TestBed.createComponent(ThemeToggle);
    fixture.detectChanges();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.map((b) => b.textContent!.trim())).toEqual(['Auto', 'Light', 'Dark']);

    buttons[2].click();
    fixture.detectChanges();
    expect(TestBed.inject(ThemeService).preference()).toBe('dark');
    expect(buttons[2].getAttribute('aria-checked')).toBe('true');
    expect(buttons[0].getAttribute('aria-checked')).toBe('false');

    TestBed.inject(ThemeService).setPreference('system');
  });
});
