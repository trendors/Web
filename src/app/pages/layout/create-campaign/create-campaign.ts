import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, HostListener, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { CampaignActions } from '../../../store/campaign/campaign.action';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { Observable, take, firstValueFrom, debounceTime, distinctUntilChanged, switchMap, catchError, of, Subject, timeout } from 'rxjs';
import { Alert } from '../../../components/alert/alert';
import { Actions, ofType } from '@ngrx/effects';
import { ToastService } from '../../../components/toast/toast.service';
import { Invitation } from '../../../core/models/invitation/invitation.model';
import {
  selectActiveMembers,
  selectInvitationLoading,
  selectPendingApplicants,
} from '../../../store/invitation/invitation.selector';
import { InvitationActions } from '../../../store/invitation/invitation.action';
import { Calender } from "../../../components/calender/calender";
import { CampaignInfluencerService, InfluencerProfilesService, WalletService as WalletApiService } from '../../../core/api';
import { extractFollowers, formatCompactNumber } from '../../../core/utils/influencer-stats';
import { toLocalDateString } from '../../../core/utils/date';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from "@angular/material/icon";
import { Router } from '@angular/router';
import { CampaignCheckoutService, CheckoutStep } from '../../../core/services/payment/campaign-checkout.service';

interface CampaignFile {
  file: File;
  preview: string | null;
  icon: string;
  size: string;
}

interface Step {
  label: string;
  sub: string;
}

interface Plan {
  value: string;
  name: string;
  price: string;
  posts: string;
  label: string;
  features: string[];
}

interface Tier {
  name: string;
  range: string;
  amount: string;
  color: string;
}

@Component({
  selector: 'app-create-campaign',
  imports: [CommonModule, FormsModule, Alert, Calender, MatIcon],
  templateUrl: './create-campaign.html',
  styleUrls: ['./create-campaign.scss'],
})
export class CreateCampaign implements OnDestroy {

  readonly OPEN_RATE = 70;
  platforms = [
    { id: 'twitter', emoji: '𝕏', name: 'Twitter', selected: true },
    { id: 'instagram', emoji: '📸', name: 'Instagram', selected: false },
    { id: 'tiktok', emoji: '🎵', name: 'TikTok', selected: false },
    { id: 'facebook', emoji: '👥', name: 'Facebook', selected: false },
    { id: 'youtube', emoji: '▶️', name: 'YouTube', selected: false },
  ];
  steps: Step[] = [
    { label: 'Basics', sub: 'Name, dates, link' },
    { label: 'Plan & Access', sub: 'Subscription & sharers' },
    { label: 'Media', sub: 'Media' },
    { label: 'Deliverables', sub: 'Content per creator' },
    { label: 'Review', sub: 'Confirm & launch' },
  ];


  accessTypes = [
    { value: 'open', icon: '🌍', title: 'Open', desc: 'Pay per verified click. Fast, high-volume reach.', extra: 'From ₦70/click · ₦25,000 min spend' },
    { value: 'invite_only', icon: '📩', title: 'Invite Only', desc: 'Direct escrow deal with one creator.', extra: 'From ₦200,000 per deal' },
    { value: 'application', icon: '📋', title: 'Application', desc: 'Vetted creator slots, priced by reach.', extra: 'From ₦8,000/slot · 1 slot min' },
  ];

  tiers: Tier[] = [
    { name: 'Nano', range: '1k–10k', amount: '₦8,000', color: '#0ea5e9' },
    { name: 'Micro', range: '10k–50k', amount: '₦18,000', color: '#8b5cf6' },
    { name: 'Mid', range: '50k–200k', amount: '₦40,000', color: '#f59e0b' },
    { name: 'Macro', range: '200k+', amount: '₦90,000', color: '#ef4444' },
  ];



  selectedAccess = 'open';
  autoAssignTier = true;
  currentStep = 0;
  totalSteps = 5;
  selectedTier = '';

