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

  /** Valid step-0 basics so a test can focus on the later steps. */
  function fillBasics(title = 'Test Campaign'): void {
    component.campaignTitle.set(title);
    component.start_date.set('2026-11-01');
    component.end_date.set('2026-11-30');
  }

  /** Wait until createCampaign has dispatched and is awaiting the effect. */
  async function untilDispatched(): Promise<void> {
    await vi.waitFor(() => expect(component.submitStatus()).toBe('loading'));
  }

  beforeEach(async () => {
    actions$ = new Subject();
    assignmentApi = { campaignInfluencerControllerCreate: vi.fn(() => of({})) };
    toast = { show: vi.fn() };
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

  it('should expose five steps including deliverables', () => {
    expect(component.totalSteps).toBe(5);
    expect(component.steps.map((s) => s.label)).toEqual([
      'Basics',
      'Plan & Access',
      'Media',
      'Deliverables',
      'Review',
    ]);
  });

  it('should track deliverables per platform, format, qty and fee', () => {
    expect(component.totalDeliverables).toBe(0);
    expect(component.deliverablesSummary).toBe('None set');
    component.updateDeliverableRow(0, { platform: 'twitter', format: 'reel', qty: 2, fee: 150 });
    component.addDeliverableRow();
    component.updateDeliverableRow(1, { platform: 'instagram', format: 'story', qty: 1, fee: 40 });
    expect(component.totalDeliverables).toBe(3);
    expect(component.deliverablesSummary).toContain('Twitter');
    expect(component.selectedPlatforms).toEqual(['twitter', 'instagram']);
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
    component.end_date.set('2026-10-01');
    component.next();
    expect(component.currentStep).toBe(0);
    component.end_date.set('2026-11-30');
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
    const pending = component.createCampaign();
    await untilDispatched();
    actions$.next(CampaignActions.createCampaignFailure({ error: 'Something broke' }));
    expect(await pending).toBe(false);
    expect(component.submitStatus()).toBe('error');
    expect(component.submitMessage()).toBe('Something broke');
    expect(component.isSubmitting()).toBe(false);
    expect(toast.show).toHaveBeenCalledWith('Something broke', 'error');
  });

  it('should open the pay alert only for valid open campaigns', () => {
    component.selectedAccess = 'open';
    component.onCheckout();
    expect(component.showPayAlert()).toBe(false);

    fillBasics();
    component.openBudget.set(50000);
    component.onCheckout();
    expect(component.showPayAlert()).toBe(true);
  });

  it('should create invite-only campaigns without payment, then invite the drafted creators', async () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    fillBasics('Invite Campaign');
    component.selectedAccess = 'invite_only';
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
    fillBasics('Paid Campaign');
    component.selectedAccess = 'open';
    component.openBudget.set(50000);
    component.openPayAlert();
    await fixture.whenStable();
    component.payFromWallet();
    await untilDispatched();
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
    await vi.waitFor(() => expect(component.submitStatus()).toBe('success'));
  });

  it('should never charge the wallet when the form is invalid', async () => {
    component.selectedAccess = 'open';
    component.openBudget.set(50000); // no title or dates
    component.payFromWallet();
    await fixture.whenStable();
    expect(walletApi.walletControllerPayFromWallet).not.toHaveBeenCalled();
    expect(component.payError()).toBe('Give your campaign a title.');
  });

  it('should not charge when the known balance is too low', async () => {
    fillBasics();
    component.selectedAccess = 'open';
    component.openBudget.set(90000);
    component.openPayAlert();
    await fixture.whenStable(); // balance 60,000
    component.payFromWallet();
    expect(walletApi.walletControllerPayFromWallet).not.toHaveBeenCalled();
    expect(component.payError()).toContain('balance is too low');
  });

  it('should tell the user they were charged when creation fails after payment', async () => {
    fillBasics();
    walletApi.walletControllerPayFromWallet.mockReturnValueOnce(
      of({ error: false, data: { balance: 10000, transactionId: 'TX-1' } }),
    );
    component.selectedAccess = 'open';
    component.openBudget.set(50000);
    component.payFromWallet();
    await untilDispatched();
    actions$.next(CampaignActions.createCampaignFailure({ error: 'boom' }));
    await vi.waitFor(() =>
      expect(component.submitMessage()).toContain('Your wallet was charged ₦50,000 (payment reference TX-1)'),
    );
    expect(component.isSubmitting()).toBe(false);
  });

  it('should show the wallet payment failure and not create the campaign', async () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    walletApi.walletControllerPayFromWallet.mockReturnValueOnce(
      of({ error: true, message: 'Insufficient funds' }),
    );
    fillBasics();
    component.selectedAccess = 'open';
    component.openBudget.set(50000);
    component.openPayAlert();
    await fixture.whenStable();
    component.payFromWallet();
    await vi.waitFor(() => expect(component.payError()).toBe('Insufficient funds'));
    expect(component.showPayAlert()).toBe(true);
    expect(component.isSubmitting()).toBe(false);
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Campaign Action Flow] Create Campaign' }),
    );
  });
});
