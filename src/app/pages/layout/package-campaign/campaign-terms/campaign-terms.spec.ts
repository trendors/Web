import { TestBed } from '@angular/core/testing';
import { CampaignTermsPanel } from './campaign-terms';

describe('CampaignTermsPanel', () => {
  const render = (terms: any) => {
    TestBed.configureTestingModule({ imports: [CampaignTermsPanel] });
    const f = TestBed.createComponent(CampaignTermsPanel);
    f.componentRef.setInput('terms', terms);
    f.detectChanges();
    return (f.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');
  };
  const base = { baseFee: 6000, posts: [{ content_type: 'post', platform: 'instagram', quantity: 1 }], rewards: [{ metric: 'views', threshold: 5000, amount: 6000 }], rewardTotal: 6000, windowHours: 72, revisions: 2, dueDate: '2026-12-10T00:00:00.000Z' };

  it('shows the pay, the rewards and the timing', () => {
    const t = render(base);
    expect(t).toContain('₦6,000 for 1 post on Instagram');
    expect(t).toContain('+₦6,000 at 5k views');
    expect(t).toContain('Post by Dec 10');
    expect(t).toContain('results counted for 3 days');
    expect(t).toContain('2 revisions');
  });

  it('leaves the rewards row out when there are none', () => {
    expect(render({ ...base, rewards: [], rewardTotal: 0 })).not.toContain('Rewards');
  });
});
