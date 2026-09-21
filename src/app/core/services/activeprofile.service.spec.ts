import { vi } from 'vitest';
import { ActiveProfileService } from './activeprofile.service';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  let store: Record<string, string> = { ...initial };
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

describe('ActiveProfileService', () => {
  let service: ActiveProfileService;

  const influencerOnly = { id: 101, creativeProfile: { first_name: 'Ada' } };
  const brandOnly = { id: 1, brandProfile: { brand_name: 'GlowSkin Inc' } };

  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    // No store in this environment: construction skips the subscription and
    // each init() call below mirrors one store emission.
    service = new ActiveProfileService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function setUser(user: unknown): void {
    service.init(user as any);
  }

  it('should select creative for an influencer-only login', () => {
    service.init(influencerOnly);
    expect(service.activeProfile()).toBe('creative');
  });

  it('should treat the backend influncerProfile as a creative profile', () => {
    service.init({ id: 10, brandProfile: null, creativeProfile: null, influncerProfile: { id: 7 } } as any);
    expect(service.activeProfile()).toBe('creative');
  });

  it('should select brand for a brand-only login', () => {
    service.init(brandOnly);
    expect(service.activeProfile()).toBe('brand');
  });

  it('should correct itself when relations arrive after a bare login payload', () => {
    // Login payload without relations defaults brand-first…
    service.init({ id: 101 } as any);
    expect(service.activeProfile()).toBe('brand');
    // …then the refreshed full user flips an influencer-only account to creative.
    service.init(influencerOnly);
    expect(service.activeProfile()).toBe('creative');
  });

  it('should preserve a stored choice when the user carries no relations (post-refresh payload)', () => {
    // What you set in DevTools → Application → Local Storage must survive a
    // refresh, even though the hydrated user has no relations to validate with.
    localStorage.setItem('activeProfile', 'creative');
    service.init({ id: 101 } as any);
    expect(service.activeProfile()).toBe('creative');
    expect(localStorage.getItem('activeProfile')).toBe('creative');
  });

  it('should not keep a stale brand choice after switching to an influencer-only account', () => {
    localStorage.setItem('activeProfile', 'brand');
    service.init(influencerOnly);
    expect(service.activeProfile()).toBe('creative');
    expect(localStorage.getItem('activeProfile')).toBe('creative');
  });

  it('should not keep a stale creative choice after switching to a brand-only account', () => {
    localStorage.setItem('activeProfile', 'creative');
    service.init(brandOnly);
    expect(service.activeProfile()).toBe('brand');
  });

  it('should keep a stored choice that is still valid', () => {
    localStorage.setItem('activeProfile', 'creative');
    service.init({ brandProfile: { brand_name: 'X' }, creativeProfile: { first_name: 'Ada' } });
    expect(service.activeProfile()).toBe('creative');
  });

  it('should default to brand when the user has both profiles and nothing stored', () => {
    service.init({ brandProfile: { brand_name: 'X' }, creativeProfile: { first_name: 'Ada' } });
    expect(service.activeProfile()).toBe('brand');
  });

  it('should reset on logout', () => {
    service.init(influencerOnly);
    expect(service.activeProfile()).toBe('creative');
    service.init(null);
    expect(service.activeProfile()).toBeNull();
  });
});
