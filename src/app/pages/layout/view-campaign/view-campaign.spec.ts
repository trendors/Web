import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { ViewCampaign } from './view-campaign';

describe('ViewCampaign', () => {
  let component: ViewCampaign;
  let fixture: ComponentFixture<ViewCampaign>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewCampaign],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewCampaign);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('openNewCampaign should navigate to /home/create-campaign', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.openNewCampaign();
    expect(navigateSpy).toHaveBeenCalledWith(['/home/create-campaign']);
  });

  it('createNew should navigate to /home/create-campaign', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.createNew();
    expect(navigateSpy).toHaveBeenCalledWith(['/home/create-campaign']);
  });
});
