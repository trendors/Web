// active-profile.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { hasBrandProfile, hasCreativeProfile } from '../utils/user-display';

export type ProfileType = 'brand' | 'creative';

export interface UserProfiles {
  brandProfile?: unknown;
  creativeProfile?: unknown;
}

const STORAGE_KEY = 'activeProfile';

@Injectable({ providedIn: 'root' })
export class ActiveProfileService {
  private readonly _activeProfile = signal<ProfileType | null>(null);
  private readonly _hasBrand = signal(false);
  private readonly _hasCreative = signal(false);

  // Read-only signals for consumers — nobody outside this service can .set() these
  readonly activeProfile = this._activeProfile.asReadonly();
  readonly hasBothProfiles = computed(() => this._hasBrand() && this._hasCreative());
  readonly hasOnlyBrandProfile = computed(() => this._hasBrand() && !this._hasCreative());

  /**
   * Pick the active profile for the given user:
   * - brand-only → brand, creative-only → creative (no toggle involved);
   * - both → the stored toggle choice, defaulting to brand;
   * - a stored choice is also kept when there is nothing to check it against
   *   (bare login payload hydrated after a refresh), so a refresh never
   *   clobbers it with a blind default.
   * Safe to call often (every user emission).
   */
  init(user: UserProfiles | null | undefined): void {
    if (!user) {
      this._hasBrand.set(false);
      this._hasCreative.set(false);
      this._activeProfile.set(null);
      // Stored preference is intentionally left alone here: init(null) can run
      // while the user is still loading, and we don't want to wipe it on reload.
      // Storage is cleared on explicit logout instead.
      return;
    }

    this._hasBrand.set(hasBrandProfile(user));
    this._hasCreative.set(hasCreativeProfile(user));

    const stored = this.readStoredProfile();
    if (stored && (!this.hasAnyProfile(user) || this.isValid(stored, user))) {
      this._activeProfile.set(stored);
      return;
    }

    this.setActiveProfile(hasCreativeProfile(user) && !hasBrandProfile(user) ? 'creative' : 'brand');
  }

  /** Manual toggle between the user's profiles; persists the choice. */
  setActiveProfile(profile: ProfileType): void {
    this._activeProfile.set(profile);
    this.writeStoredProfile(profile);
  }

  private isValid(profile: ProfileType, user: UserProfiles): boolean {
    return profile === 'brand' ? hasBrandProfile(user) : hasCreativeProfile(user);
  }

  private hasAnyProfile(user: UserProfiles): boolean {
    return hasBrandProfile(user) || hasCreativeProfile(user);
  }

  private isProfileType(value: unknown): value is ProfileType {
    return value === 'brand' || value === 'creative';
  }

  private readStoredProfile(): ProfileType | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return this.isProfileType(raw) ? raw : null;
    } catch {
      return null;
    }
  }

  private writeStoredProfile(profile: ProfileType): void {
    try {
      localStorage.setItem(STORAGE_KEY, profile);
    } catch {
      // Storage unavailable — the in-memory signal still works for this session
    }
  }
}