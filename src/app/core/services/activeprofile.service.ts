// active-profile.service.ts
import { Injectable, signal, computed } from '@angular/core';

export type ProfileType = 'brand' | 'creative';

@Injectable({ providedIn: 'root' })
export class ActiveProfileService {
  private readonly _activeProfile = signal<ProfileType | null>(null);
  private readonly _hasBrand = signal(false);
  private readonly _hasCreative = signal(false);

  // Read-only signals for consumers — nobody outside this service can .set() these
  readonly activeProfile = this._activeProfile.asReadonly();
  readonly hasBothProfiles = computed(() => this._hasBrand() && this._hasCreative());
  readonly hasOnlyBrandProfile = computed(() => this._hasBrand() && !this._hasCreative());

  /** Call once when the user loads, e.g. from an app-init resolver or your user store. */
  init(user: { brandProfile?: unknown; creativeProfile?: unknown }) {
    this._hasBrand.set(!!user.brandProfile);
    this._hasCreative.set(!!user.creativeProfile);

    const stored = localStorage.getItem('activeProfile') as ProfileType | null;
    const fallback = user.brandProfile ? 'brand' : 'creative';
    this._activeProfile.set(stored && this.isValid(stored, user) ? stored : fallback);
  }

  setActiveProfile(profile: ProfileType) {
    this._activeProfile.set(profile);
    localStorage.setItem('activeProfile', profile);
  }

  private isValid(profile: ProfileType, user: any) {
    return profile === 'brand' ? !!user.brandProfile : !!user.creativeProfile;
  }
}