import { provideTestDefaults } from '../../core/testing/test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { InviteNegotiate } from './invite-negotiate';
import { CampaignDeliverableService, CampaignService } from '../../core/api';

describe('InviteNegotiate', () => {
  let component: InviteNegotiate;
  let fixture: ComponentFixture<InviteNegotiate>;

  const deliverableApi = {
    campaignDeliverableControllerFindByCampaign: vi.fn((_id: number): any =>
      of({
        data: [
          { id: 1, content_type: 'reel', platform: 'instagram', quantity: 2, rate_per_post: 40000, due_date: '2026-03-14' },
          { id: 2, content_type: 'story', platform: 'tiktok', quantity: 1, rate_per_post: 20000, due_date: null },
        ],
      }),
    ),
  };
  const campaignApi = {
    campaignControllerFindOne: vi.fn(() =>
      of({
        data: {
          id: 7,
          name: 'GlowSkin',
          platforms: ['["instagram","tiktok"]'],
          end_date: '2026-03-14T00:00:00.000Z',
        },
      }),
    ),
  };

  async function create() {
    await TestBed.configureTestingModule({
      imports: [InviteNegotiate],
      providers: [
        ...provideTestDefaults(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '205' })),
            queryParamMap: of(convertToParamMap({ campaignId: '7' })),
          },
        },
        { provide: CampaignService, useValue: campaignApi },
        { provide: CampaignDeliverableService, useValue: deliverableApi },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(InviteNegotiate);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => vi.clearAllMocks());

  it('should create', async () => {
    await create();
    expect(component).toBeTruthy();
  });

  it('fetches the campaign deliverables from the deliverables service', async () => {
    await create();
    expect(deliverableApi.campaignDeliverableControllerFindByCampaign).toHaveBeenCalledWith(7, 'body', false, {
      transferCache: false,
    });
    expect(component.deliverables).toHaveLength(2);
    expect(component.deliverables[0]).toMatchObject({ label: 'Instagram reel', quantity: 2, rate: 40000, dueDate: 'Sat, Mar 14, 2026' });
    expect(component.deliverables[1].dueDate).toBe('');
    expect(component.deliverablesCount).toBe(3);
    expect(component.deliverablesTotal).toBe(100000);
  });

  it('renders the deliverables as readable rows', async () => {
    await create();
    const text = (fixture.nativeElement as HTMLElement).querySelector('.deliverables')!.textContent!;
    expect(text).toContain('2 × Instagram reel');
    expect(text).toContain('Due Sat, Mar 14, 2026');
    expect(text).toContain('₦40,000');
    expect(text).toContain('3 contents');
  });

  it('shows platforms as clean names, not JSON', async () => {
    await create();
    expect(component.platforms).toEqual(['Instagram', 'Tiktok']);
    const tags = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.tag')).map((t) => t.textContent!.trim());
    expect(tags).toEqual(['Instagram', 'Tiktok']);
  });

  it('shows the deadline as a readable date with how far away it is', async () => {
    await create();
    const dd = (fixture.nativeElement as HTMLElement).querySelectorAll('.fact dd')[1].textContent!;
    expect(dd).toContain('Mar 14, 2026');
    expect(dd).not.toContain('T00:00');
    expect(component.deadlineRelative?.text).toBeTruthy();
  });

  it('says so when the deliverables fail to load', async () => {
    deliverableApi.campaignDeliverableControllerFindByCampaign.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'Campaign not found' } })),
    );
    await create();
    expect(component.deliverablesError).toBe('Campaign not found');
    expect((fixture.nativeElement as HTMLElement).querySelector('.list-state--error')?.textContent).toContain('Campaign not found');
  });
});
