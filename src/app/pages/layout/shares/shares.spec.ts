import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { SharesDashboard } from './shares';
import { provideAppMockStore } from '../../../core/testing/mock-store';
import { ShareService } from '../../../core/services/shares/share.service';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { selectFilteredShares } from '../../../store/shares/shares.selector';

describe('SharesDashboard', () => {
  let component: SharesDashboard;
  let fixture: ComponentFixture<SharesDashboard>;
  let store: MockStore;

  const hour = 60 * 60 * 1000;
  const shares = [
    { id: 1, status: 'pending', paid: false, rewardAmount: 50, createdAt: new Date(Date.now() - 25 * hour).toISOString() },
    { id: 2, status: 'pending', paid: false, rewardAmount: 50, createdAt: new Date(Date.now() - 1 * hour).toISOString() },
    { id: 3, status: 'completed', paid: true, rewardAmount: 70, createdAt: new Date(Date.now() - 48 * hour).toISOString() },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharesDashboard],
      providers: [provideRouter([]), provideAppMockStore(), { provide: ShareService, useValue: { claimReward: vi.fn() } }],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(selectCurrentUser, { id: 1 } as any);
    store.overrideSelector(selectFilteredShares, shares as any);
    fixture = TestBed.createComponent(SharesDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => store.resetSelectors());

  it('offers no claim on any share, however old: the flat reward has ended', () => {
    expect(component.viewModels().map((vm) => vm.canClaim)).toEqual([false, false, false]);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Claim ₦');
    expect((fixture.nativeElement as HTMLElement).querySelector('.btn-claim')).toBeNull();
  });

  it('says the reward has ended and where earning is now', () => {
    const notice = (fixture.nativeElement as HTMLElement).querySelector('.shares-notice');
    expect(notice?.textContent).toContain('The flat share reward has ended');
    expect(notice?.textContent).toContain('Share & earn');
    expect(notice?.querySelector('a')?.getAttribute('href')).toBe('/home');
  });

  it('keeps the earlier shares as a read-only list, with no dollar totals', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.share-card')).toHaveLength(3);
    expect(el.textContent).toContain('Earlier shares');
    expect(el.textContent).not.toContain('$');
    expect(el.textContent).not.toContain('Unclaimed');
    expect(el.querySelectorAll('button')).toHaveLength(0);
  });

  it('shows what was paid only for shares that were paid', () => {
    const rewards = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.reward-val')).map((e) => e.textContent?.trim());
    expect(rewards).toEqual(['+₦70']);
  });

  it('labels unpaid shares "Recorded" rather than waiting for a claim', () => {
    expect(component.getStatusLabel({ status: 'pending', paid: false })).toBe('Recorded');
    expect(component.getStatusLabel({ paid: true })).toBe('Claimed');
    expect(component.getStatusLabel({ status: 'rejected' })).toBe('Rejected');
  });
});
