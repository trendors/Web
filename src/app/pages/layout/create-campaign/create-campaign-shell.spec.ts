import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { CreateCampaignShell } from './create-campaign-shell';

@Component({ template: '<p>package wizard</p>' }) class PackageStub {}
@Component({ template: '<p>share wizard</p>' }) class ShareStub {}

describe('CreateCampaignShell', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateCampaignShell],
      providers: [
        provideRouter([
          {
            path: 'home/create-campaign',
            component: CreateCampaignShell,
            children: [
              { path: '', redirectTo: 'package', pathMatch: 'full' },
              { path: 'package', component: PackageStub },
              { path: 'share', component: ShareStub },
            ],
          },
        ]),
      ],
    }).compileComponents();
    harness = await RouterTestingHarness.create();
  });

  const el = () => harness.routeNativeElement as HTMLElement;
  const tabs = () => Array.from(el().querySelectorAll('.kinds__tab')) as HTMLAnchorElement[];

  it('offers a Package tab and a Share tab, and nothing else', async () => {
    await harness.navigateByUrl('/home/create-campaign/package');
    expect(tabs().map((t) => t.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Package', 'Share Coming soon']);
  });

  it('opens on the Package tab by default', async () => {
    await harness.navigateByUrl('/home/create-campaign');
    expect(TestBed.inject(Router).url).toBe('/home/create-campaign/package');
    expect(el().textContent).toContain('package wizard');
    expect(tabs()[0].classList).toContain('is-on');
    expect(tabs()[0].getAttribute('aria-current')).toBe('page');
    expect(tabs()[1].classList).not.toContain('is-on');
  });

  it('tags only the Share tab as coming soon', async () => {
    await harness.navigateByUrl('/home/create-campaign/package');
    expect(tabs()[0].querySelector('.kinds__soon')).toBeNull();
    expect(tabs()[1].querySelector('.kinds__soon')?.textContent?.trim()).toBe('Coming soon');
  });

  it('still lets a brand open the Share tab', async () => {
    await harness.navigateByUrl('/home/create-campaign/package');
    tabs()[1].click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/home/create-campaign/share');
    expect(el().textContent).toContain('share wizard');
    expect(tabs()[1].classList).toContain('is-on');
    expect(tabs()[0].classList).not.toContain('is-on');
  });

  it('keeps the tabs in view whichever kind is open', async () => {
    await harness.navigateByUrl('/home/create-campaign/share');
    expect(tabs()).toHaveLength(2);
  });
});
