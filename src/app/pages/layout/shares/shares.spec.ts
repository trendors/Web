import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore } from '@ngrx/store/testing';
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
      providers: [provideAppMockStore(), { provide: ShareService, useValue: { claimReward: vi.fn() } }],
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

  it('should only allow claiming pending shares past the 24h hold', () => {
    const byId = new Map(component.viewModels().map((vm) => [vm.id, vm]));
    expect(byId.get(1)?.canClaim).toBe(true);
    expect(byId.get(2)?.canClaim).toBe(false);
    expect(byId.get(3)?.canClaim).toBe(false);
  });

  it('should split earned (paid) from unclaimed totals', () => {
    expect(component.totalEarned).toBe(70);
    expect(component.totalUnclaimed).toBe(100);
  });
});
