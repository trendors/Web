import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { Opportunities } from './opportunities';
import { PackageCampaignService } from '../../../core/services/package/package-campaign.service';
import { ToastService } from '../../../components/toast/toast.service';
import { provideRouter } from '@angular/router';

describe('Opportunities tabs', () => {
  const setup = (tab: string | null, work: any = { needsYou: [{}] }) => {
    const params = new BehaviorSubject(convertToParamMap(tab ? { tab } : {}));
    const api = { discover: async () => ({ eligible: [], ineligibleCount: 0 }), mine: async () => [], myWork: async () => work };
    TestBed.configureTestingModule({
      imports: [Opportunities],
      providers: [
        provideRouter([]),
        { provide: PackageCampaignService, useValue: api },
        { provide: ToastService, useValue: { show: () => undefined } },
        { provide: ActivatedRoute, useValue: { queryParamMap: params, snapshot: {} } },
      ],
    });
    const f = TestBed.createComponent(Opportunities);
    f.detectChanges();
    return { c: f.componentInstance, params, f };
  };
  const settle = () => new Promise((r) => setTimeout(r, 0));

  it('opens Find campaigns when the link asks for it, even if something needs the creator', async () => {
    const { c } = setup('discover');
    await settle();
    expect(c.tab()).toBe('discover');
  });

  it('opens My work when the link asks for it', async () => {
    const { c } = setup('mine', { needsYou: [] });
    await settle();
    expect(c.tab()).toBe('mine');
  });

  it('follows the link when it changes while the page stays open', async () => {
    const { c, params } = setup('discover');
    await settle();
    params.next(convertToParamMap({ tab: 'mine' }));
    expect(c.tab()).toBe('mine');
  });

  it('ignores an unknown tab value', async () => {
    const { c } = setup('nonsense', { needsYou: [] });
    await settle();
    expect(c.tab()).toBe('discover');
  });
});
