import { RealtimeEvent, SocketService } from '../../../socket.service';
import { ApplicationsLists } from '../../../components/applications-lists/applications-lists';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs';
import {
  CampaignInfluencerService,
  InvitationsService,
  RespondToInvitationDto,
} from '../../../core/api';
import { InvitesLists } from '../../../components/invites-lists/invites-lists';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { ToastService } from '../../../components/toast/toast.service';
import { extractApiList } from '../../../core/utils/api-response';

@Component({
  selector: 'app-applications-invites',
  imports: [ApplicationsLists, InvitesLists],
  templateUrl: './applications-invites.html',
  styleUrl: './applications-invites.scss',
})
export class ApplicationsInvites implements OnInit {
  private readonly invitationService = inject(InvitationsService);
  private readonly campaignInfluencerService = inject(CampaignInfluencerService);
  private readonly store = inject(Store);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly socket = inject(SocketService);

  /** Creator-side applications from the campaign-influencer service. */
  applications: any[] = [];
  applicationsLoading = signal(false);
  applicationsError = signal<string | null>(null);

  selectedApplicationId = signal<string | null>(null);
  selectedInviteId = signal<string | null>(null);
  tab = signal<'applications' | 'invites'>('applications');

  invites: any[] = [];
  /** Invitation entities (accept/decline only) mapped to the card shape. */
  private invitationCards: any[] = [];
  /** Invited-type assignments (negotiable) mapped to the card shape. */
  private assignmentInvites: any[] = [];
  private loggedInUserId: number | null = null;

  ngOnInit(): void {
    // Auth slice: it is hydrated on refresh, unlike the user slice. Never
    // query without a user id, or the API returns everyone's records.
    this.store
      .select(selectCurrentUser)
      .pipe(
        map((user) => (typeof user?.id === 'number' ? user.id : null)),
        filter((id): id is number => id != null),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        this.loggedInUserId = id;
        this.fetchApplications();
        this.fetchInvitations();
      });

