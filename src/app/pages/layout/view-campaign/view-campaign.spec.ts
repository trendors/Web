import { provideAppMockStore } from '../../../core/testing/mock-store';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { MockStore } from '@ngrx/store/testing';

import { ViewCampaign } from './view-campaign';
import { CampaignInfluencerService } from '../../../core/api';
import { selectCampaignList } from '../../../store/campaign/campaign.selector';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { environment } from '../../../../environments/environment';
import { PackageCampaignService } from '../../../core/services/package/package-campaign.service';
import {
  mockBrandUser,
  mockCampaigns,
  rosterEnvelopeFor,
} from '../../../core/testing/campaign.fixtures';

describe('ViewCampaign', () => {
  let component: ViewCampaign;
  let fixture: ComponentFixture<ViewCampaign>;
  let router: Router;
  let store: MockStore;

  const rosterApi = {
    campaignInfluencerControllerFindByCampaign: vi.fn((campaignId: number) =>
      of(rosterEnvelopeFor(campaignId)),
    ),
  };

  const packageApi = { roster: vi.fn(async (_id: number): Promise<unknown[]> => []) };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewCampaign],
      providers: [
        provideRouter([]),
        provideAppMockStore(),
        { provide: CampaignInfluencerService, useValue: rosterApi },
        { provide: PackageCampaignService, useValue: packageApi },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(selectCampaignList, mockCampaigns);
    store.overrideSelector(selectCurrentUser, mockBrandUser as any);

    fixture = TestBed.createComponent(ViewCampaign);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should list every campaign when the platform filter is "all"', async () => {
    const campaigns = await firstValueFrom(component.filteredCampaigns$);
    expect(campaigns).toHaveLength(3);
  });

  it('should filter campaigns by platform', async () => {
    component.setPlatform('instagram');
    const campaigns = await firstValueFrom(component.filteredCampaigns$);
    expect(campaigns.map((c) => c.name)).toEqual(['GlowSkin Skincare Launch']);
  });

  it('should sort newest first by default and oldest on toggle', async () => {
    const newest = await firstValueFrom(component.filteredCampaigns$);
    expect(newest.map((c) => c.id)).toEqual([1, 3, 2]);
    component.toggleSort();
    const oldest = await firstValueFrom(component.filteredCampaigns$);
    expect(oldest.map((c) => c.id)).toEqual([2, 3, 1]);
  });

  it('should derive distinct platform options from the campaigns', async () => {
    const options = await firstValueFrom(component.platformOptions$);
    expect(options).toEqual(['instagram', 'tiktok', 'twitter', 'youtube']);
  });

  it('should count influencers per campaign from the roster endpoint', () => {
    expect(rosterApi.campaignInfluencerControllerFindByCampaign).toHaveBeenCalledWith(1, false, 'body', false, {
      transferCache: false,
    });
    expect(component.countsFor(1)).toEqual({ total: 5, active: 2, done: 1 });
    expect(component.countsFor(2)).toEqual({ total: 1, active: 0, done: 0 });
    expect(component.countsFor(3)).toEqual({ total: 0, active: 0, done: 0 });
    expect(component.enrolledTotal()).toBe(6);
  });

  it('counts a package campaign from its own roster, and not the old records', async () => {
    rosterApi.campaignInfluencerControllerFindByCampaign.mockClear();
    packageApi.roster.mockResolvedValue([
      { id: 1, state: 'applied' }, { id: 2, state: 'selected' }, { id: 3, state: 'active' }, { id: 4, state: 'active' },
      { id: 5, state: 'completed' }, { id: 6, state: 'declined' }, { id: 7, state: 'not_selected' },
    ]);
    store.overrideSelector(selectCampaignList, [{ ...mockCampaigns[0], id: 48, is_package: true }]);
    store.refreshState();
    await fixture.whenStable();
    expect(packageApi.roster).toHaveBeenCalledWith(48);
    expect(rosterApi.campaignInfluencerControllerFindByCampaign).not.toHaveBeenCalledWith(48, expect.anything(), expect.anything(), expect.anything(), expect.anything());
    expect(component.countsFor(48)).toEqual({ total: 5, active: 2, done: 1 });
  });

  it('should parse JSON-wrapped and plain platform entries', () => {
    expect(component.getPlatforms(mockCampaigns[0].platforms)).toEqual(['instagram', 'tiktok']);
    expect(component.getPlatforms(mockCampaigns[2].platforms)).toEqual(['twitter']);
  });

  it('should format date ranges from real fields', () => {
    expect(component.formatDateRange(mockCampaigns[0])).toBe('Mar 1 – Apr 30, 2026');
    expect(component.formatDateRange(mockCampaigns[2])).toBe('No dates set');
  });

  it('should resolve a thumbnail for campaigns with files and none without', () => {
    expect(component.campaignImage(mockCampaigns[0])).toBe(
      `${environment.apiUrl}/uploads/campaigns/glowskin-hero.jpg`,
    );
    expect(component.campaignImage(mockCampaigns[1])).toBeNull();
  });

  it('openModal should navigate to the detail page of the clicked campaign', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.openModal(mockCampaigns[2]);
    expect(navigateSpy).toHaveBeenCalledWith(['/home/view-campaign', 3]);
  });

  it('opens a share campaign on how its shares are going', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.openModal({ ...mockCampaigns[2], is_share: true });
    expect(navigateSpy).toHaveBeenCalledWith(['/home/share-campaign', 3]);
  });

  it('labels package and share campaigns in the list, and leaves the rest alone', async () => {
    store.overrideSelector(selectCampaignList, [
      { ...mockCampaigns[0], id: 1, name: 'Plain', is_package: false, is_share: false },
      { ...mockCampaigns[0], id: 2, name: 'Pkg', is_package: true },
      { ...mockCampaigns[0], id: 3, name: 'Sh', is_share: true },
    ]);
    store.refreshState();
    await fixture.whenStable();
    fixture.detectChanges();
    const chips = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.campaign-name')).map((n) => n.querySelector('.kind-chip')?.textContent?.trim() ?? null);
    expect(chips).toEqual([null, 'Package', 'Share']);
  });

  it('opens a package campaign on its own management page', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.openModal({ ...mockCampaigns[2], is_package: true });
    expect(navigateSpy).toHaveBeenCalledWith(['/home/plan', 3]);
  });
});
