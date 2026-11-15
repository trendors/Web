import { provideAppMockStore } from '../../../core/testing/mock-store';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore } from '@ngrx/store/testing';
import { Actions } from '@ngrx/effects';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';

import { CreateCampaign } from './create-campaign';
import {
  InfluencerProfilesService,
  CampaignInfluencerService,
  WalletService as WalletApiService,
} from '../../../core/api';
import { ToastService } from '../../../components/toast/toast.service';
import { Router } from '@angular/router';
import { CampaignCheckoutService } from '../../../core/services/payment/campaign-checkout.service';
import { ShareCampaignApiService } from '../../../core/services/share-campaign/share-campaign.service';
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

  let assignmentApi: { campaignInfluencerControllerCreate: ReturnType<typeof vi.fn> };
  let checkout: { pay: ReturnType<typeof vi.fn> };
  let shareApi: { setTerms: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  /** Valid step-0 basics so a test can focus on the later steps. */
  function fillBasics(title = 'Test Campaign'): void {
    component.campaignTitle.set(title);
    component.campaignDescription.set('A test campaign');
    component.link = 'https://example.com';
    component.togglePlatform('twitter');
    component.start_date.set('2099-11-01');
    component.end_date.set('2099-11-30');
  }

  /** Wait until createCampaign has dispatched and is awaiting the effect. */
  async function untilDispatched(): Promise<void> {
    await vi.waitFor(() => expect(component.submitStatus()).toBe('loading'));
  }

  beforeEach(async () => {
    actions$ = new Subject();
    assignmentApi = { campaignInfluencerControllerCreate: vi.fn(() => of({})) };
    toast = { show: vi.fn() };
    checkout = { pay: vi.fn(async () => 'paid') };
    // The server adds its 20% fee on top of the creators' budget.
    shareApi = { setTerms: vi.fn(async (_id: number, input: { pool: number }) => ({ totalPayable: Math.round(input.pool * 1.2 * 100) / 100 })) };
    router = { navigate: vi.fn(async () => true) };
    walletApi = {
      walletControllerGetUserWallet: vi.fn(() => of({ data: { balance: 60000 } })),
      walletControllerPayFromWallet: vi.fn(() => of({ error: false, data: { balance: 10000 } })),
    };
    await TestBed.configureTestingModule({
      imports: [CreateCampaign],
      providers: [
        provideAppMockStore(),
        { provide: Actions, useValue: actions$ },
        { provide: CampaignInfluencerService, useValue: assignmentApi },
        { provide: InfluencerProfilesService, useValue: {} },
        { provide: ToastService, useValue: toast },
        { provide: WalletApiService, useValue: walletApi },
        { provide: CampaignCheckoutService, useValue: checkout },
        { provide: ShareCampaignApiService, useValue: shareApi },
        { provide: Router, useValue: router },
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

  afterEach(() => store.resetSelectors());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('has four steps for a share campaign: no deliverables, since creators just share what the brand provides', () => {
    expect(component.totalSteps).toBe(4);
    expect(component.steps.map((s) => s.label)).toEqual(['Basics', 'Pay', 'Media', 'Review']);
  });

  it('puts Review last, and its summary no longer lists deliverables', () => {
    fillBasics();
    component.selectedAccess = 'open';
    component.openBudget.set(50000);
    component.payPerShare.set(100);
    component.goToStep(3);
    expect(component.currentStep).toBe(3);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Campaign Basics');
    expect(text).not.toContain('Deliverables');
  });

  it('says what a share campaign is, in a short description under its title', () => {
    const head = (fixture.nativeElement as HTMLElement).querySelector('.page-head');
    expect(head?.querySelector('h1')?.textContent).toBe('New share campaign');
    expect(head?.querySelector('p')?.textContent).toContain('you pay only for shares that stay up');
    expect(head?.querySelector('p')?.textContent).toContain('Nothing is charged until you review and pay');
  });

  it('offers only the share kind on this page; package campaigns have their own tab', () => {
    expect(component.accessTypes.map((a) => a.value)).toEqual(['open']);
    expect(component.accessTypes[0].title).toBe('Share');
    expect(component.accessLabel).toBe('Share');
    expect(component.selectedAccess).toBe('open');
  });

  it('should track deliverables per platform, format, qty and fee', () => {
    expect(component.totalDeliverables).toBe(0);
    expect(component.deliverablesSummary).toBe('None set');
    component.togglePlatform('twitter');
    component.togglePlatform('instagram');
    component.updateDeliverableRow(0, { platform: 'twitter', format: 'reel', qty: 2, fee: 150 });
    component.addDeliverableRow();
    component.updateDeliverableRow(1, { platform: 'instagram', format: 'story', qty: 1, fee: 40 });
    expect(component.totalDeliverables).toBe(3);
    expect(component.deliverablesSummary).toContain('Twitter');
    expect(component.selectedPlatforms).toEqual(['twitter', 'instagram']);
  });

  it('labels every format correctly, singular and plural', () => {
    expect(component.formatLabel('story')).toBe('Story');
    expect(component.formatLabel('reel')).toBe('Reel');
    component.togglePlatform('twitter');
    component.updateDeliverableRow(0, { format: 'story', qty: 1 });
    expect(component.deliverablesSummary).toBe('1 × Twitter Story');
    component.updateDeliverableRow(0, { qty: 3 });
    expect(component.deliverablesSummary).toBe('3 × Twitter Stories');
  });

  it('should clamp deliverable quantities and fees at zero', () => {
    component.updateDeliverableRow(0, { qty: -5, fee: -10 });
    expect(component.deliverableRows()[0].qty).toBe(0);
    expect(component.deliverableRows()[0].fee).toBe(0);
  });

  it('should add and remove deliverable rows', () => {
    expect(component.deliverableRows().length).toBe(1);
    component.addDeliverableRow();
    expect(component.deliverableRows().length).toBe(2);
    component.removeDeliverableRow(0);
    expect(component.deliverableRows().length).toBe(1);
  });

  it('should build a per-platform deliverables payload with only non-zero entries', () => {
    component.updateDeliverableRow(0, { platform: 'instagram', format: 'video', qty: 3, fee: 120 });
    expect(component.deliverablesPayload).toEqual([
      { content_type: 'video', platform: 'instagram', quantity: 3, rate_per_post: 120 },
    ]);
  });

  it('should reset deliverables with the form', () => {
    component.updateDeliverableRow(0, { qty: 2 });
    component.resetForm();
    expect(component.totalDeliverables).toBe(0);
    expect(component.deliverableRows().length).toBe(1);
    expect(component.currentStep).toBe(0);
  });

  it('should report validation failures without dispatching', async () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    fillBasics();
    component.selectedAccess = 'open';
    component.openBudget.set(null);
    component.payPerShare.set(100);
    const created = await component.createCampaign();
    expect(created).toBe(false);
    expect(component.submitStatus()).toBe('error');
    expect(component.isSubmitting()).toBe(false);
    expect(toast.show).toHaveBeenCalledWith(expect.stringContaining('₦25,000'), 'error');
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should block moving past a step that is incomplete', () => {
    component.next();
    expect(component.currentStep).toBe(0);
    expect(toast.show).toHaveBeenCalledWith('Give your campaign a title.', 'error');
    fillBasics();
    component.end_date.set('2098-10-01');
    component.next();
    expect(component.currentStep).toBe(0);
    component.end_date.set('2099-11-30');
    component.next();
    expect(component.currentStep).toBe(1);
  });

  it('should store picked dates as local calendar days', () => {
    component.onDateRangeConfirmed({ start: new Date(2026, 10, 1), end: new Date(2026, 10, 30) });
    expect(component.start_date()).toBe('2026-11-01');
    expect(component.end_date()).toBe('2026-11-30');
  });

  it('should show loading then success when the effect answers', async () => {
    fillBasics();
    component.selectedAccess = 'open';
    component.openBudget.set(50000);
    component.payPerShare.set(100);
    const pending = component.createCampaign();
    await untilDispatched();
    expect(component.isSubmitting()).toBe(true);
    actions$.next(CampaignActions.createCampaignSuccess({ campaign: { id: 99 } as any }));
    expect(await pending).toBe(true);
    expect(component.submitStatus()).toBe('success');
    expect(component.isSubmitting()).toBe(false);
    expect(toast.show).toHaveBeenCalledWith('Campaign created successfully.', 'success');
  });

  it('should show the effect failure as an error', async () => {
    fillBasics();
    component.selectedAccess = 'open';
    component.openBudget.set(50000);
    component.payPerShare.set(100);
    const pending = component.createCampaign();
    await untilDispatched();
    actions$.next(CampaignActions.createCampaignFailure({ error: 'Something broke' }));
    expect(await pending).toBe(false);
    expect(component.submitStatus()).toBe('error');
    expect(component.submitMessage()).toBe('Something broke');
    expect(component.isSubmitting()).toBe(false);
    expect(toast.show).toHaveBeenCalledWith('Something broke', 'error');
  });

  /** Save an open campaign through the effect and land on the pay sheet. */
  async function saveOpenCampaign(budget = 50000): Promise<void> {
    fillBasics('Paid Campaign');
    component.selectedAccess = 'open';
    component.openBudget.set(budget);
    component.payPerShare.set(100);
    component.onCheckout();
    await untilDispatched();
    actions$.next(
      CampaignActions.createCampaignSuccess({
        campaign: { id: 7, name: 'Paid Campaign', budget: String(budget), payment_status: 'awaiting_payment' } as any,
      }),
    );
    await vi.waitFor(() => expect(component.showPayAlert()).toBe(true));
    await fixture.whenStable();
  }

  it('does nothing for an invalid open campaign', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    component.selectedAccess = 'open';
    component.onCheckout();
    expect(component.showPayAlert()).toBe(false);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('saves an open campaign FIRST, then opens the pay sheet for it (nothing charged yet)', async () => {
    await saveOpenCampaign(50000);
    // The terms are saved first, and the amount to pay is what the server says: the pool plus its fee.
    expect(shareApi.setTerms).toHaveBeenCalledWith(7, { payPerShare: 100, pool: 50000, maxSharesPerCreator: 1, hashtag: '', minFollowers: 0 });
    expect(component.pendingPayment()).toEqual({ id: 7, name: 'Paid Campaign', budget: 60000 });
    expect(component.submitMessage()).toBe('Campaign saved. Complete payment to launch it.');
    expect(checkout.pay).not.toHaveBeenCalled();
  });

  it('never opens payment when the campaign could not be saved', async () => {
    fillBasics();
    component.selectedAccess = 'open';
    component.openBudget.set(50000);
    component.payPerShare.set(100);
    component.onCheckout();
    await untilDispatched();
    actions$.next(CampaignActions.createCampaignFailure({ error: 'boom' }));
    await vi.waitFor(() => expect(component.submitStatus()).toBe('error'));
    expect(component.showPayAlert()).toBe(false);
    expect(checkout.pay).not.toHaveBeenCalled();
  });

  it('should create invite-only campaigns without payment, then invite the drafted creators', async () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    fillBasics('Invite Campaign');
    component.selectedAccess = 'invite_only';
    component.updateDeliverableRow(0, { qty: 1 });
    component.selectMember({ id: 3, user: { id: 42 }, first_name: 'Ada' });
    component.onCheckout();
    await untilDispatched();
    expect(component.showPayAlert()).toBe(false);
    expect(walletApi.walletControllerPayFromWallet).not.toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Campaign Action Flow] Create Campaign' }),
    );
    actions$.next(CampaignActions.createCampaignSuccess({ campaign: { id: 9 } as any }));
    await vi.waitFor(() => expect(component.submitStatus()).toBe('success'));
    // Invites are assignments now, so they show on the campaign page and can be negotiated.
    expect(assignmentApi.campaignInfluencerControllerCreate).toHaveBeenCalledWith({ campaignId: 9, userId: 42 });
    // No payment step, so the brand lands on the new campaign instead of a blank form.
    await vi.waitFor(() => expect(router.navigate).toHaveBeenCalledWith(['/home/view-campaign', 9]));
  });

  it('requires a description, a valid link and a platform on the Basics step', () => {
    fillBasics();
    component.campaignDescription.set('  ');
    expect(component.stepError(0)).toBe('Describe what this campaign is about.');
    component.campaignDescription.set('About');
    component.link = 'not a link';
    expect(component.stepError(0)).toBe('Enter a valid link starting with https://');
    component.link = 'https://example.com';
    component.togglePlatform('twitter'); // un-pick
    expect(component.stepError(0)).toBe('Choose at least one platform.');
  });

  it('rejects a start date in the past', () => {
    fillBasics();
    component.start_date.set('2020-01-01');
    expect(component.stepError(0)).toBe('The start date cannot be in the past.');
  });

  it('needs a creator for invite-only and a deliverable for non-open campaigns', () => {
    fillBasics();
    component.selectedAccess = 'invite_only';
    expect(component.stepError(1)).toBe('Add at least one creator to invite.');
    expect(component.stepError(3)).toBe('Add at least one deliverable with a quantity above 0.');
    component.selectedAccess = 'open';
    expect(component.stepError(3)).toBeNull();
  });

  it('jumps to the step with the problem when checkout fails', () => {
    fillBasics();
    component.selectedAccess = 'open';
    component.openBudget.set(null);
    component.goTo(3);
    component.onCheckout();
    expect(component.currentStep).toBe(1);
  });

  it('does not let the step buttons skip past an incomplete step', () => {
    component.goToStep(3);
    expect(component.currentStep).toBe(0);
    fillBasics();
    component.goToStep(2); // access defaults to open, which needs a budget
    expect(component.currentStep).toBe(1);
  });

  it('keeps deliverable platforms within the chosen platforms', () => {
    component.togglePlatform('instagram');
    expect(component.deliverableRows()[0].platform).toBe('instagram');
    component.togglePlatform('instagram');
    expect(component.deliverableRows()[0].platform).toBe('');
  });

  it('should show the wallet balance in the pay alert', async () => {
    component.openPayAlert();
    expect(component.showPayAlert()).toBe(true);
    await fixture.whenStable();
    expect(walletApi.walletControllerGetUserWallet).toHaveBeenCalledWith('trend-1');
    expect(component.walletBalance()).toBe(60000);
  });

  it('splits the cost between wallet and card using the live balance', async () => {
    await saveOpenCampaign(90000); // pays 108,000 with the fee; balance 60,000
    expect(component.payBreakdown).toEqual({ budget: 108000, fromWallet: 60000, byCard: 48000 });
    walletApi.walletControllerGetUserWallet.mockReturnValueOnce(of({ data: { balance: 107950 } }));
    component.openPayAlert();
    await vi.waitFor(() => expect(component.walletBalance()).toBe(107950));
    // Paystack's ₦100 minimum; the extra ₦50 stays in the wallet
    expect(component.payBreakdown.byCard).toBe(100);
  });

  describe('share terms', () => {
    it('works out the shares funded, the fee on top and the total', () => {
      component.payPerShare.set(100);
      component.openBudget.set(10000);
      expect(component.sharesFunded).toBe(100);
      expect(component.shareFee).toBe(2000); // 20% default
      expect(component.shareTotal).toBe(12000);
      component.selectedAccess = 'open';
      expect(component.costDisplay).toBe('₦12,000');
    });

    it('funds no shares until a pay and a budget are set', () => {
      expect(component.sharesFunded).toBe(0);
      component.openBudget.set(50000);
      expect(component.sharesFunded).toBe(0);
    });

    type Terms = { pay: number | null; pool: number; per?: number; tag?: string; followers?: number };
    it.each<[Terms, string]>([
      [{ pay: null, pool: 50000 }, 'Say what you will pay'],
      [{ pay: 10, pool: 50000 }, 'at least ₦50'],
      [{ pay: 100, pool: 1000 }, 'at least ₦25,000'],
      [{ pay: 30000, pool: 25000 }, 'at least one share'],
      [{ pay: 100, pool: 50000, per: 0 }, 'Shares per creator'],
      [{ pay: 100, pool: 50000, per: 11 }, 'Shares per creator'],
      [{ pay: 100, pool: 50000, tag: 'bad tag!' }, 'letters, numbers'],
      [{ pay: 100, pool: 50000, followers: -5 }, 'Minimum followers'],
    ])('refuses %j', (v, message) => {
      component.payPerShare.set(v.pay);
      component.openBudget.set(v.pool);
      component.maxSharesPerCreator.set(v.per ?? 1);
      component.shareHashtag.set(v.tag ?? '');
      component.shareMinFollowers.set(v.followers ?? 0);
      expect(component.shareTermsError()).toContain(message);
    });

    it('accepts good terms, with or without a leading # on the hashtag', () => {
      component.payPerShare.set(100);
      component.openBudget.set(50000);
      component.shareHashtag.set('#NewDrop');
      expect(component.shareTermsError()).toBeNull();
      component.shareHashtag.set('');
      expect(component.shareTermsError()).toBeNull();
    });

    it('stops the Access step until the terms are good', () => {
      fillBasics();
      component.selectedAccess = 'open';
      component.openBudget.set(50000);
      expect(component.stepError(1)).toContain('Say what you will pay');
      component.payPerShare.set(100);
      expect(component.stepError(1)).toBeNull();
    });

    it('sends the pay, the hashtag and the limits to the server before any payment', async () => {
      fillBasics('Hashtag push');
      component.selectedAccess = 'open';
      component.openBudget.set(40000);
      component.payPerShare.set(200);
      component.maxSharesPerCreator.set(2);
      component.shareHashtag.set('#Push');
      component.shareMinFollowers.set(500);
      component.onCheckout();
      await untilDispatched();
      actions$.next(CampaignActions.createCampaignSuccess({ campaign: { id: 11, name: 'Hashtag push', budget: '40000', payment_status: 'awaiting_payment' } as any }));
      await vi.waitFor(() => expect(component.showPayAlert()).toBe(true));
      expect(shareApi.setTerms).toHaveBeenCalledWith(11, { payPerShare: 200, pool: 40000, maxSharesPerCreator: 2, hashtag: '#Push', minFollowers: 500 });
      expect(checkout.pay).not.toHaveBeenCalled();
    });

    it('clears the share fields when the form is reset', () => {
      component.payPerShare.set(100); component.shareHashtag.set('x'); component.maxSharesPerCreator.set(4); component.shareMinFollowers.set(9);
      component.resetForm();
      expect(component.payPerShare()).toBeNull();
      expect(component.shareHashtag()).toBe('');
      expect(component.maxSharesPerCreator()).toBe(1);
      expect(component.shareMinFollowers()).toBe(0);
    });

    it('keeps the pay sheet open with the reason when the terms cannot be saved, and retries them before paying', async () => {
      shareApi.setTerms.mockRejectedValueOnce({ error: { message: 'The pay per share must be at least ₦50' } });
      await saveOpenCampaign(50000);
      expect(component.showPayAlert()).toBe(true);
      expect(component.payError()).toContain('at least ₦50');
      await component.payNow(); // retries the terms, then pays
      expect(shareApi.setTerms).toHaveBeenCalledTimes(2);
      expect(checkout.pay).toHaveBeenCalledWith(7, expect.any(Function));
    });

    it('does not pay while the terms still cannot be saved', async () => {
      shareApi.setTerms.mockRejectedValue({ error: { message: 'Server unavailable' } });
      await saveOpenCampaign(50000);
      await component.payNow();
      expect(component.payError()).toBe('Server unavailable');
      expect(checkout.pay).not.toHaveBeenCalled();
    });
  });

  it('pays, then takes the brand to their live campaign', async () => {
    await saveOpenCampaign();
    await component.payNow();
    expect(checkout.pay).toHaveBeenCalledWith(7, expect.any(Function));
    expect(component.showPayAlert()).toBe(false);
    expect(toast.show).toHaveBeenCalledWith('Payment confirmed. Your campaign is live!', 'success');
    expect(router.navigate).toHaveBeenCalledWith(['/home/view-campaign', 7]);
  });

  it('keeps the sheet open, nothing charged, when the card window is closed', async () => {
    checkout.pay.mockResolvedValueOnce('cancelled');
    await saveOpenCampaign();
    await component.payNow();
    expect(component.showPayAlert()).toBe(true);
    expect(component.payError()).toContain('Nothing was charged');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('moves on with a heads-up when confirmation is still on its way', async () => {
    checkout.pay.mockResolvedValueOnce('pending');
    await saveOpenCampaign();
    await component.payNow();
    expect(toast.show).toHaveBeenCalledWith(expect.stringContaining('confirming your payment'), 'info', 8000);
    expect(router.navigate).toHaveBeenCalledWith(['/home/view-campaign', 7]);
  });

  it("shows the server's reason when payment cannot start", async () => {
    checkout.pay.mockRejectedValueOnce({ error: { message: 'Your wallet is frozen. Contact support.' } });
    await saveOpenCampaign();
    await component.payNow();
    expect(component.payError()).toBe('Your wallet is frozen. Contact support.');
    expect(component.payStep()).toBeNull();
  });

  it('"Pay later" keeps the saved campaign and opens it', async () => {
    await saveOpenCampaign();
    component.closePayAlert();
    expect(component.showPayAlert()).toBe(false);
    expect(toast.show).toHaveBeenCalledWith(expect.stringContaining('Your campaign is saved'), 'info', 6000);
    expect(router.navigate).toHaveBeenCalledWith(['/home/view-campaign', 7]);
  });

  it('cannot close the sheet while a payment is in flight', async () => {
    await saveOpenCampaign();
    component.payStep.set('confirming');
    component.closePayAlert();
    expect(component.showPayAlert()).toBe(true);
  });
});