  selectedType = signal<'paid' | 'free' | null>(null);
  // New campaign payment fields per request
  campaignType = signal<'open' | 'invite' | 'application'>('open');
  budget = signal<number | null>(null);
  ratePerSlot = signal<number | null>(null); // system-set rate for open/application
  negotiatedAmount = signal<number | null>(null); // invite-only negotiated base
  maxSlots = signal<number | null>(null);
  openBudget = signal<number | null>(null); // total budget for open campaigns; clicks are derived from this
  status = signal<'draft' | 'active' | 'paused' | 'closed'>('draft');
  bonusTiers = signal<any | null>(null); // optional JSON structure for invite-only bonuses
  bonusTiersInput = '';
  campaignTitle = signal('');
  campaignDescription = signal('');
  campaignCategory = signal('');
  shareCount = signal(0);
  selectedImages = signal<any[]>([]);
  isSubmitting = signal(false);
  isDragging = signal(false);
  auto_generate_captions = signal(false);
  start_date = signal('');
  end_date = signal('');
  selectedPlan = 'Growth';
  topicInput = '';
  hash_tags = signal<string[]>([]);
  campaignName = '';
  description = '';
  link = '';
  language = 'English';
  mediaType = 'Image';
  files: CampaignFile[] = [];

  selectAccess(id: string): void {
    this.selectedAccess = id;
  }

  /** Campaign cost and how it will be covered, for the pay sheet. */
  get payBreakdown(): { budget: number; fromWallet: number; byCard: number } {
    const budget = this.pendingPayment()?.budget ?? 0;
    const balance = Math.max(0, this.walletBalance() ?? 0);
    const short = Math.max(0, budget - balance);
    // Paystack's minimum is ₦100; anything extra stays in the wallet.
    const byCard = short > 0 ? Math.max(100, Math.ceil(short)) : 0;
    return { budget, fromWallet: Math.min(balance, budget), byCard };
  }

  openPayAlert(): void {
    this.payError.set('');
    this.showPayAlert.set(true);
    void this.refreshWalletBalance();
  }

  /**
   * Open campaigns are paid up front. The campaign is created FIRST (saved,
   * not live), then paid, so a failed or abandoned payment never loses the
   * campaign and a payment can never land without one.
   */
  onCheckout(): void {
    const error = this.validationError();
    if (error) {
      this.showError(error);
      return;
    }
    if (this.selectedAccess === 'open') {
      void this.createThenPay();
    } else {
      void this.createCampaign();
    }
  }

  private async createThenPay(): Promise<void> {
    const campaign = await this.createCampaignRecord();
    if (!campaign) return; // nothing was charged
    if (campaign.payment_status !== 'awaiting_payment') return;
    this.pendingPayment.set({
      id: Number(campaign.id),
      name: campaign.name ?? 'your campaign',
      budget: Number(campaign.budget ?? 0),
    });
    this.openPayAlert();
  }

  /** Pay for the saved campaign: wallet if it covers it, otherwise card for the shortfall. */
  async payNow(): Promise<void> {
    const pending = this.pendingPayment();
    if (!pending || this.payStep()) return;
    this.payError.set('');
    try {
      const outcome = await this.checkout.pay(pending.id, (step) => this.payStep.set(step));
      this.payStep.set(null);
      if (outcome === 'cancelled') {
        this.payError.set('Payment cancelled. Nothing was charged. Your campaign is saved, so you can pay whenever you are ready.');
        return;
      }
      this.showPayAlert.set(false);
      this.pendingPayment.set(null);
      if (outcome === 'paid') {
        this.toast.show('Payment confirmed. Your campaign is live!', 'success');
      } else {
        this.toast.show("We're confirming your payment. You'll get a notification as soon as your campaign is live.", 'info', 8000);
      }
      void this.router.navigate(['/home/view-campaign', pending.id]);
    } catch (error: any) {
      this.payStep.set(null);
      const message = error?.error?.message;
      this.payError.set(
        (Array.isArray(message) ? message.join(', ') : message) || error?.message || 'Payment could not start. Please try again.',
      );
    }
  }

