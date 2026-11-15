import { Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { NichesService } from '../../core/services/creator/niches.service';
import { PackageCampaignService } from '../../core/services/package/package-campaign.service';
import { ActiveProfileService } from '../../core/services/activeprofile.service';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { allDone, brandSteps, creatorSteps, CreatorFacts, Step } from './get-started.logic';

const dismissKey = (userId: unknown, role: string) => `getStarted:${userId}:${role}`;

/** A quiet "what to do first" card. It goes away for good once every step is done, or when the person hides it. */
@Component({
  selector: 'app-get-started',
  imports: [RouterLink],
  styleUrl: './get-started.scss',
  template: `
    @if (visible()) {
      <section class="gs ui-card" aria-label="Get started">
        <header class="gs__head">
          <div>
            <h2 class="gs__title">{{ role() === 'creative' ? 'Get set up to earn' : 'Get started' }}</h2>
            <p class="gs__sub">{{ remaining() }} {{ remaining() === 1 ? 'step' : 'steps' }} left</p>
          </div>
          <button type="button" class="gs__hide" (click)="hide()">Hide</button>
        </header>
        <ol class="gs__steps">
          @for (s of steps(); track s.id) {
            <li class="gs__step" [class.gs__step--done]="s.done">
              <span class="gs__tick" aria-hidden="true">{{ s.done ? '✓' : '' }}</span>
              <a class="gs__body" [routerLink]="s.link" [queryParams]="s.query">
                <span class="gs__name">{{ s.title }}<span class="sr-only">{{ s.done ? ' (done)' : '' }}</span></span>
                @if (!s.done) { <span class="gs__hint">{{ s.hint }}</span> }
              </a>
            </li>
          }
        </ol>
      </section>
    }
  `,
})
export class GetStarted {
  private store = inject(Store);
  private niches = inject(NichesService);
  private packages = inject(PackageCampaignService);

  private user = this.store.selectSignal(selectCurrentUser);
  role = inject(ActiveProfileService).activeProfile;

  private facts = signal<CreatorFacts>({ xConnected: false, nichesCount: 0, matchCount: null, applied: false, bankAdded: false });
  private hidden = signal(false);
  private loaded = signal(false);

  steps = (): Step[] => {
    if (this.role() === 'creative') return creatorSteps(this.facts());
    return this.role() === 'brand' ? brandSteps() : [];
  };
  remaining = () => this.steps().filter((s) => !s.done).length;
  visible = () => this.steps().length > 0 && !this.hidden() && (this.role() !== 'creative' || (this.loaded() && !allDone(this.steps())));

  constructor() {
    // Re-read when the account or the active profile changes.
    effect(() => {
      const u: any = this.user();
      const role = this.role();
      if (!u?.id || !role) return;
      untracked(() => {
        this.hidden.set(this.wasHidden(u.id, role));
        if (role === 'creative') void this.loadCreator(u);
      });
    });
  }

  hide(): void {
    const u: any = this.user();
    try { localStorage.setItem(dismissKey(u?.id, this.role() ?? ''), '1'); } catch { /* private mode: it just comes back next visit */ }
    this.hidden.set(true);
  }

  private wasHidden(userId: unknown, role: string): boolean {
    try { return localStorage.getItem(dismissKey(userId, role)) === '1'; } catch { return false; }
  }

  private async loadCreator(u: any): Promise<void> {
    const xConnected = !!u.twitter_handle || (Array.isArray(u.users_media_data) && u.users_media_data.some((m: any) => m?.social_media_name === 'twitter'));
    const bankAdded = !!u.paystackRecipientCode;
    this.facts.update((f) => ({ ...f, xConnected, bankAdded }));
    // Each lookup is independent: one failing must not hide the card or block the others.
    const [niches, discover, mine] = await Promise.allSettled([this.niches.load(), this.packages.discover(false), this.packages.mine()]);
    this.facts.update((f) => ({
      ...f,
      nichesCount: niches.status === 'fulfilled' ? niches.value.length : f.nichesCount,
      matchCount: discover.status === 'fulfilled' ? (discover.value?.eligible?.length ?? 0) : f.matchCount,
      applied: mine.status === 'fulfilled' ? (mine.value?.length ?? 0) > 0 : f.applied,
    }));
    this.loaded.set(true);
  }
}
