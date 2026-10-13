import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { debounceTime, distinctUntilChanged, filter, forkJoin, map, of, catchError } from 'rxjs';
import { CampaignInfluencerService, InvitationsService } from '../../api';
import { extractApiList } from '../../utils/api-response';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { RealtimeEvent, SocketService } from '../../../socket.service';

const status = (row: Record<string, any> | null | undefined) =>
  String(row?.['status'] ?? '').trim().toLowerCase();

/**
 * Number of invites still waiting on the signed-in user: pending invitations
 * plus negotiable assignments in the "invited" state (the two sources behind
 * the Invites tab). Kept live via the realtime socket.
 */
@Injectable({ providedIn: 'root' })
export class PendingInvitesService {
  private store = inject(Store);
  private socket = inject(SocketService);
  private invitationApi = inject(InvitationsService);
  private assignmentApi = inject(CampaignInfluencerService);
  private destroyRef = inject(DestroyRef);

  private readonly _count = signal(0);
  readonly count = this._count.asReadonly();
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
        if (id == null) this._count.set(0);
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
    }).subscribe(({ invitations, assignments }) => {
      const pendingInvitations = invitations ? extractApiList(invitations).filter((i) => status(i) === 'pending').length : 0;
      const invited = assignments ? extractApiList(assignments).filter((a) => status(a) === 'invited').length : 0;
      this._count.set(pendingInvitations + invited);
    });
  }
}
