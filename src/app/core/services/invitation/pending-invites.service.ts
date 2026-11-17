import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { debounceTime, distinctUntilChanged, filter, forkJoin, from, map, of, catchError } from 'rxjs';
import { CampaignInfluencerService, InvitationsService } from '../../api';
import { extractApiList } from '../../utils/api-response';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { RealtimeEvent, SocketService } from '../../../socket.service';
import { PackageCampaignService } from '../package/package-campaign.service';

const status = (row: Record<string, any> | null | undefined) =>
  String(row?.['status'] ?? '').trim().toLowerCase();

/**
 * Requests still waiting on the signed-in creator, shown as the badge on My work:
 * package offers to accept or decline, plus older campaigns' pending invitations
 * and negotiable assignments in the "invited" state. Kept live via the realtime socket.
 */
@Injectable({ providedIn: 'root' })
export class PendingInvitesService {
  private store = inject(Store);
  private socket = inject(SocketService);
  private invitationApi = inject(InvitationsService);
  private assignmentApi = inject(CampaignInfluencerService);
  private destroyRef = inject(DestroyRef);

  private readonly _legacy = signal(0);
  private readonly _offers = signal(0);
  /** Older campaigns' invitations waiting for an answer. */
  readonly legacy = this._legacy.asReadonly();
  /** Package offers waiting for an answer. */
  readonly offers = this._offers.asReadonly();
  readonly count = computed(() => this._legacy() + this._offers());
  private packages = inject(PackageCampaignService);
  private userId: number | null = null;

  constructor() {
    this.store
      .select(selectCurrentUser)
      .pipe(
        map((user) => (typeof user?.id === 'number' ? user.id : null)),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        this.userId = id;
        if (id == null) { this._legacy.set(0); this._offers.set(0); }
        else this.refresh();
      });

    this.socket
      .changes(RealtimeEvent.AssignmentUpdated, RealtimeEvent.CampaignUpdated, RealtimeEvent.NegotiationUpdated)
      .pipe(
        filter(() => this.userId != null),
        debounceTime(300),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.refresh());
  }

  /** Re-query; call after responding to an invite so the badge updates at once. */
  refresh(): void {
    const userId = this.userId;
    if (userId == null) return;

    forkJoin({
      invitations: this.invitationApi
        .invitationControllerFindAllInvitations({ userId, limit: 50, page: 0, sort: 'DESC' })
        .pipe(catchError(() => of(null))),
      assignments: this.assignmentApi
        .campaignInfluencerControllerFindByUser(userId)
        .pipe(catchError(() => of(null))),
      collaborations: from(this.packages.mine()).pipe(catchError(() => of(null))),
    }).subscribe(({ invitations, assignments, collaborations }) => {
      const pendingInvitations = invitations ? extractApiList(invitations).filter((i) => status(i) === 'pending').length : 0;
      const invited = assignments ? extractApiList(assignments).filter((a) => status(a) === 'invited').length : 0;
      this._legacy.set(pendingInvitations + invited);
      this._offers.set((collaborations ?? []).filter((c) => c.state === 'invited' || c.state === 'selected').length);
    });
  }
}
