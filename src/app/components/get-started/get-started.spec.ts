import { TestBed } from '@angular/core/testing';
import { provideAppMockStore } from '../../core/testing/mock-store';
import { provideTestDefaults } from '../../core/testing/test-providers';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { ActiveProfileService } from '../../core/services/activeprofile.service';
import { NichesService } from '../../core/services/creator/niches.service';
import { PackageCampaignService } from '../../core/services/package/package-campaign.service';
import { GetStarted } from './get-started';

describe('GetStarted', () => {
  const setup = async (user: any, role: 'brand' | 'creative', over: { niches?: string[]; eligible?: number; mine?: number } = {}) => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [GetStarted],
      providers: [...provideTestDefaults(), provideAppMockStore({ selectors: [{ selector: selectCurrentUser, value: user }] })],
    });
    vi.spyOn(TestBed.inject(NichesService), 'load').mockResolvedValue(over.niches ?? []);
    const pkg = TestBed.inject(PackageCampaignService);
    vi.spyOn(pkg, 'discover').mockResolvedValue({ eligible: Array(over.eligible ?? 0).fill({}), ineligibleCount: 0 } as any);
    vi.spyOn(pkg, 'mine').mockResolvedValue(Array(over.mine ?? 0).fill({}) as any);
    TestBed.inject(ActiveProfileService).setActiveProfile(role);
    const f = TestBed.createComponent(GetStarted);
    f.detectChanges();
    await f.whenStable();
    await new Promise((r) => setTimeout(r, 0)); // let the account lookups finish
    f.detectChanges();
    return f;
  };
  const text = (f: any) => (f.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';

  it('shows a new creator the first steps', async () => {
    const f = await setup({ id: 1 }, 'creative');
    expect(text(f)).toContain('Get set up to earn');
    expect(text(f)).toContain('Connect your X account');
    expect(text(f)).toContain('4 steps left');
  });

  it('ticks what is already done and names the matching campaigns', async () => {
    const f = await setup({ id: 1, twitter_handle: 'ada', paystackRecipientCode: 'RCP_x' }, 'creative', { niches: ['Fashion'], eligible: 2 });
    expect(text(f)).toContain('See the 2 campaigns you can apply for');
    expect(text(f)).toContain('1 step left');
  });

  it('disappears once everything is done', async () => {
    const f = await setup({ id: 1, twitter_handle: 'ada', paystackRecipientCode: 'RCP_x' }, 'creative', { niches: ['Fashion'], mine: 1 });
    expect(text(f)).not.toContain('Get set up');
  });

  it('can be hidden, and stays hidden', async () => {
    const f = await setup({ id: 7 }, 'creative');
    (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.gs__hide')!.click();
    f.detectChanges();
    expect(text(f)).not.toContain('Get set up');
    expect(localStorage.getItem('getStarted:7:creative')).toBe('1');
  });

  it('gives a brand its three places to go', async () => {
    const f = await setup({ id: 2 }, 'brand');
    expect(text(f)).toContain('Create your first campaign');
    expect(text(f)).toContain('Fund your wallet');
  });
});
