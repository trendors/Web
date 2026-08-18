import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { CampaignActions } from '../../../store/campaign/campaign.action';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { Observable, take, firstValueFrom } from 'rxjs';
import { Alert } from '../../../components/alert/alert';
import { Actions, ofType } from '@ngrx/effects';
import { InvitationService } from '../../../core/services/invitation/invitation.service';
import { Invitation } from '../../../core/models/invitation/invitation.model';
import {
  selectActiveMembers,
  selectInvitationLoading,
  selectPendingApplicants,
} from '../../../store/invitation/invitation.selector';
import { InvitationActions } from '../../../store/invitation/invitation.action';
import { Calender } from "../../../components/calender/calender";

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
  imports: [CommonModule, FormsModule, Alert, Calender],
  templateUrl: './create-campaign.html',
  styleUrls: ['./create-campaign.scss'],
})
export class CreateCampaign {
  readonly OPEN_RATE = 70; // NGN per click for open campaigns
  platforms = [
    { id: 'twitter', emoji: '𝕏', name: 'Twitter', selected: true },
    { id: 'instagram', emoji: '📸', name: 'Instagram', selected: false },
    { id: 'tiktok', emoji: '🎵', name: 'TikTok', selected: false },
    { id: 'facebook', emoji: '👥', name: 'Facebook', selected: false },
  ];
  languages = ['English', 'Nigerian Pidgin', 'Yoruba', 'Igbo', 'Hausa'];
  mediaTypes = ['Image', 'Video', 'Text Only'];
  steps: Step[] = [
    { label: 'Basics', sub: 'Name, dates, link' },
    { label: 'Content', sub: 'Media & platforms' },
    { label: 'Plan & Access', sub: 'Subscription & sharers' },
    { label: 'Review', sub: 'Confirm & launch' },
  ];
  plans: Plan[] = [
    {
      value: 'Starter',
      name: 'Starter',
      price: '₦30,000',
      posts: '100 posts included',
      label: 'Starter — ₦30,000/mo',
      features: ['All tiers', 'Open campaigns', 'Basic analytics'],
    },
    {
      value: 'Growth',
      name: '★ Growth',
      price: '₦50,000',
      posts: '200 posts included',
      label: 'Growth — ₦50,000/mo',
      features: ['Custom rates', 'All access types', 'Full analytics'],
    },
    {
      value: 'Enterprise',
      name: 'Enterprise',
      price: 'Custom',
      posts: 'Unlimited posts',
      label: 'Enterprise — Custom',
      features: ['Dedicated manager', 'Priority payout', 'Custom tiers'],
    },
  ];

  accessTypes = [
  { value: 'open', icon: '🌍', title: 'Open', desc: 'Pay per verified click. Fast, high-volume reach.', extra: 'From ₦70/click · ₦25,000 min spend' },
  { value: 'invite-only', icon: '📩', title: 'Invite Only', desc: 'Direct escrow deal with one creator.', extra: 'From ₦200,000 per deal' },
    { value: 'application', icon: '📋', title: 'Application', desc: 'Vetted creator slots, priced by reach.', extra: 'From ₦8,000/slot · 1 slot min' },

];

  tiers: Tier[] = [
    { name: 'Nano', range: '1k–10k', amount: '₦8,000', color: '#0ea5e9' },
    { name: 'Micro', range: '10k–50k', amount: '₦18,000', color: '#8b5cf6' },
    { name: 'Mid', range: '50k–200k', amount: '₦40,000', color: '#f59e0b' },
    { name: 'Macro', range: '200k+', amount: '₦90,000', color: '#ef4444' },
  ];

  selectedSlot: string | null = null;
 
  selectAccess(id: string): void {
    this.selectedAccess = id;
  }

  // Slot counts chosen per creator tier for Application campaigns
  tierSlots = signal<Record<string, number>>(
    this.tiers.reduce((acc, t) => ({ ...acc, [t.name]: 0 }), {} as Record<string, number>),
  );

  // Real Database
  private store = inject(Store);
  private actions$ = inject(Actions);

  user$ = this.store.select(selectCurrentUser);
  private invitationSvc = inject(InvitationService);
  pendingApplicants$: Observable<Invitation[]> = this.store.select(selectPendingApplicants);
  activeMembers$: Observable<Invitation[]> = this.store.select(selectActiveMembers);
  invitationLoading$: Observable<boolean> = this.store.select(selectInvitationLoading);
  // invitations = signal<Invitation[]>([]);
  // selectedMembers2 = signal<any[]>([]);
  viewingProfile = signal<any | null>(null);
  @Input() campaignId: number | null = null;

