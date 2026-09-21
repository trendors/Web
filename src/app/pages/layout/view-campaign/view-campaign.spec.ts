import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { ViewCampaign } from './view-campaign';
import { selectCampaignList } from '../../../store/campaign/campaign.selector';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { environment } from '../../../../environments/environment';
import { mockBrandUser, mockCampaigns } from '../../../core/testing/campaign.fixtures';

describe('ViewCampaign', () => {
  let component: ViewCampaign;
  let fixture: ComponentFixture<ViewCampaign>;
  let router: Router;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewCampaign],
      providers: [provideRouter([]), provideMockStore()],
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

  it('should list every campaign when the filter is "all"', async () => {
    const campaigns = await firstValueFrom(component.filteredCampaigns$);
    expect(campaigns).toHaveLength(3);
  });

  it('should filter campaigns by access type', async () => {
    component.setFilter('open');
    const campaigns = await firstValueFrom(component.filteredCampaigns$);
    expect(campaigns.map((c) => c.name)).toEqual(['GlowSkin Skincare Launch']);
  });

  it('should filter campaigns by search query', async () => {
    component.onSearchChange('campus');
    const campaigns = await firstValueFrom(component.filteredCampaigns$);
    expect(campaigns.map((c) => c.name)).toEqual(['Campus Reps Q3']);
  });

  it('should parse JSON-stringified platform entries', () => {
    expect(component.getPlatforms(mockCampaigns[0].platforms)).toEqual(['instagram', 'tiktok']);
    expect(component.getPlatforms(mockCampaigns[2].platforms)).toEqual(['twitter']);
  });

  it('should resolve a thumbnail for campaigns with files and none without', () => {
    expect(component.campaignImage(mockCampaigns[0])).toBe(
      `${environment.apiUrl}/uploads/campaigns/glowskin-hero.jpg`,
    );
    expect(component.campaignImage(mockCampaigns[1])).toBeNull();
  });

  it('openNewCampaign should navigate to /home/create-campaign', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.openNewCampaign();
    expect(navigateSpy).toHaveBeenCalledWith(['/home/create-campaign']);
  });

  it('openModal should navigate to the detail page of the clicked campaign', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.openModal(mockCampaigns[2]);
    expect(navigateSpy).toHaveBeenCalledWith(['/home/view-campaign', 3]);
  });

  it('createNew should navigate to /home/create-campaign', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.createNew();
    expect(navigateSpy).toHaveBeenCalledWith(['/home/create-campaign']);
  });
});