  closePayAlert(): void {
    if (this.payStep()) return; // a payment is in flight
    this.showPayAlert.set(false);
    const pending = this.pendingPayment();
    if (pending) {
      this.pendingPayment.set(null);
      this.toast.show('Your campaign is saved. Complete payment from the campaign page to launch it.', 'info', 6000);
      void this.router.navigate(['/home/view-campaign', pending.id]);
    }
  }

  private async refreshWalletBalance(): Promise<void> {
    try {
      const user = await firstValueFrom(this.user$);
      if (!user?.trendors_id) {
        this.walletBalance.set(null);
        return;
      }
      this.walletLoading.set(true);
      const res: any = await firstValueFrom(
        this.walletApi.walletControllerGetUserWallet(String(user.trendors_id)).pipe(
          timeout(20000),
          catchError(() => of(null)),
        ),
      );
      const balance = Number(res?.data?.balance ?? res?.balance);
      this.walletBalance.set(Number.isFinite(balance) ? balance : null);
    } catch {
      this.walletBalance.set(null);
    } finally {
      this.walletLoading.set(false);
    }
  }

  tierSlots = signal<Record<string, number>>(
    this.tiers.reduce((acc, t) => ({ ...acc, [t.name]: 0 }), {} as Record<string, number>),
  );

  // Content types creators must deliver (matches the backend deliverable enum),
  // tracked per selected social media platform.
  deliverableTypes = [
    { value: 'reel', label: 'Reels', icon: '🎬' },
    { value: 'story', label: 'Stories', icon: '📸' },
    { value: 'post', label: 'Posts', icon: '📝' },
    { value: 'video', label: 'Videos', icon: '🎥' },
  ];

  /** One row per deliverable: platform + format + quantity + fee each. */
  deliverableRows = signal<{ platform: string; format: string; qty: number; fee: number }[]>([
    { platform: 'instagram', format: 'reel', qty: 0, fee: 0 },
  ]);

  /** Which row dropdown is open (platform or format picker). */
  openRowMenu: { row: number; field: 'platform' | 'format' } | null = null;

  addDeliverableRow(): void {
    this.deliverableRows.update((rows) => [
      ...rows,
      { platform: this.platforms[0]?.id ?? 'instagram', format: 'reel', qty: 0, fee: 0 },
    ]);
  }

  removeDeliverableRow(index: number): void {
    this.deliverableRows.update((rows) => rows.filter((_, i) => i !== index));
  }

  toggleRowMenu(index: number, field: 'platform' | 'format'): void {
    this.openRowMenu =
      this.openRowMenu?.row === index && this.openRowMenu?.field === field
        ? null
        : { row: index, field };
  }

  isRowMenuOpen(index: number, field: 'platform' | 'format'): boolean {
    return this.openRowMenu?.row === index && this.openRowMenu?.field === field;
  }

  pickRowOption(index: number, field: 'platform' | 'format', value: string): void {
    this.updateDeliverableRow(index, { [field]: value });
    this.openRowMenu = null;
  }

  formatLabel(value: string): string {
    const found = this.deliverableTypes.find((t) => t.value === value);
    return found ? found.label.replace(/s$/, '') : value;
  }

