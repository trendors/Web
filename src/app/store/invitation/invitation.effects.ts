import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { InvitationService } from '../../core/services/invitation/invitation.service';
import { InvitationActions } from './invitation.action';
import { catchError, map, mergeMap, of } from 'rxjs';

@Injectable()
export class InvitationEffects {
  private actions$ = inject(Actions);
  private invitationService = inject(InvitationService);

  loadCampaignInvitations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvitationActions.loadCampaignInvitations),
      mergeMap(({ campaignId }) =>
        this.invitationService.getCampaignInvites(campaignId).pipe(
          map((invites) => InvitationActions.loadCampaignInvitationsSuccess({ invites })),
          catchError((error) =>
            of(
              InvitationActions.loadCampaignInvitationsFailure({
                error: error.message || 'Failed to load campaign invitations',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  acceptInvite$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvitationActions.acceptInvite),
      mergeMap(({ inviteId, userId }) =>
        this.invitationService.respondInvitation(inviteId, userId, 'Accepted').pipe(
          map((resp) => InvitationActions.acceptInviteSuccess({ invite: resp.data })),
          catchError((error) =>
            of(InvitationActions.acceptInviteFailure({ error: error?.message || 'Accept failed' })),
          ),
        ),
      ),
    ),
  );

  declineInvite$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvitationActions.declineInvite),
      mergeMap(({ inviteId, userId }) =>
        this.invitationService.respondInvitation(inviteId, userId, 'Declined').pipe(
          map(() => InvitationActions.declineInviteSuccess({ inviteId })),
          catchError((error) =>
            of(
              InvitationActions.declineInviteFailure({ error: error?.message || 'Decline failed' }),
            ),
          ),
        ),
      ),
    ),
  );

  removeActiveMember$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvitationActions.removeActiveMember),
      mergeMap(({ inviteId }) =>
        this.invitationService.revokeInvitation(inviteId).pipe(
          map(() => InvitationActions.removeActiveMemberSuccess({ inviteId })),
          catchError((error) =>
            of(
              InvitationActions.removeActiveMemberFailure({
                error: error?.message || 'Remove failed',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
