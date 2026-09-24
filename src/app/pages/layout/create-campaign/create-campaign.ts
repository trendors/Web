import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, ElementRef, HostListener, inject, Input, signal, ViewChild } from '@angular/core';
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
import { TopupModalComponent } from "../../../components/topup-modal/topup-modal";
import { CreateInvitationDto, InfluencerProfilesService, InvitationsService, WalletService as WalletApiService } from '../../../core/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from "@angular/material/icon";

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
  imports: [CommonModule, FormsModule, Alert, Calender, TopupModalComponent, MatIcon],
  templateUrl: './create-campaign.html',
  styleUrls: ['./create-campaign.scss'],
})
export class CreateCampaign {

  readonly OPEN_RATE = 70;
  platforms = [
    { id: 'twitter', emoji: '𝕏', name: 'Twitter', selected: true },
    { id: 'instagram', emoji: '📸', name: 'Instagram', selected: false },
    { id: 'tiktok', emoji: '🎵', name: 'TikTok', selected: false },
    { id: 'facebook', emoji: '👥', name: 'Facebook', selected: false },
  ];
  steps: Step[] = [
    { label: 'Basics', sub: 'Name, dates, link' },
    { label: 'Plan & Access', sub: 'Subscription & sharers' },
    { label: 'Platforms & Media', sub: 'Platforms and media' },
    { label: 'Deliverables', sub: 'Content creators must post' },
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

  showTopup = false;


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

  onTopupSuccess(): void {
    // Refresh the balance shown in the payment alert.
    void this.refreshWalletBalance();
  }

  /** Shortfall shown next to the top-up shortcut. */
  get topupShortfall(): number {
    const balance = this.walletBalance() ?? 0;
    return Math.max(0, Math.ceil((this.computedBudget - balance) / 100) * 100);
  }

  openPayAlert(): void {
    this.payError.set('');
    this.showPayAlert.set(true);
    void this.refreshWalletBalance();
  }

  /** Only open campaigns take payment up front; other access types create directly. */
  onCheckout(): void {
    if (this.selectedAccess === 'open') {
      this.openPayAlert();
    } else {
      void this.createCampaign();
    }
  }

  closePayAlert(): void {
    if (this.isSubmitting()) return;
    this.showPayAlert.set(false);
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

  payFromWallet(): void {
    if (this.isSubmitting()) return;
    this.payError.set('');
    this.isSubmitting.set(true);
    void (async () => {
      try {
        const user = await firstValueFrom(this.user$);
        const trendorsId = String((user as any)?.trendors_id ?? '');
        if (!trendorsId) {
          throw new Error('We could not confirm your account. Please log in again.');
        }
        const receipt: any = await firstValueFrom(
          this.walletApi
            .walletControllerPayFromWallet({
              trendorsId,
              amount: this.computedBudget,
              description: `Campaign: ${this.campaignTitle() || 'Untitled'}`,
            })
            .pipe(timeout(30000)),
        );
        if (receipt?.error === true) {
          throw new Error(receipt?.message || 'Wallet payment failed.');
        }
        this.showPayAlert.set(false);
        await this.createCampaign();
      } catch (error: any) {
        console.error('Wallet payment error:', error);
        this.isSubmitting.set(false);
        this.payError.set(
          error?.name === 'TimeoutError'
            ? 'Wallet payment timed out. Please try again.'
            : (error?.error?.message ?? error?.message ?? 'Wallet payment failed.'),
        );
      }
    })();
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

  deliverableQtyByPlatform = signal<Record<string, Record<string, number>>>({});

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

  user$ = this.store.select(selectCurrentUser);
  pendingApplicants$: Observable<Invitation[]> = this.store.select(selectPendingApplicants);
  activeMembers$: Observable<Invitation[]> = this.store.select(selectActiveMembers);
  invitationLoading$: Observable<boolean> = this.store.select(selectInvitationLoading);
  viewingProfile = signal<any | null>(null);
  @Input() campaignId: number | null = null;

  @ViewChild('searchSectionRef') searchSectionRef?: ElementRef<HTMLElement>;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.users().length === 0) return; // nothing open, skip the work

    const target = event.target as HTMLElement;
    const container = this.searchSectionRef?.nativeElement;

    if (container && !container.contains(target)) {
      this.users.set([]);
    }
  }

  constructor(private invitationSvc: InvitationsService, private influencerService: InfluencerProfilesService) {

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

  inviteMember(user: any): void {
    this.invitationSvc.invitationControllerCreateInvitation({
      campaignId: this.campaignId!,
      userId: user.user?.id ?? user.id,
      role: CreateInvitationDto.RoleEnum.Influencer, // Replace with the appropriate role
    }).subscribe({
      next: (res) => {
        console.log('Invitation sent successfully:', res);
      },
      error: (err) => {
        console.error('Error sending invitation:', err);
      }
    });
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
    const isLastStep = this.currentStep === this.totalSteps - 1;

    if (isLastStep) {
      return;
    } else {
      this.goTo(this.currentStep + 1);
    }
  }

  prev(): void {
    if (this.currentStep > 0) this.goTo(this.currentStep - 1);
  }



  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  get selectedPlatforms(): string[] {
    return this.platforms.filter((p) => p.selected).map((p) => p.id);
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
    const incoming = Array.from(fileList);
    const currentFiles = this.selectedImages().map((f) => f.file);
    const combined = [...currentFiles, ...incoming].slice(0, 10);
    const mappedFiles = combined.map((f) => this.buildCampaignFile(f));
    this.selectedImages.set(mappedFiles);
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
    this.selectedImages.update((list) => list.filter((_, index) => index !== i));
  }

  private fmtSize(b: number): string {
    if (b < 1024) return b + 'B';
    if (b < 1048576) return (b / 1024).toFixed(1) + 'KB';
    return (b / 1048576).toFixed(1) + 'MB';
  }

  onDateRangeConfirmed(range: { start: Date | null; end: Date | null }): void {
    if (range.start) {
      this.start_date.set(range.start.toISOString().split('T')[0]);
    }
    if (range.end) {
      this.end_date.set(range.end.toISOString().split('T')[0]);
    }
  }



  resetForm(): void {
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
    this.selectedAccess = '';
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
    this.deliverableQtyByPlatform.set({});
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

  getDeliverableQty(platform: string, type: string): number {
    return this.deliverableQtyByPlatform()[platform]?.[type] ?? 0;
  }

  setDeliverableQty(platform: string, type: string, value: number | string): void {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    this.deliverableQtyByPlatform.update((cur) => ({
      ...cur,
      [platform]: { ...(cur[platform] ?? {}), [type]: n },
    }));
  }

  platformDisplayName(platformId: string): string {
    return this.platforms.find((p) => p.id === platformId)?.name ?? platformId;
  }

  get totalDeliverables(): number {
    return Object.values(this.deliverableQtyByPlatform()).reduce(
      (sum, perType) => sum + Object.values(perType).reduce((s, n) => s + (n || 0), 0),
      0,
    );
  }

  /** Non-zero entries shaped for the backend deliverable DTO. */
  get deliverablesPayload(): { content_type: string; platform: string; quantity: number }[] {
    const out: { content_type: string; platform: string; quantity: number }[] = [];
    for (const [platform, perType] of Object.entries(this.deliverableQtyByPlatform())) {
      for (const t of this.deliverableTypes) {
        const quantity = perType[t.value] ?? 0;
        if (quantity > 0) out.push({ content_type: t.value, platform, quantity });
      }
    }
    return out;
  }

  get deliverablesSummary(): string {
    const groups: string[] = [];
    for (const platform of this.selectedPlatforms) {
      const parts = this.deliverableTypes
        .map((t) => ({ label: t.label, qty: this.getDeliverableQty(platform, t.value) }))
        .filter((d) => d.qty > 0)
        .map((d) => `${d.qty} ${d.qty === 1 ? d.label.replace(/s$/, '') : d.label}`);
      if (parts.length > 0) groups.push(`${this.platformDisplayName(platform)}: ${parts.join(', ')}`);
    }
    return groups.length > 0 ? groups.join(' · ') : 'None set';
  }

  selectTier(): void {
    alert('Tier selection coming soon!');
  }

  async createCampaign() {
    this.isSubmitting.set(true);

    try {
      const user = await firstValueFrom(this.user$); // fetch once

      const formData = new FormData();
      formData.append('title', this.campaignTitle());
      formData.append('description', this.campaignDescription());
      formData.append('category', this.campaignCategory());
      formData.append('type', String(this.selectedType() ?? ''));
      formData.append('creator_id', user?.id?.toString() || '');
      formData.append('auto_generate_captions', this.auto_generate_captions().toString());
      formData.append('hash_tags', JSON.stringify(this.hash_tags()));
      formData.append('name', `${this.campaignTitle()} `);
      formData.append('start_date', this.start_date());
      formData.append('end_date', this.end_date());
      formData.append('access', this.selectedAccess);
      formData.append('platform', JSON.stringify(this.selectedPlatforms));
      const access = this.selectedAccess;
      const cType = access === 'open' ? 'open' : access === 'invite_only' ? 'invite' : 'application';
      if (cType === 'open' || cType === 'application') {
        // system sets the rate for open; application uses per-tier slot counts
        if (cType === 'open' && (!this.openBudget() || Number(this.openBudget()) < 25000)) {
          throw new Error('Campaign budget must be at least ₦25,000 for open campaigns');
        }
        if (cType === 'open') {
          const computedBudget = Number(this.openBudget());
          const slots = this.estimatedClicks;
          this.budget.set(computedBudget);
          this.maxSlots.set(slots);
          // ensure ratePerSlot reflects system rate
          this.ratePerSlot.set(this.OPEN_RATE);
          formData.append('ratePerSlot', String(this.OPEN_RATE));
          formData.append('maxSlots', String(slots));
          formData.append('totalBudget', String(computedBudget));
        } else {
          // application: budget is derived from chosen slots per creator tier
          if (this.totalTierSlots <= 0) {
            throw new Error('Select at least one creator tier slot for application campaigns');
          }
          const computedBudget = this.applicationBudget;
          this.budget.set(computedBudget);
          this.maxSlots.set(this.totalTierSlots);
          formData.append('tierSlots', JSON.stringify(this.tierSlots()));
          formData.append('maxSlots', String(this.totalTierSlots));
          formData.append('totalBudget', String(computedBudget));
        }
      } else if (cType === 'invite') {
        // invite-only: negotiatedAmount (base) agreed 1-on-1; optional bonus tiers (pre-declared cap)
        if (!this.negotiatedAmount() || !this.maxSlots()) {
          throw new Error('negotiatedAmount and maxSlots must be set for invite-only campaigns');
        }
        const computedBudget = Number(this.negotiatedAmount()) * Number(this.maxSlots());
        this.budget.set(computedBudget);
        formData.append('negotiatedAmount', String(this.negotiatedAmount()));
        formData.append('maxSlots', String(this.maxSlots()));
        formData.append('totalBudget', String(computedBudget));
        // if user provided bonus tiers JSON in the UI, parse and include
        if (this.bonusTiersInput) {
          try {
            const parsed = JSON.parse(this.bonusTiersInput);
            this.bonusTiers.set(parsed);
            formData.append('bonusTiers', JSON.stringify(parsed));
          } catch (err) {
            console.warn('Invalid bonusTiers JSON, ignoring');
          }
        } else if (this.bonusTiers()) {
          formData.append('bonusTiers', JSON.stringify(this.bonusTiers()));
        }
      }

      this.selectedImages().forEach((img) => formData.append('files', img.file));
      formData.append('deliverables', JSON.stringify(this.deliverablesPayload));

      this.store.dispatch(
        CampaignActions.createCampaign({
          dto: formData,
          files: this.selectedImages().map((img) => img.file),
        }),
      );

      this.submitStatus.set('loading');
      this.submitMessage.set('Creating your campaign…');

      // The effect answers exactly once for this dispatch.
      this.actions$
        .pipe(
          ofType(CampaignActions.createCampaignSuccess, CampaignActions.createCampaignFailure),
          take(1),
        )
        .subscribe((result) => {
          this.isSubmitting.set(false);
          if (result.type === CampaignActions.createCampaignSuccess.type) {
            this.submitStatus.set('success');
            this.submitMessage.set('Campaign created successfully.');
            this.toast.show('Campaign created successfully.', 'success');
            this.resetForm();
          } else {
            const message =
              (result as ReturnType<typeof CampaignActions.createCampaignFailure>)?.error ||
              'Failed to create campaign';
            this.submitStatus.set('error');
            this.submitMessage.set(message);
            this.toast.show(message, 'error');
          }
        });
    } catch (error: any) {
      console.error(error);
      const message = error?.message || 'Failed to create campaign';
      this.isSubmitting.set(false);
      this.submitStatus.set('error');
      this.submitMessage.set(message);
      this.toast.show(message, 'error');
      // Replaced the blocking window.alert with toast + inline status.
    }
  }
}