  updateDeliverableRow(index: number, patch: Partial<{ platform: string; format: string; qty: number; fee: number }>): void {
    this.deliverableRows.update((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        next.qty = Math.max(0, Math.floor(Number(next.qty) || 0));
        next.fee = Math.max(0, Math.floor(Number(next.fee) || 0));
        return next;
      }),
    );
  }

  private store = inject(Store);
  private actions$ = inject(Actions);
  private toast = inject(ToastService);
  private walletApi = inject(WalletApiService);

  submitStatus = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  submitMessage = signal('');

  // Payment-method alert state.
  showPayAlert = signal(false);
  walletBalance = signal<number | null>(null);
  walletLoading = signal(false);
  payError = signal('');
  /** The saved-but-unpaid campaign the pay sheet is for. */
  pendingPayment = signal<{ id: number; name: string; budget: number } | null>(null);
  /** Where an in-flight payment is up to (null when idle). */
  payStep = signal<CheckoutStep | null>(null);
  private checkout = inject(CampaignCheckoutService);
  private router = inject(Router);

  user$ = this.store.select(selectCurrentUser);
  pendingApplicants$: Observable<Invitation[]> = this.store.select(selectPendingApplicants);
  activeMembers$: Observable<Invitation[]> = this.store.select(selectActiveMembers);
  invitationLoading$: Observable<boolean> = this.store.select(selectInvitationLoading);
  viewingProfile = signal<any | null>(null);

  @ViewChild('searchSectionRef') searchSectionRef?: ElementRef<HTMLElement>;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.deliverable-menu')) {
      this.openRowMenu = null;
    }
    if (this.users().length === 0) return; // nothing open, skip the work

    const container = this.searchSectionRef?.nativeElement;

    if (container && !container.contains(target)) {
      this.users.set([]);
    }
  }

  constructor(private assignmentApi: CampaignInfluencerService, private influencerService: InfluencerProfilesService) {

  }

  private destroyRef = inject(DestroyRef);

  // Subject to bridge template events into an RxJS stream
  private searchSubject = new Subject<string>();

  // Your existing Signal state
  users = signal<any[]>([]); //

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query: any) =>
        this.influencerService.influncerProfileControllerFindAll(10, 0, 'DESC', query).pipe(
          catchError((err) => {
            console.error('Error searching influencers:', err);
            return of([]);
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef) // Auto-unsubscribe on component destroy
    ).subscribe((res: any) => {
      this.users.set(res?.data?.list || []);
    });
  }

  // Method called from your template
  searchUsers(query: string): void {
    this.searchSubject.next(query);
  }

  selectMember(user: any): void {
    if (!this.selectedMembers().some((m) => m.id === user.id)) {
      this.selectedMembers.update((members) => [...members, user]);
    }
    this.users.set([]);
  }

  removeMember(member: any): void {
    this.selectedMembers.update((members) => members.filter((m) => m.id !== member.id));
  }

  memberName(member: any): string {
    const full = `${member?.first_name ?? ''} ${member?.last_name ?? ''}`.trim();
    return full || member?.user?.user_name || member?.user_name || 'Creator';
  }

  followersLabel(member: any): string {
    const count = Math.max(extractFollowers(member) ?? 0, extractFollowers(member?.user) ?? 0);
    return count > 0 ? formatCompactNumber(count) : '';
  }

  /**
   * Invite the drafted members to the newly created campaign. Each invite is an
   * `invited` assignment, the same thing the campaign page's Invite button
   * makes, so it shows under Invites & Applications and can be negotiated.
   */
  private sendInvites(campaignId: number): void {
    for (const member of this.selectedMembers()) {
      const userId = Number(member?.user?.id ?? member?.id);
      if (!Number.isFinite(userId)) continue;
      this.assignmentApi
        .campaignInfluencerControllerCreate({ campaignId, userId })
        .subscribe({
          error: (err) => {
            console.error('Error sending invitation:', err);
            this.toast.show(`Could not invite ${this.memberName(member)}.`, 'error');
          },
        });
    }
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.viewingProfile.set(null);
    }
  }

  // end of real database logic

  searchQuery = signal('');
  selectedMembers = signal<any[]>([]);



  initials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }


  get progressPct(): number {
    return Math.round(((this.currentStep + 1) / this.totalSteps) * 100);
  }

  get nextLabel(): string {
    return this.currentStep === this.totalSteps - 2 ? 'Review →' : 'Continue →';
  }

  goTo(step: number): void {
    this.currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  next(): void {
    if (this.currentStep >= this.totalSteps - 1) return;
    const error = this.stepError(this.currentStep);
    if (error) {
      this.showError(error);
      return;
    }
    this.goTo(this.currentStep + 1);
  }

  /** First problem on a given step, or null when it is complete. */
  stepError(step: number): string | null {
    if (step === 0) {
      if (!this.campaignTitle().trim()) return 'Give your campaign a title.';
      if (!this.start_date() || !this.end_date()) return 'Pick a start and end date.';
      if (this.end_date() < this.start_date()) return 'The end date must be after the start date.';
    }
    if (step === 1) {
      if (!['open', 'invite_only', 'application'].includes(this.selectedAccess)) {
        return 'Choose how creators join the campaign.';
      }
      if (this.selectedAccess === 'open' && Number(this.openBudget() ?? 0) < 25000) {
        return 'Open campaigns need a budget of at least ₦25,000.';
      }
      if (this.selectedAccess === 'application' && this.totalTierSlots <= 0) {
        return 'Select at least one creator tier slot.';
      }
    }
    return null;
  }

  /** First problem anywhere in the form (checked before checkout/payment). */
  validationError(): string | null {
    for (let step = 0; step < this.totalSteps; step++) {
      const error = this.stepError(step);
      if (error) return error;
    }
    return null;
  }

  private showError(message: string): void {
    this.submitStatus.set('error');
    this.submitMessage.set(message);
    this.toast.show(message, 'error');
  }

  prev(): void {
    if (this.currentStep > 0) this.goTo(this.currentStep - 1);
  }



  formatDate(d: string): string {
    if (!d) return '—';
    // 'YYYY-MM-DD' parses as UTC midnight; build a local date instead.
    const [y, m, day] = d.split('-').map(Number);
    const date = y && m && day ? new Date(y, m - 1, day) : new Date(d);
    return date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  get selectedPlatforms(): string[] {
    const ids: string[] = [];
    for (const row of this.deliverableRows()) {
      if (row.platform && !ids.includes(row.platform)) ids.push(row.platform);
    }
    return ids;
  }


  addTopic(): void {
    const v = this.topicInput.trim();
    if (!v || this.hash_tags().length >= 4) return;
    const formatted = v.startsWith('#') ? v : '#' + v;
    if (!this.hash_tags().includes(formatted)) {
      this.hash_tags.update((topics) => [...topics, formatted]);
    }
    this.topicInput = '';
  }

  removeTopic(i: number): void {
    this.hash_tags.update((topics) => topics.filter((_, index) => index !== i));
  }

  onTopicKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTopic();
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(input.files);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDragLeave(): void { }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files) this.addFiles(event.dataTransfer.files);
  }

  private addFiles(fileList: FileList): void {
    const room = 10 - this.selectedImages().length;
    const incoming = Array.from(fileList);
    if (incoming.length > room) {
      this.toast.show('You can attach up to 10 files.', 'info');
    }
    const added = incoming.slice(0, Math.max(0, room)).map((f) => this.buildCampaignFile(f));
    this.selectedImages.update((list) => [...list, ...added]);
  }

  private buildCampaignFile(f: File): CampaignFile {
    const isImage = f.type.startsWith('image/');
    return {
      file: f,
      preview: isImage ? URL.createObjectURL(f) : null,
      icon: f.type.startsWith('video/') ? '🎬' : f.type === 'application/pdf' ? '📄' : '📎',
      size: this.fmtSize(f.size),
    };
  }

  removeFile(i: number): void {
    // Use .update() rather than mutating the array returned by the getter —
    // signals don't detect in-place mutation (e.g. .splice()), so the UI
    // would silently fail to refresh.
    const removed = this.selectedImages()[i];
    if (removed?.preview) URL.revokeObjectURL(removed.preview);
    this.selectedImages.update((list) => list.filter((_, index) => index !== i));
  }

  private revokePreviews(): void {
    for (const file of this.selectedImages()) {
      if (file.preview) URL.revokeObjectURL(file.preview);
    }
  }

  ngOnDestroy(): void {
    this.revokePreviews();
  }

  private fmtSize(b: number): string {
    if (b < 1024) return b + 'B';
    if (b < 1048576) return (b / 1024).toFixed(1) + 'KB';
    return (b / 1048576).toFixed(1) + 'MB';
  }

  onDateRangeConfirmed(range: { start: Date | null; end: Date | null }): void {
    if (range.start) {
      this.start_date.set(toLocalDateString(range.start));
    }
    if (range.end) {
      this.end_date.set(toLocalDateString(range.end));
    }
  }



  resetForm(): void {
    this.revokePreviews();
    this.selectedMembers.set([]);
    this.currentStep = 0;
    this.campaignTitle.set('');
    this.campaignDescription.set('');
    this.campaignCategory.set('');
    this.selectedType.set(null);
    this.selectedImages.set([]);
    this.hash_tags.set([]);
    this.auto_generate_captions.set(false);
    this.start_date.set('');
    this.end_date.set('');
    this.selectedAccess = 'open';
    this.shareCount.set(0);
    this.campaignType.set('open');
    this.budget.set(null);
    this.ratePerSlot.set(null);
    this.negotiatedAmount.set(null);
    this.maxSlots.set(null);
    this.openBudget.set(null);
    this.status.set('draft');
    this.bonusTiers.set(null);
    this.bonusTiersInput = '';

    this.tierSlots.set(
      this.tiers.reduce((acc, t) => ({ ...acc, [t.name]: 0 }), {} as Record<string, number>),
    );
    this.deliverableRows.set([{ platform: 'instagram', format: 'reel', qty: 0, fee: 0 }]);
  }

  get estimatedClicks(): number {
    const b = Number(this.openBudget() ?? 0);
    if (!this.OPEN_RATE || b <= 0) return 0;
    return Math.floor(b / this.OPEN_RATE);
  }

  get computedBudget(): number {
    const access = this.selectedAccess;
    const slots = Number(this.maxSlots() ?? 0);
    if (access === 'open') {
      return Number(this.openBudget() ?? 0);
    }
    if (access === 'application') {
      return this.applicationBudget;
    }
    if (access === 'invite_only') {
      return Number(this.negotiatedAmount() ?? 0) * slots;
    }
    return 0;
  }

  private parseTierAmount(amount: string): number {
    const n = Number(amount.replace(/[^\d.]/g, ''));
    return Number.isNaN(n) ? 0 : n;
  }

  getTierSlots(name: string): number {
    return this.tierSlots()[name] ?? 0;
  }
  setTierSlots(name: string, value: number | string): void {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    this.tierSlots.update((cur) => ({ ...cur, [name]: n }));
  }

  get totalTierSlots(): number {
    return Object.values(this.tierSlots()).reduce((sum, n) => sum + (n || 0), 0);
  }

  get applicationBudget(): number {
    return this.tiers.reduce(
      (sum, t) => sum + this.parseTierAmount(t.amount) * this.getTierSlots(t.name),
      0,
    );
  }

  platformDisplayName(platformId: string): string {
    return this.platforms.find((p) => p.id === platformId)?.name ?? platformId;
  }

  get totalDeliverables(): number {
    return this.deliverableRows().reduce((sum, row) => sum + (row.qty || 0), 0);
  }

  /** Non-zero entries shaped for the backend deliverable DTO. */
  get deliverablesPayload(): {
    content_type: string;
    platform: string;
    quantity: number;
    rate_per_post?: number;
  }[] {
    return this.deliverableRows()
      .filter((row) => row.platform && row.format && row.qty > 0)
      .map((row) => ({
        content_type: row.format,
        platform: row.platform,
        quantity: row.qty,
        ...(row.fee > 0 ? { rate_per_post: row.fee } : {}),
      }));
  }

  get deliverablesSummary(): string {
    const parts = this.deliverableRows()
      .filter((row) => row.platform && row.format && row.qty > 0)
      .map((row) => {
        const type = this.deliverableTypes.find((t) => t.value === row.format);
        const label = type?.label ?? row.format;
        const name = row.qty === 1 ? label.replace(/s$/, '') : label;
        const fee = row.fee > 0 ? ` @ ₦${row.fee.toLocaleString()}` : '';
        return `${row.qty} × ${this.platformDisplayName(row.platform)} ${name}${fee}`;
      });
    return parts.length > 0 ? parts.join(' · ') : 'None set';
  }

  selectTier(): void {
    alert('Tier selection coming soon!');
  }

  /** Resolves true once the campaign exists on the server. */
  async createCampaign(): Promise<boolean> {
    return (await this.createCampaignRecord()) != null;
  }

  /** Creates the campaign; resolves to it, or null if it could not be created. */
  private async createCampaignRecord(): Promise<any | null> {
    this.isSubmitting.set(true);

    try {
      const error = this.validationError();
      if (error) throw new Error(error);

      const user = await firstValueFrom(this.user$);
      if (!user?.id) throw new Error('We could not confirm your account. Please log in again.');

      const access = this.selectedAccess;
      const title = this.campaignTitle().trim();
      const formData = new FormData();
      formData.append('title', title);
      formData.append('name', title);
      formData.append('description', this.campaignDescription());
      formData.append('category', this.campaignCategory());
      if (this.selectedType()) formData.append('type', String(this.selectedType()));
      formData.append('creator_id', String(user.id));
      formData.append('auto_generate_captions', this.auto_generate_captions().toString());
      formData.append('hash_tags', JSON.stringify(this.hash_tags()));
      formData.append('start_date', this.start_date());
      formData.append('end_date', this.end_date());
      formData.append('access', access);
      formData.append('platform', JSON.stringify(this.selectedPlatforms));

      if (access === 'open') {
        const budget = Number(this.openBudget());
        this.budget.set(budget);
        this.maxSlots.set(this.estimatedClicks);
        this.ratePerSlot.set(this.OPEN_RATE);
        formData.append('ratePerSlot', String(this.OPEN_RATE));
        formData.append('maxSlots', String(this.estimatedClicks));
        formData.append('totalBudget', String(budget));
      } else if (access === 'application') {
        const budget = this.applicationBudget;
        this.budget.set(budget);
        this.maxSlots.set(this.totalTierSlots);
        formData.append('tierSlots', JSON.stringify(this.tierSlots()));
        formData.append('maxSlots', String(this.totalTierSlots));
        formData.append('totalBudget', String(budget));
      } else if (access === 'invite_only') {
        // Invite-only fees are agreed per creator in the negotiation flow, so
        // there is no up-front budget. Slots = creators being invited.
        const slots = this.selectedMembers().length;
        if (slots > 0) formData.append('maxSlots', String(slots));
        if (this.bonusTiersInput.trim()) {
          try {
            formData.append('bonusTiers', JSON.stringify(JSON.parse(this.bonusTiersInput)));
          } catch {
            throw new Error('Bonus tiers must be valid JSON.');
          }
        }
      }

      this.selectedImages().forEach((img) => formData.append('files', img.file));
      formData.append('deliverables', JSON.stringify(this.deliverablesPayload));

      this.submitStatus.set('loading');
      this.submitMessage.set('Creating your campaign…');

      // Listen before dispatching so the result can never be missed.
      const result = firstValueFrom(
        this.actions$.pipe(
          ofType(CampaignActions.createCampaignSuccess, CampaignActions.createCampaignFailure),
        ),
      );
      this.store.dispatch(CampaignActions.createCampaign({ dto: formData }));
      const outcome = await result;
      this.isSubmitting.set(false);

      if (outcome.type === CampaignActions.createCampaignSuccess.type) {
        const campaign = (outcome as ReturnType<typeof CampaignActions.createCampaignSuccess>).campaign;
        const campaignId = Number(campaign?.id);
        if (Number.isFinite(campaignId)) this.sendInvites(campaignId);
        const awaitingPayment = (campaign as any)?.payment_status === 'awaiting_payment';
        const message = awaitingPayment
          ? 'Campaign saved. Complete payment to launch it.'
          : 'Campaign created successfully.';
        this.submitStatus.set('success');
        this.submitMessage.set(message);
        if (!awaitingPayment) this.toast.show(message, 'success');
        this.resetForm();
        return campaign;
      }
      const message =
        (outcome as ReturnType<typeof CampaignActions.createCampaignFailure>).error ||
        'Failed to create campaign';
      this.showError(message);
      return null;
    } catch (error: any) {
      console.error(error);
      this.isSubmitting.set(false);
      this.showError(error?.message || 'Failed to create campaign');
      return null;
    }
  }
}