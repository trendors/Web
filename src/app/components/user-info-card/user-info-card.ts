import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { Store } from '@ngrx/store';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ProfileSummary, ProfileSummaryService } from '../../core/services/profile-summary/profile-summary.service';
import { ActiveProfileService } from '../../core/services/activeprofile.service';
import { hasBrandProfile, hasCreativeProfile } from '../../core/utils/user-display';

@Component({
  selector: 'app-user-info-card',
  imports: [CommonModule, AsyncPipe, RouterLink],
  templateUrl: './user-info-card.html',
  styleUrls: ['./user-info-card.scss'],
})
export class UserInfoCard {
  private store = inject(Store);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  user$ = this.store.select(selectCurrentUser);

  private summaryApi = inject(ProfileSummaryService);

  /** The real numbers for the profile in use. Null while loading or if they could not be loaded. */
  readonly summary = signal<ProfileSummary | null>(null);
  readonly summaryState = signal<'loading' | 'ready' | 'failed'>('loading');

  constructor() {
    // Reload whenever the person switches between their creator and brand profiles.
    effect(() => {
      const profile = this.activeProfile();
      if (profile) void this.loadSummary(profile);
    });
  }

  private async loadSummary(profile: 'brand' | 'creative'): Promise<void> {
    this.summary.set(null);
    this.summaryState.set('loading');
    try {
      const result = await this.summaryApi.get(profile);
      // A late answer for the profile they just left must not overwrite the one on screen.
      if (this.activeProfile() !== profile) return;
      this.summary.set(result);
      this.summaryState.set('ready');
    } catch {
      if (this.activeProfile() !== profile) return;
      this.summaryState.set('failed');
    }
  }

  /** ₦ with thousands separators; millions are shortened so it fits the card. */
  money(value: number | null | undefined): string {
    const n = Number(value ?? 0);
    if (n >= 1_000_000) return `₦${Number((n / 1_000_000).toFixed(1))}M`;
    return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
  }

  // What each slot reads from the summary. Each ignores a summary that belongs to the other profile.
  readonly brandLive = (s: ProfileSummary) => (s.profile === 'brand' ? String(s.live) : '—');
  readonly brandCreators = (s: ProfileSummary) => (s.profile === 'brand' ? String(s.creators) : '—');
  readonly brandPaidOut = (s: ProfileSummary) => (s.profile === 'brand' ? this.money(s.paidOut) : '—');
  readonly creatorAvailable = (s: ProfileSummary) => (s.profile === 'creative' ? this.money(s.available) : '—');
  readonly creatorEarned = (s: ProfileSummary) => (s.profile === 'creative' ? this.money(s.earned) : '—');
  readonly creatorActive = (s: ProfileSummary) => (s.profile === 'creative' ? String(s.active) : '—');

  /** Money still held in escrow for creators, shown under "Paid out", when there is any. */
  brandHeld(): string | null {
    const s = this.summary();
    return s?.profile === 'brand' && s.inEscrow > 0 ? this.money(s.inEscrow) : null;
  }

  /** How many things wait on the creator, shown under "Active", when any do. */
  creatorToDo(): number {
    const s = this.summary();
    return s?.profile === 'creative' ? s.toDo : 0;
  }

  /** A number for a stat slot: the value, or a placeholder while loading and a dash if it failed. */
  show(read: (s: ProfileSummary) => string): string {
    const s = this.summary();
    if (s) return read(s);
    return this.summaryState() === 'failed' ? '—' : '…';
  }

  // some.component.ts
  private profileService = inject(ActiveProfileService);
  activeProfile = this.profileService.activeProfile;       // signal
  hasBothProfiles = this.profileService.hasBothProfiles;    // computed signal




  // Observable that emits whether both profiles exist
  hasBothProfiles$ = this.user$.pipe(
    map((user) => hasBrandProfile(user) && hasCreativeProfile(user)),
  );

  // Observable that emits whether only brand profile exists
  hasOnlyBrandProfile$ = this.user$.pipe(
    map((user) => hasBrandProfile(user) && !hasCreativeProfile(user)),
  );

  // Observable that emits whether only creative profile exists
  hasOnlyCreativeProfile$ = this.user$.pipe(
    map((user) => !hasBrandProfile(user) && hasCreativeProfile(user)),
  );

  setActiveProfile(profile: 'brand' | 'creative') {
    this.profileService.setActiveProfile(profile);
  }

  toggleProfile() {
    if (this.activeProfile() === 'brand') {
      this.profileService.setActiveProfile('creative');
    } else if (this.activeProfile() === 'creative') {
      this.profileService.setActiveProfile('brand');
    }
  }

  ngOnInit() {
    this.user$ = this.store.select(selectCurrentUser);
    // Re-run profile selection on every user emission (not just the first):
    // the login payload often lacks relations, which arrive later via refresh.
    // init() keeps a stored choice whenever it is still valid, so manual
    // toggles are never clobbered.
    this.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      this.initializeActiveProfile(user);
    });
  }


  private initializeActiveProfile(user: any) {
    // Single source of truth lives in the service: it re-evaluates the stored
    // preference against this user's actual profiles (brand-only logins must
    // not inherit a stale 'creative' choice and vice versa).
    this.profileService.init(user);
  }

  routeTo(path: string) {
    this.router.navigate([path]);
  }
}
