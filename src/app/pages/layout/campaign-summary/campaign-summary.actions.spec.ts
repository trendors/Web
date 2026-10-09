import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { MockStore } from '@ngrx/store/testing';

import { provideAppMockStore } from '../../../core/testing/mock-store';
import { CampaignSummary } from './campaign-summary';
import {
  CampaignInfluencerPostService,
  CampaignInfluencerService,
  CampaignService,
  InfluencerProfilesService,
} from '../../../core/api';
import { selectCampaignList, selectCampaignLoading } from '../../../store/campaign/campaign.selector';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { CampaignActions } from '../../../store/campaign/campaign.action';
import { CampaignCheckoutService } from '../../../core/services/payment/campaign-checkout.service';
import {
  mockBrandUser,
  mockCampaigns,
  postsEnvelopeForCampaign,
  rosterEnvelopeFor,
} from '../../../core/testing/campaign.fixtures';

describe('CampaignSummary campaign actions', () => {
  let component: CampaignSummary;
  let fixture: ComponentFixture<CampaignSummary>;
  let store: MockStore;

  const campaignApi = { campaignControllerUpdate: vi.fn((_id: number, _dto: unknown): any => of({ error: false })) };
  const profilesApi = {
    influncerProfileControllerFindAll: vi.fn((): any => of({ data: { list: [] } })),
  };
  const rosterApi = {
    campaignInfluencerControllerCreate: vi.fn((_dto: unknown): any => of({ error: false })),
    campaignInfluencerControllerFindByCampaign: vi.fn((campaignId: number) => of(rosterEnvelopeFor(campaignId))),
  };
  const postsApi = {
    campaignInfluencerPostControllerFindByCampaign: vi.fn((id: number) => of(postsEnvelopeForCampaign(id))),
  };

  const campaign = () => mockCampaigns[0];
  const checkout = { pay: vi.fn(async (): Promise<string> => 'paid') };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [CampaignSummary],
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        provideAppMockStore(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '1' })),
            queryParamMap: of(convertToParamMap({})),
            snapshot: { paramMap: convertToParamMap({ id: '1' }), queryParams: {}, fragment: null },
          },
        },
        { provide: CampaignService, useValue: campaignApi },
        { provide: InfluencerProfilesService, useValue: profilesApi },
        { provide: CampaignInfluencerService, useValue: rosterApi },
        { provide: CampaignInfluencerPostService, useValue: postsApi },
        { provide: CampaignCheckoutService, useValue: checkout },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(selectCampaignList, mockCampaigns);
    store.overrideSelector(selectCampaignLoading, false);
    store.overrideSelector(selectCurrentUser, mockBrandUser as any);
    vi.spyOn(store, 'dispatch');

    fixture = TestBed.createComponent(CampaignSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('treats a campaign with no status as active', () => {
    expect(component.campaignStatusOf(campaign())).toBe('active');
    expect(component.campaignStatusOf({ ...campaign(), status: 'paused' })).toBe('paused');
  });

  it('pauses the campaign and updates the store', () => {
    component.setCampaignStatus(campaign(), 'paused');
    expect(campaignApi.campaignControllerUpdate).toHaveBeenCalledWith(1, { status: 'paused' });
    expect(store.dispatch).toHaveBeenCalledWith(
      CampaignActions.updateCampaignSuccess({ campaign: { id: 1, status: 'paused' } }),
    );
  });

  it('does not touch the store when the API reports an error in a 200 body', () => {
    campaignApi.campaignControllerUpdate.mockReturnValueOnce(of({ error: true, message: 'Failed to update campaign.' }));
    component.setCampaignStatus(campaign(), 'closed');
    expect(store.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: CampaignActions.updateCampaignSuccess.type }));
    expect(component.campaignBusy()).toBe(false);
  });

  it('prefills the edit form from the campaign and saves normalized changes', () => {
    component.openEdit({ ...campaign(), start_date: '2026-03-01T00:00:00.000Z', end_date: '2026-03-31T00:00:00.000Z' });
    expect(component.editOpen()).toBe(true);
    expect(component.editForm.name).toBe(campaign().name);
    expect(component.editForm.start_date).toBe('2026-03-01');

    component.editForm.name = '  Spring Launch ';
    component.editForm.hash_tags = 'spring, #glow  spring';
    component.saveEdit(campaign());

    expect(campaignApi.campaignControllerUpdate).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: 'Spring Launch', hash_tags: ['#spring', '#glow'], start_date: '2026-03-01' }),
    );
    expect(component.editOpen()).toBe(false);
  });

  it('refuses an empty name or an end date before the start date', () => {
    component.openEdit(campaign());
    component.editForm.name = '   ';
    component.saveEdit(campaign());
    expect(component.editError()).toContain('name');

    component.editForm.name = 'Ok';
    component.editForm.start_date = '2026-05-10';
    component.editForm.end_date = '2026-05-01';
    component.saveEdit(campaign());
    expect(component.editError()).toContain('end date');
    expect(campaignApi.campaignControllerUpdate).not.toHaveBeenCalled();
  });

  it("shows the server's reason when saving fails and stays open", () => {
    campaignApi.campaignControllerUpdate.mockReturnValueOnce(
      throwError(() => ({ message: 'Http failure', error: { message: 'end_date must be a valid date.' } })),
    );
    component.openEdit(campaign());
    component.saveEdit(campaign());
    expect(component.editError()).toBe('end_date must be a valid date.');
    expect(component.editOpen()).toBe(true);
  });

  it('invites the selected influencers as invited assignments and refreshes the roster', () => {
    const profile = { first_name: 'Zed', last_name: 'Ng', user: { id: 777, user_name: 'zed' } };
    component.openInvite();
    component.togglePicked(profile);
    expect(component.pickerSelected()).toHaveLength(1);

    rosterApi.campaignInfluencerControllerFindByCampaign.mockClear();
    component.sendInvites(campaign());

    expect(rosterApi.campaignInfluencerControllerCreate).toHaveBeenCalledWith({ campaignId: 1, userId: 777 });
    expect(rosterApi.campaignInfluencerControllerFindByCampaign).toHaveBeenCalled();
    expect(component.activeTab).toBe('invites');
    expect(component.inviteOpen()).toBe(false);
  });

  it('keeps failed invites selected so they can be retried', () => {
    rosterApi.campaignInfluencerControllerCreate.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'This campaign is paused' } })),
    );
    const profile = { first_name: 'Zed', last_name: 'Ng', user: { id: 777 } };
    component.openInvite();
    component.togglePicked(profile);
    component.sendInvites(campaign());
    expect(component.inviteOpen()).toBe(true);
    expect(component.pickerSelected()).toHaveLength(1);
  });

  it('will not select people already in the campaign', () => {
    const existing = (component as any).rawRoster[0];
    const userId = Number(existing?.user?.id ?? existing?.influencer?.id);
    const profile = { first_name: 'Already', user: { id: userId } };
    component.openInvite();
    expect(component.pickerInCampaign(profile)).toBe(true);
    component.togglePicked(profile);
    expect(component.pickerSelected()).toHaveLength(0);
  });

  it('renders the action buttons and swaps them with the campaign status', async () => {
    const labels = () =>
      Array.from(fixture.nativeElement.querySelectorAll('.campaign-actions button')).map((b: any) => b.textContent.trim());
    expect(labels()).toEqual(['Edit', 'Invite influencers', 'Pause', 'Close campaign']);

    store.overrideSelector(selectCampaignList, [{ ...mockCampaigns[0], status: 'paused' }, ...mockCampaigns.slice(1)]);
    store.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(labels()).toEqual(['Edit', 'Invite influencers', 'Resume', 'Close campaign']);
    const invite = fixture.nativeElement.querySelectorAll('.campaign-actions button')[1] as HTMLButtonElement;
    expect(invite.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.campaign-notice')?.textContent).toContain('Paused');

    store.overrideSelector(selectCampaignList, [{ ...mockCampaigns[0], status: 'closed' }, ...mockCampaigns.slice(1)]);
    store.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(labels()).toEqual(['Edit', 'Invite influencers', 'Reopen']);
  });

  describe('unpaid open campaigns', () => {
    const unpaid = () => ({ ...mockCampaigns[0], payment_status: 'awaiting_payment', budget: '60000' }) as any;

    async function showUnpaid() {
      store.overrideSelector(selectCampaignList, [unpaid(), ...mockCampaigns.slice(1)]);
      store.refreshState();
      fixture.detectChanges();
      await fixture.whenStable();
    }

    it('shows a "not live yet" banner with the budget and blocks invites', async () => {
      await showUnpaid();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.campaign-notice--pay')?.textContent).toContain('₦60,000');
      const invite = el.querySelectorAll('.campaign-actions button')[1] as HTMLButtonElement;
      expect(invite.disabled).toBe(true);
    });

    it('completing payment marks the campaign paid', async () => {
      await component.completePayment(unpaid());
      expect(checkout.pay).toHaveBeenCalledWith(1, expect.any(Function));
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: CampaignActions.updateCampaignSuccess.type, campaign: expect.objectContaining({ id: 1, payment_status: 'paid' }) }),
      );
    });

    it('a cancelled card window changes nothing', async () => {
      checkout.pay.mockResolvedValueOnce('cancelled');
      await component.completePayment(unpaid());
      expect(store.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: CampaignActions.updateCampaignSuccess.type }));
    });
  });
});
