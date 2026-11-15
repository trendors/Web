import { provideTestDefaults } from '../../core/testing/test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore } from '@ngrx/store/testing';
import { vi } from 'vitest';

import { UserInfoCard } from './user-info-card';
import { ProfileSummary, ProfileSummaryService } from '../../core/services/profile-summary/profile-summary.service';
import { ActiveProfileService } from '../../core/services/activeprofile.service';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';

const creator: ProfileSummary = { profile: 'creative', available: 9000, earned: 15000, active: 4, toDo: 2 };
const brand: ProfileSummary = { profile: 'brand', live: 13, creators: 5, paidOut: 22000, inEscrow: 48000 };

describe('UserInfoCard', () => {
  let component: UserInfoCard;
  let fixture: ComponentFixture<UserInfoCard>;
  let api: { get: ReturnType<typeof vi.fn> };
  let profiles: ActiveProfileService;

  async function openAs(profile: 'brand' | 'creative', answer: Promise<ProfileSummary> | ProfileSummary) {
    api.get.mockImplementation(() => Promise.resolve(answer));
    profiles.setActiveProfile(profile);
    fixture = TestBed.createComponent(UserInfoCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }
  const stats = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.stat-item')).map((el) => ({
    label: el.querySelector('.stat-label')?.textContent?.trim(),
    value: el.querySelector('.stat-value')?.textContent?.trim(),
    href: el.getAttribute('href'),
  }));
  const hint = () => {
    const el = (fixture.nativeElement as HTMLElement).querySelector('.card-hint');
    return el ? { text: el.textContent?.trim(), href: el.getAttribute('href') } : null;
  };
  const settle = async () => { await vi.waitFor(() => expect(component.summaryState()).not.toBe('loading')); fixture.detectChanges(); };

  beforeEach(async () => {
    localStorage.clear();
    api = { get: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [UserInfoCard],
      providers: [...provideTestDefaults(), { provide: ProfileSummaryService, useValue: api }],
    }).compileComponents();
    profiles = TestBed.inject(ActiveProfileService);
    // Someone with both profiles, so the card keeps whichever one the test picked.
    TestBed.inject(MockStore).overrideSelector(selectCurrentUser, { id: 1, brandProfile: { id: 2, brand_name: 'Acme' }, creativeProfile: { id: 3, first_name: 'Ada' } } as any);
  });

  it('should create', async () => {
    await openAs('creative', creator);
    expect(component).toBeTruthy();
  });

  describe('as a creator', () => {
    it('shows what can be withdrawn, what was earned, and what is going on', async () => {
      await openAs('creative', creator);
      await settle();
      expect(api.get).toHaveBeenCalledWith('creative');
      expect(stats()).toEqual([
        { label: 'Available', value: '₦9,000', href: '/home/profile?tab=wallet' },
        { label: 'Earned', value: '₦15,000', href: '/home/transactions' },
        { label: 'Active', value: '4', href: '/home/opportunities?tab=mine' },
      ]);
    });

    it('says how many things need them, with a link to where they are', async () => {
      await openAs('creative', creator);
      await settle();
      expect(hint()).toEqual({ text: '2 things need you', href: '/home/opportunities?tab=mine' });
    });

    it('uses the singular for one, and says nothing when nothing is waiting', async () => {
      await openAs('creative', { ...creator, toDo: 1 });
      await settle();
      expect(hint()?.text).toBe('1 thing needs you');
      await openAs('creative', { ...creator, toDo: 0 });
      await settle();
      expect(hint()).toBeNull();
    });
  });

  describe('as a brand', () => {
    it('shows what is live, who is working, what was paid and what is still held', async () => {
      await openAs('brand', brand);
      await settle();
      expect(api.get).toHaveBeenCalledWith('brand');
      expect(stats()).toEqual([
        { label: 'Live', value: '13', href: '/home/view-campaign' },
        { label: 'Creators', value: '5', href: '/home/view-campaign' },
        { label: 'Paid out', value: '₦22,000', href: '/home/transactions' },
      ]);
    });

    it('says how much is still held for creators', async () => {
      await openAs('brand', brand);
      await settle();
      expect(hint()).toEqual({ text: '₦48,000 held for creators', href: '/home/view-campaign' });
    });

    it('shows no held line when nothing is held', async () => {
      await openAs('brand', { ...brand, inEscrow: 0 });
      await settle();
      expect(hint()).toBeNull();
    });
  });

  describe('while the numbers load, and when they cannot', () => {
    it('shows a placeholder, never a made-up zero', async () => {
      let release!: (s: ProfileSummary) => void;
      await openAs('creative', new Promise<ProfileSummary>((r) => { release = r; }));
      expect(stats().map((s) => s.value)).toEqual(['…', '…', '…']);
      release(creator);
      await settle();
      expect(stats().map((s) => s.value)).toEqual(['₦9,000', '₦15,000', '4']);
    });

    it('shows a dash when they cannot be loaded', async () => {
      api.get.mockImplementation(() => Promise.reject(new Error('offline')));
      profiles.setActiveProfile('creative');
      fixture = TestBed.createComponent(UserInfoCard);
      component = fixture.componentInstance;
      fixture.detectChanges();
      await settle();
      expect(stats().map((s) => s.value)).toEqual(['—', '—', '—']);
    });
  });

  describe('switching profile', () => {
    it('loads the other profile\'s numbers', async () => {
      await openAs('creative', creator);
      await settle();
      api.get.mockImplementation(() => Promise.resolve(brand));
      profiles.setActiveProfile('brand');
      fixture.detectChanges();
      await vi.waitFor(() => expect(component.summary()?.profile).toBe('brand'));
      fixture.detectChanges();
      expect(stats().map((s) => s.label)).toEqual(['Live', 'Creators', 'Paid out']);
    });

    it('ignores a late answer for the profile that was just left', async () => {
      let late!: (s: ProfileSummary) => void;
      await openAs('creative', new Promise<ProfileSummary>((r) => { late = r; }));
      api.get.mockImplementation(() => Promise.resolve(brand));
      profiles.setActiveProfile('brand');
      fixture.detectChanges();
      await vi.waitFor(() => expect(component.summary()?.profile).toBe('brand'));
      late(creator); // the creator answer arrives after the switch
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.summary()?.profile).toBe('brand');
      expect(stats().map((s) => s.label)).toEqual(['Live', 'Creators', 'Paid out']);
    });
  });

  it('no longer shows the old made-up figures', async () => {
    await openAs('creative', creator);
    await settle();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('$');
    expect(text).not.toContain('Rate');
    expect(text).not.toContain('Shares');
    expect(text).toContain('View Profile');
  });

  it.each([
    [0, '₦0'], [9000, '₦9,000'], [447000, '₦447,000'], [999999, '₦999,999'], [1_250_000, '₦1.3M'], [12_000_000, '₦12M'], [1234.5, '₦1,234.5'], [null, '₦0'],
  ])('writes %j as %s', async (n, text) => {
    await openAs('creative', creator);
    expect(component.money(n as number)).toBe(text);
  });
});
