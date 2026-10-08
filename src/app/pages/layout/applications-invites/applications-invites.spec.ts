import { provideAppMockStore } from '../../../core/testing/mock-store';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { MockStore } from '@ngrx/store/testing';

import { ApplicationsInvites } from './applications-invites';
import { CampaignInfluencerService, InvitationsService } from '../../../core/api';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { ToastService } from '../../../components/toast/toast.service';

describe('ApplicationsInvites', () => {
  let component: ApplicationsInvites;
  let fixture: ComponentFixture<ApplicationsInvites>;
  let store: MockStore;

  const assignmentApi = {
    campaignInfluencerControllerFindByUser: vi.fn(
      (userId: number, _withPosts?: boolean) =>
        of({
          message: 'Assignments fetched',
          error: false,
          data: {
            list:
              userId === 9
                ? [
                    {
                      id: 301,
                      status: 'applied',
                      fee_agreed: 14000,
                      contract_signed_at: '2026-03-01T09:00:00.000Z',
                      payment_status: 'pending',
                      campaign: {
                        name: 'Ramadan promo',
                        platforms: ['["instagram"]'],
                        package: 'paid',
                        description: 'Promo push.',
                        end_date: '2026-04-30',
                        campaignTier: [{ name: 'Micro' }],
                      },
                      influencerPosts: [],
                    },
                    {
                      id: 302,
                      status: 'completed',
                      fee_agreed: 31000,
                      payment_status: 'paid',
                      campaign: { name: 'Savings challenge', platforms: ['tiktok'] },
                      influencerPosts: [
                        { post_url: 'https://instagram.com/p/xyz', status: 'published' },
                      ],
                    },
                    {
                      id: 303,
                      status: 'invited',
                      fee_agreed: 20000,
                      payment_status: 'pending',
                      campaign: {
                        name: 'Lagos Food Fest',
                        platforms: ['["youtube"]'],
                        end_date: '2026-05-31',
                      },
                      influencerPosts: [],
                    },
                  ]
                : [],
          },
        })
    ),
  };

  const invitationApi = {
    invitationControllerFindAllInvitations: vi.fn(() =>
      of({
        data: {
          list: [
            { id: 77, status: 'Pending', campaign: { id: 5, name: 'Glow week', platforms: ['instagram'] } },
          ],
        },
      }),
    ),
    invitationControllerRespond: vi.fn(() => of({ error: false })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationsInvites],
      providers: [
        provideAppMockStore(),
        { provide: CampaignInfluencerService, useValue: assignmentApi },
        { provide: InvitationsService, useValue: invitationApi },
        { provide: ToastService, useValue: { show: vi.fn() } },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(selectCurrentUser, { id: 9, user_name: 'creator.j' } as any);

    fixture = TestBed.createComponent(ApplicationsInvites);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  // overrideSelector sets a global memoized result; don't leak it into other specs.
  afterEach(() => store.resetSelectors());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch only the logged-in user\'s applications and invitations', () => {
    expect(assignmentApi.campaignInfluencerControllerFindByUser).toHaveBeenCalledWith(9, true);
    expect(invitationApi.invitationControllerFindAllInvitations).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 9 }),
    );
    expect(component.applications).toHaveLength(2);
  });

  it('should map assignments to application cards instead of hardcoded data', () => {
    const [first, second] = component.applications;
    expect(first.campaignTitle).toBe('Ramadan promo');
    expect(first.tier).toBe('Micro');
    expect(first.platform).toBe('Instagram');
    expect(first.payout).toBe(14000);
    expect(first.status).toBe('pending');
    expect(first.bio).toBe('Promo push.');
    expect(second.status).toBe('paid');
    expect(second.postLink).toBe('https://instagram.com/p/xyz');
    expect(component.applicationsError()).toBeNull();
  });

  it('should keep invited-type rows on the invitations tab, not applications', () => {
    expect(component.applications.map((a) => a.campaignTitle)).not.toContain('Lagos Food Fest');
    const invited = component.invites.find((i: any) => (i as any).assignmentId === 303) as any;
    expect(invited).toBeDefined();
    expect(invited.status).toBe('awaiting_response');
    expect(invited.campaign.name).toBe('Lagos Food Fest');
    expect(invited.campaign.platforms).toEqual(['youtube']);
    expect(invited.user.user_name).toBe('Lagos Food Fest');
  });

  it('should clear the list when the fetch fails', () => {
    assignmentApi.campaignInfluencerControllerFindByUser.mockReturnValueOnce(
      throwError(() => new Error('nope'))
    );
    component.fetchApplications();
    expect(component.applications).toEqual([]);
    expect(component.applicationsError()).not.toBeNull();
  });
  it('should map invitation entities to cards answered inline, not via negotiation', () => {
    const card = component.invites.find((i: any) => i.invitationId === 77) as any;
    expect(card.kind).toBe('invitation');
    expect(card.assignmentId).toBeNull();
    expect(card.status).toBe('awaiting_response');
    expect(card.campaign.platforms).toEqual(['instagram']);

    component.respondToInvitation({ id: 77, accept: true });
    expect(invitationApi.invitationControllerRespond).toHaveBeenCalledWith(77, 9, { status: 'Accepted' });
    expect(component.invites.some((i: any) => i.invitationId === 77)).toBe(false);
  });
});

describe('ApplicationsInvites without a user', () => {
  it('should not query anything until a user id is known', async () => {
    const assignmentApi = { campaignInfluencerControllerFindByUser: vi.fn(() => of({ data: [] })) };
    const invitationApi = { invitationControllerFindAllInvitations: vi.fn(() => of({ data: [] })) };
    await TestBed.configureTestingModule({
      imports: [ApplicationsInvites],
      providers: [
        provideAppMockStore(),
        { provide: CampaignInfluencerService, useValue: assignmentApi },
        { provide: InvitationsService, useValue: invitationApi },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ApplicationsInvites);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(assignmentApi.campaignInfluencerControllerFindByUser).not.toHaveBeenCalled();
    expect(invitationApi.invitationControllerFindAllInvitations).not.toHaveBeenCalled();
  });
});
