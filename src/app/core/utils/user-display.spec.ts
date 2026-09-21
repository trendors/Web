import { hasBrandProfile, hasCreativeProfile, userDisplayName, userFirstName, userLastName } from './user-display';
import type { User } from '../api/model/user';

describe('user display names', () => {
  it('should prefer the creative profile', () => {
    const user: User = {
      user_name: 'ada.okafor',
      creativeProfile: { first_name: 'Ada', last_name: 'Okafor' },
      brandProfile: { brand_name: 'GlowSkin Inc', contact_name: 'Someone Else' },
    };
    expect(userFirstName(user)).toBe('Ada');
    expect(userLastName(user)).toBe('Okafor');
    expect(userDisplayName(user)).toBe('Ada Okafor');
  });

  it('should split the brand contact name for brand-only users', () => {
    const user: User = {
      user_name: 'glowskin.hq',
      email: 'hello@glowskin.example',
      brandProfile: { brand_name: 'GlowSkin Inc', contact_name: 'Adaeze Obi' },
    };
    expect(userFirstName(user)).toBe('Adaeze');
    expect(userLastName(user)).toBe('Obi');
    expect(userDisplayName(user)).toBe('Adaeze Obi');
  });

  it('should read the misspelled influncerProfile and top-level names (real backend shape)', () => {
    const user = {
      id: 10,
      first_name: 'Zainab',
      last_name: 'Bello',
      user_name: 'zainab_styles',
      email: 'influencer@mail.com',
      brandProfile: null,
      creativeProfile: null,
      influncerProfile: { id: 7, first_name: 'Zainab', last_name: 'Bello' },
    };
    expect(hasCreativeProfile(user)).toBe(true);
    expect(hasBrandProfile(user)).toBe(false);
    expect(userFirstName(user)).toBe('Zainab');
    expect(userLastName(user)).toBe('Bello');
    expect(userDisplayName(user)).toBe('Zainab Bello');
  });

  it('should ignore empty profile objects', () => {
    const user = { brandProfile: {}, creativeProfile: {} };
    expect(hasBrandProfile(user)).toBe(false);
    expect(hasCreativeProfile(user)).toBe(false);
  });

  it('should handle single-word contact names and whitespace', () => {
    const user: User = { brandProfile: { contact_name: '  Madonna  ' } };
    expect(userFirstName(user)).toBe('Madonna');
    expect(userLastName(user)).toBe('');
    expect(userDisplayName(user)).toBe('Madonna');
  });

  it('should fall back to user_name and email prefix', () => {
    expect(userFirstName({ user_name: 'trendors.brand' } as User)).toBe('trendors.brand');
    expect(userFirstName({ email: 'hello@example.com' } as User)).toBe('hello');
    expect(userLastName({ user_name: 'trendors.brand' } as User)).toBe('');
  });

  it('should never render blank', () => {
    expect(userFirstName(null)).toBe('');
    expect(userLastName(undefined)).toBe('');
    expect(userDisplayName(null)).toBe('User');
    expect(userDisplayName({} as User)).toBe('User');
  });
});