  ngOnInit(): void {
    if (this.campaignId) {
      this.store.dispatch(
        InvitationActions.loadCampaignInvitations({ campaignId: this.campaignId }),
      );
    } else {
      console.warn('campaignId missing; using placeholder demo invitations');
      this.store.dispatch(
        InvitationActions.loadCampaignInvitationsSuccess({
          invites: [
            {
              id: 999,
              status: 'Pending',
              role: 'Influncer',
              user: {
                id: 111,
                name: 'Test User',
                trendor_id: 'T-001',
                influencerProfile: { platforms: [{ name: 'Instagram', followers: '1.2k' }] },
                status: 'Pending'
              },
              campaign: { id: 123, name: 'Demo Campaign' },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      );
    }

    this.user$.pipe(take(1)).subscribe((user) => {
      if (user?.id) {
        this.invitationSvc.getMyInvitations(user.id).subscribe({
          next: (list) => {
            this.selectedMembers.set(list);
          },
          error: (err) => console.error('invitationSvc failed', err),
        });
      }
    });

    this.actions$
      .pipe(ofType(CampaignActions.createCampaignSuccess), take(1))
      .subscribe(({ campaign }) => {
        if (campaign?.id) {
          this.campaignId = campaign.id;
          this.store.dispatch(
            InvitationActions.loadCampaignInvitations({ campaignId: campaign.id }),
          );
        }
      });
  }

  addMember(member: any) {
    this.selectedMembers.update((list) => [...list, member]);
    this.searchQuery.set(''); // Collapse dropdown
  }

  removeMember(id: any) {
    this.selectedMembers.update((list) => list.filter((m) => m.id !== id));
  }

  // Aplicant
  acceptApplicant(invite: Invitation): void {
    this.user$.pipe(take(1)).subscribe((user) => {
      if (!user?.id) return;
      this.store.dispatch(
        InvitationActions.acceptInvite({
          inviteId: invite.id,
          userId: user.id,
        }),
      );
    });
  }

  declineApplicant(invite: Invitation): void {
    this.user$.pipe(take(1)).subscribe((user) => {
      if (!user?.id) return;
      this.store.dispatch(
        InvitationActions.declineInvite({
          inviteId: invite.id,
          userId: user.id,
        }),
      );
    });
  }

  removeActiveMember(invite: Invitation): void {
    this.store.dispatch(InvitationActions.removeActiveMember({ inviteId: invite.id }));
  }

  showProfile(invite: Invitation): void {
    this.viewingProfile.set(invite);
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.viewingProfile.set(null);
    }
  }

  // end of real database logic

  // Fake Database
  allRecords = signal([
    { id: '1', name: 'Sayil Tests', trendor_id: 'SALH-PH-10034', status: 'ACTIVE', gender: 'Male' },
    { id: '2', name: 'Preye Owa', trendor_id: 'SALH-PH-10065', status: 'ACTIVE', gender: 'Female' },
    {
      id: '3',
      name: 'Boma George',
      trendor_id: 'SALH-PH-10099',
      status: 'INACTIVE',
      gender: 'Male',
    },
    {
      id: '4',
      name: 'Kelechi Amadi',
      trendor_id: 'SALH-PH-10122',
      status: 'ACTIVE',
      gender: 'Male',
    },
  ]);

  searchQuery = signal('');
  selectedMembers = signal<any[]>([]);

  // Dropdown Logic: Show matches that aren't already selected
  searchResults = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return [];
    return this.allRecords().filter(
      (r) => r.name.toLowerCase().includes(q) && !this.selectedMembers().some((s) => s.id === r.id),
    );
  });

  applicants = signal([
    {
      id: 'a1',
      name: 'Zina Victor',
      status: 'PENDING',
      platforms: [
        { name: 'Instagram', followers: '12.5k' },
        { name: 'TikTok', followers: '45k' },
        { name: 'X', followers: '2.1k' },
      ],
    },
    {
      id: 'a2',
      name: 'Tunde Mike',
      status: 'PENDING',
      platforms: [
        { name: 'Instagram', followers: '1.2k' },
        { name: 'Facebook', followers: '500' },
      ],
    },
  ]);

  initials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  selectedAccess = 'open';
  autoAssignTier = true;
  currentStep = 0;
  totalSteps = 4;
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
  isFormValid: any;
  totalBudget: any;
  selectedPlan = 'Growth';
  autoGenerate = true;
  topicInput = '';
  hash_tags = signal<string[]>([]);
  campaignName = '';
  description = '';
  link = '';
  language = 'English';
  mediaType = 'Image';
  files: CampaignFile[] = [];

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

  getPlatformName(id: string): string {
    const p = this.platforms.find((x) => x.id === id);
    return p ? p.name : id;
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

  onDragLeave(): void {}

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
    this.selectedImages().splice(i, 1);
  }

  private fmtSize(b: number): string {
    if (b < 1024) return b + 'B';
    if (b < 1048576) return (b / 1024).toFixed(1) + 'KB';
    return (b / 1048576).toFixed(1) + 'MB';
  }

  get activePlan(): Plan {
    return this.plans.find((p) => p.value === this.selectedPlan) ?? this.plans[1];
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
    this.totalBudget = 0;
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
      formData.append('creator_id', user?.id.toString() || '');
      formData.append('auto_generate_captions', this.auto_generate_captions().toString());
      formData.append('hash_tags', JSON.stringify(this.hash_tags()));
      formData.append('name', `${user?.first_name}_${user?.last_name}`);
      formData.append('start_date', this.start_date());
      formData.append('end_date', this.end_date());
      formData.append('access', this.selectedAccess);
      formData.append('platform', JSON.stringify(this.selectedPlatforms));

      // Campaign payment model (flat-rate-with-cap)
      // Determine which payment fields to send based on `campaignType`:
      // Derive campaign type from selectedAccess radio value
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

      this.store.dispatch(
        CampaignActions.createCampaign({
          dto: formData,
          files: this.selectedImages().map((img) => img.file),
        }),
      );

      this.resetForm();
    } catch (error: any) {
      console.error(error);
      alert(`❌ Error: ${error.message || 'Failed to create campaign'}`);
    } finally {
      this.isSubmitting.set(false); // always unblocks the UI
    }
  }
}

