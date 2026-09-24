import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Actions } from '@ngrx/effects';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';

import { CreateCampaign } from './create-campaign';
import {
  InfluencerProfilesService,
  InvitationsService,
  WalletService as WalletApiService,
} from '../../../core/api';
import { ToastService } from '../../../components/toast/toast.service';
import { CampaignActions } from '../../../store/campaign/campaign.action';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';

describe('CreateCampaign', () => {
  let component: CreateCampaign;
  let fixture: ComponentFixture<CreateCampaign>;
  let actions$: Subject<any>;
  let toast: { show: ReturnType<typeof vi.fn> };
  let store: MockStore;
  let walletApi: {
    walletControllerGetUserWallet: ReturnType<typeof vi.fn>;
    walletControllerPayFromWallet: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    actions$ = new Subject();
    toast = { show: vi.fn() };
    walletApi = {
      walletControllerGetUserWallet: vi.fn(() => of({ data: { balance: 60000 } })),
      walletControllerPayFromWallet: vi.fn(() => of({ error: false, data: { balance: 10000 } })),
    };
    await TestBed.configureTestingModule({
      imports: [CreateCampaign],
      providers: [
        provideMockStore(),
        { provide: Actions, useValue: actions$ },
        { provide: InvitationsService, useValue: {} },
        { provide: InfluencerProfilesService, useValue: {} },
        { provide: ToastService, useValue: toast },
        { provide: WalletApiService, useValue: walletApi },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(selectCurrentUser, {
      id: 1,
      trendors_id: 'trend-1',
      email: 'brand@example.com',
    } as any);

    fixture = TestBed.createComponent(CreateCampaign);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose five steps including deliverables', () => {
    expect(component.totalSteps).toBe(5);
    expect(component.steps.map((s) => s.label)).toEqual([
      'Basics',
      'Plan & Access',
      'Platforms & Media',
      'Deliverables',
      'Review',
    ]);
  });

  it('should track deliverable quantities per platform and content type', () => {
    // Twitter is pre-selected; Instagram is not.
    expect(component.totalDeliverables).toBe(0);
    expect(component.deliverablesSummary).toBe('None set');
    component.setDeliverableQty('twitter', 'reel', 2);
    component.setDeliverableQty('twitter', 'story', 1);
    expect(component.getDeliverableQty('twitter', 'reel')).toBe(2);
    expect(component.getDeliverableQty('instagram', 'reel')).toBe(0);
    expect(component.totalDeliverables).toBe(3);
    expect(component.deliverablesSummary).toBe('Twitter: 2 Reels, 1 Story');
  });

  it('should clamp deliverable quantities at zero', () => {
    component.setDeliverableQty('twitter', 'post', -5);
    expect(component.getDeliverableQty('twitter', 'post')).toBe(0);
  });

  it('should build a per-platform deliverables payload with only non-zero entries', () => {
    component.setDeliverableQty('instagram', 'video', 3);
    expect(component.deliverablesPayload).toEqual([
      { content_type: 'video', platform: 'instagram', quantity: 3 },
    ]);
  });

  it('should reset deliverables with the form', () => {
    component.setDeliverableQty('twitter', 'reel', 2);
    component.resetForm();
    expect(component.totalDeliverables).toBe(0);
    expect(component.currentStep).toBe(0);
  });

  it('should report validation failures without dispatching', async () => {
    component.selectedAccess = 'open';
    component.openBudget.set(null);
    await component.createCampaign();
    expect(component.submitStatus()).toBe('error');
    expect(component.isSubmitting()).toBe(false);
    expect(toast.show).toHaveBeenCalledWith(expect.stringContaining('₦25,000'), 'error');
  });

  it('should show loading then success when the effect answers', async () => {
    component.selectedAccess = 'open';
    component.openBudget.set(50000);
    component.campaignTitle.set('Test Campaign');
    const pending = component.createCampaign();
    await pending;
    expect(component.isSubmitting()).toBe(true);
    expect(component.submitStatus()).toBe('loading');
    actions$.next(CampaignActions.createCampaignSuccess({ campaign: { id: 99 } as any }));
    expect(component.submitStatus()).toBe('success');
    expect(component.isSubmitting()).toBe(false);
    expect(toast.show).toHaveBeenCalledWith('Campaign created successfully.', 'success');
  });

  it('should show the effect failure as an error', async () => {
    component.selectedAccess = 'open';
    component.openBudget.set(50000);
    await component.createCampaign();
    actions$.next(CampaignActions.createCampaignFailure({ error: 'Wallet too low' }));
    expect(component.submitStatus()).toBe('error');
    expect(component.submitMessage()).toBe('Wallet too low');
    expect(component.isSubmitting()).toBe(false);
    expect(toast.show).toHaveBeenCalledWith('Wallet too low', 'error');
  });

  it('should open the pay alert only for open campaigns', async () => {
    component.selectedAccess = 'open';
    component.onCheckout();
    expect(component.showPayAlert()).toBe(true);
  });

  it('should create directly without payment for invite-only campaigns', async () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    component.selectedAccess = 'invite_only';
    component.negotiatedAmount.set(200000);
    component.maxSlots.set(1);
    component.campaignTitle.set('Invite Campaign');
    component.onCheckout();
    expect(component.showPayAlert()).toBe(false);
    expect(walletApi.walletControllerPayFromWallet).not.toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Campaign Action Flow] Create Campaign' }),
    );
    actions$.next(CampaignActions.createCampaignSuccess({ campaign: { id: 9 } as any }));
    expect(component.submitStatus()).toBe('success');
  });

  it('should show the wallet balance in the pay alert', async () => {
    component.openPayAlert();
    expect(component.showPayAlert()).toBe(true);
    await fixture.whenStable();
    expect(walletApi.walletControllerGetUserWallet).toHaveBeenCalledWith('trend-1');
    expect(component.walletBalance()).toBe(60000);
  });

  it('should pay from the wallet then create the campaign on proceed', async () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    component.selectedAccess = 'open';
    component.openBudget.set(50000);
    component.campaignTitle.set('Paid Campaign');
    component.openPayAlert();
    await fixture.whenStable();
    component.payFromWallet();
    await fixture.whenStable();
    expect(walletApi.walletControllerPayFromWallet).toHaveBeenCalledWith({
      trendorsId: 'trend-1',
      amount: 50000,
      description: 'Campaign: Paid Campaign',
    });
    expect(component.showPayAlert()).toBe(false);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Campaign Action Flow] Create Campaign' }),
    );
    actions$.next(CampaignActions.createCampaignSuccess({ campaign: { id: 7 } as any }));
    expect(component.submitStatus()).toBe('success');
  });

  it('should show the wallet payment failure and not create the campaign', async () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    walletApi.walletControllerPayFromWallet.mockReturnValueOnce(
      of({ error: true, message: 'Insufficient funds' }),
    );
    component.selectedAccess = 'open';
    component.openBudget.set(50000);
    component.openPayAlert();
    await fixture.whenStable();
    component.payFromWallet();
    await fixture.whenStable();
    expect(component.showPayAlert()).toBe(true);
    expect(component.isSubmitting()).toBe(false);
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Campaign Action Flow] Create Campaign' }),
    );
  });
});
