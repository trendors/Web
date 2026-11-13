import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PlanWizard } from './plan-wizard';
import { PackageCampaignService } from '../../../core/services/package/package-campaign.service';
import { ToastService } from '../../../components/toast/toast.service';

describe('PlanWizard', () => {
  const setup = () => {
    const api = { packages: async () => [], connectablePlatforms: async () => ['twitter'] };
    TestBed.configureTestingModule({
      imports: [PlanWizard],
      providers: [provideRouter([]), { provide: PackageCampaignService, useValue: api }, { provide: ToastService, useValue: { show: () => undefined } }],
    });
    return TestBed.createComponent(PlanWizard).componentInstance;
  };

  it('notices the package changing after the page is already showing', () => {
    // A computed() over the plain form object kept the first answer (no package) forever.
    const wizard = setup();
    wizard.packages.set([{ key: 'basic', name: 'Basic', base_fee: 3000 } as any, { key: 'starter', name: 'Starter', base_fee: 6000 } as any]);
    expect(wizard.chosenPackage()).toBeNull();
    expect(wizard.priced()).toBe(false);
    wizard.form.package_key = 'basic';
    expect(wizard.chosenPackage()?.name).toBe('Basic');
    expect(wizard.priced()).toBe(true);
    wizard.form.package_key = 'starter';
    expect(wizard.chosenPackage()?.name).toBe('Starter');
  });

  it('locks platforms creators cannot connect, unless already on the draft', () => {
    const wizard = setup();
    wizard.connectable.set(['twitter']);
    expect(wizard.platformLocked('instagram')).toBe(true);
    expect(wizard.platformLocked('twitter')).toBe(false);
    wizard.form.platforms = ['instagram'];
    expect(wizard.platformLocked('instagram')).toBe(false); // can still be removed
    expect(wizard.unavailableChosen()).toEqual(['instagram']);
  });

  it('asks for a package before leaving step 1', async () => {
    const wizard = setup();
    await wizard.next();
    expect(wizard.problems()).toEqual(['Choose a package to continue.']);
    expect(wizard.step()).toBe(0);
  });
});
