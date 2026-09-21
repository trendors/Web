import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { ViewCampaign } from './view-campaign';
import { CampaignInfluencerService } from '../../../core/api';
import { selectCampaignList } from '../../../store/campaign/campaign.selector';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { environment } from '../../../../environments/environment';
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewCampaign],
      providers: [
        provideRouter([]),
        provideMockStore(),
        { provide: CampaignInfluencerService, useValue: rosterApi },
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
});