    // A brand invited, accepted, paused a campaign…: refresh the lists live.
    this.socket
      .changes(RealtimeEvent.AssignmentUpdated, RealtimeEvent.CampaignUpdated, RealtimeEvent.NegotiationUpdated)
      .pipe(
        filter(() => this.loggedInUserId != null),
        debounceTime(300),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.fetchApplications();
        this.fetchInvitations();
      });
  }

  fetchApplications(): void {
    const userId = this.loggedInUserId;
    if (userId == null) return;

    this.applicationsLoading.set(true);
    this.applicationsError.set(null);

    this.campaignInfluencerService
      .campaignInfluencerControllerFindByUser(userId, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const rows = extractApiList(response);
          // Invited-type rows belong on the Invitations tab, not Applications.
          this.assignmentInvites = rows
            .filter((a) => String(a?.['status'] ?? '').trim().toLowerCase() === 'invited')
            .map((a) => this.toInviteCard(a));
          this.applications = rows
            .filter((a) => String(a?.['status'] ?? '').trim().toLowerCase() !== 'invited')
            .map((a) => this.toApplicationCard(a));
          this.mergeInvites();
          this.applicationsLoading.set(false);
        },
        error: (error) => {
          console.error('Error fetching applications:', error);
          this.applications = [];
          this.assignmentInvites = [];
          this.mergeInvites();
          this.applicationsError.set(error?.error?.message || 'Could not load your applications.');
          this.applicationsLoading.set(false);
        },
      });
  }

  fetchInvitations(): void {
    const userId = this.loggedInUserId;
    if (userId == null) return;

    this.invitationService
      .invitationControllerFindAllInvitations({ userId, limit: 50, page: 0, sort: 'DESC' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.invitationCards = extractApiList(response).map((inv) => this.toInvitationCard(inv));
          this.mergeInvites();
        },
        error: (error) => {
          console.error('Error fetching invitations:', error);
          this.invitationCards = [];
          this.mergeInvites();
        },
      });
  }

  /** Accept or decline a (non-negotiable) invitation entity. */
  respondToInvitation(event: { id: number; accept: boolean }): void {
    const userId = this.loggedInUserId;
    if (userId == null) return;
    const status = event.accept
      ? RespondToInvitationDto.StatusEnum.Accepted
      : RespondToInvitationDto.StatusEnum.Declined;
    this.invitationService
      .invitationControllerRespond(event.id, userId, { status })
      .subscribe({
        next: () => {
          this.toast.show(event.accept ? 'Invitation accepted.' : 'Invitation declined.', 'success');
          // Only pending invitations are listed, so drop the answered one.
          this.invitationCards = this.invitationCards.filter((c) => c.invitationId !== event.id);
          this.mergeInvites();
        },
        error: (err) =>
          this.toast.show(err?.error?.message ?? 'Could not respond to the invitation.', 'error'),
      });
  }

  private mergeInvites(): void {
    this.invites = [...this.invitationCards, ...this.assignmentInvites];
  }

  /** Invitation entity → invites-list card. Its `user` is the invitee, so the brand comes from the campaign. */
  private toInvitationCard(inv: Record<string, any>): Record<string, any> {
    const campaign = (inv?.['campaign'] as Record<string, any>) ?? {};
    const label = String(campaign['name'] ?? 'Campaign invite');
    return {
      id: `inv-${inv?.['id']}`,
      kind: 'invitation',
      invitationId: inv?.['id'] ?? null,
      assignmentId: null,
      status: String(inv?.['status'] ?? '').toLowerCase() === 'pending' ? 'awaiting_response' : 'declined',
      user: { id: 0, name: label, user_name: label },
      campaign: {
        id: campaign['id'] ?? 0,
        name: String(campaign['name'] ?? 'Untitled campaign'),
        platforms: this.platformList(campaign['platforms']),
        end_date: campaign['end_date'] ?? '',
      },
    };
  }

  /**
   * Map an invited-type assignment to the invites-list shape
   * (invites-lists reads inv.user.user_name, inv.campaign, inv.status).
   */
  private toInviteCard(a: Record<string, any>): Record<string, any> {
    const campaign = (a?.['campaign'] as Record<string, any>) ?? {};
    const creator = (campaign['creator'] as Record<string, any>) ?? {};
    const brandProfile = (creator['brandProfile'] ?? creator['brand_profile'] ?? {}) as Record<string, any>;
    const brandName = String(
      brandProfile['brand_name'] ?? brandProfile['brandName'] ??
      creator['user_name'] ?? creator['userName'] ??
      campaign['name'] ?? 'Unknown brand'
    );
    return {
      id: a?.['id'] ?? null,
      kind: 'assignment',
      assignmentId: a?.['id'] ?? null,
      status: 'awaiting_response',
      createdAt: a?.['contract_signed_at'] ?? '',
      updatedAt: '',
      user: {
        id: creator['id'] ?? 0,
        name: brandName,
        user_name: brandName,
        status: 'Pending',
      },
      campaign: {
        id: campaign['id'] ?? 0,
        name: String(campaign['name'] ?? 'Untitled campaign'),
        platforms: this.platformList(campaign['platforms']),
        end_date: campaign['end_date'] ?? '',
      },
    };
  }

  /** Map a raw campaign-influencer assignment to the applications-list card shape. */
  private toApplicationCard(a: Record<string, any>): Record<string, any> {
    const campaign = (a?.['campaign'] as Record<string, any>) ?? {};
    const creator = (campaign['creator'] as Record<string, any>) ?? {};
    const brandProfile = (creator['brandProfile'] ?? creator['brand_profile'] ?? {}) as Record<string, any>;
    const posts = Array.isArray(a?.['influencerPosts']) ? a['influencerPosts'] : [];
    const firstPost = (posts[0] as Record<string, any>) ?? {};
    const status = String(a?.['status'] ?? 'applied').trim().toLowerCase();
    const paymentStatus = String(a?.['payment_status'] ?? a?.['paymentStatus'] ?? 'pending').trim().toLowerCase();
    return {
      id: String(a?.['id'] ?? ''),
      brand: String(
        brandProfile['brand_name'] ?? brandProfile['brandName'] ??
        creator['user_name'] ?? creator['userName'] ??
        campaign['name'] ?? 'Unknown brand'
      ),
      campaignTitle: String(campaign['name'] ?? 'Untitled campaign'),
      tier: String(
        (Array.isArray(campaign['campaignTier']) ? campaign['campaignTier'][0]?.['name'] : undefined) ??
        campaign['package'] ?? '—'
      ),
      platform: this.firstPlatform(campaign['platforms']),
      payout: Number(a?.['fee_agreed'] ?? 0) || 0,
      status: this.applicationStatus(status, paymentStatus),
      appliedAt: this.formatDate(a?.['contract_signed_at']),
      deadline: campaign['end_date'] ? `Deliver by ${this.formatDate(campaign['end_date'])}` : '',
      bio: typeof campaign['description'] === 'string' ? campaign['description'] : '',
      postLink: String(firstPost['post_url'] ?? firstPost['postUrl'] ?? ''),
      assignmentId: a?.['id'] ?? null,
    };
  }

  /** List status from assignment + payment status (list only knows these five). */
  private applicationStatus(status: string, paymentStatus: string): string {
    if (status === 'completed') return paymentStatus === 'paid' ? 'paid' : 'posted';
    if (status === 'contracted' || status === 'active') return 'accepted';
    if (status === 'cancelled' || status === 'rejected' || status === 'withdrawn') return 'declined';
    return 'pending';
  }

  /** First campaign platform, tolerating JSON-stringified entries. */
  private firstPlatform(raw: unknown): string {
    const list = Array.isArray(raw) ? raw : [];
    for (const value of list) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('[') || trimmed.startsWith('"')) {
        try {
          const parsed = JSON.parse(trimmed);
          const entries = Array.isArray(parsed) ? parsed : [parsed];
          for (const entry of entries) {
            if (typeof entry === 'string' && entry.trim()) {
              return entry.trim().charAt(0).toUpperCase() + entry.trim().slice(1);
            }
          }
          continue;
        } catch {
          // not JSON, fall through
        }
      }
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }
    return '—';
  }

  private formatDate(raw: unknown): string {
    if (typeof raw !== 'string' || !raw.trim()) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /** All campaign platforms as an array (invites-list joins them). */
  private platformList(raw: unknown): string[] {
    const out: string[] = [];
    const list = Array.isArray(raw) ? raw : [];
    for (const value of list) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('[') || trimmed.startsWith('"')) {
        try {
          const parsed = JSON.parse(trimmed);
          const entries = Array.isArray(parsed) ? parsed : [parsed];
          for (const entry of entries) {
            if (typeof entry === 'string' && entry.trim()) out.push(entry.trim());
          }
          continue;
        } catch {
          // not JSON, fall through
        }
      }
      out.push(trimmed);
    }
    return out;
  }

  setTab(tab: 'applications' | 'invites'): void {
    this.tab.set(tab);
    this.selectedApplicationId.set(null);
    this.selectedInviteId.set(null);
  }

  selectApplication(id: string): void {
    this.selectedApplicationId.set(id);
  }

  selectInvite(id: string): void {
    this.selectedInviteId.set(id);
  }
}
