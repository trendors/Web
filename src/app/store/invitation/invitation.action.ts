import { createActionGroup, props } from '@ngrx/store';
import { Invitation } from '../../core/models/invitation/invitation.model';

export const InvitationActions = createActionGroup({
  source: 'Invitation Action Flow',
  events: {
    'Load Campaign Invitations': props<{ campaignId: number }>(),
    'Load Campaign Invitations Success': props<{ invites: Invitation[] }>(),
    'Load Campaign Invitations Failure': props<{ error: string }>(),

    'Accept Invite': props<{ inviteId: number; userId: number }>(),
    'Accept Invite Success': props<{ invite: Invitation }>(),
    'Accept Invite Failure': props<{ error: string }>(),

    'Decline Invite': props<{ inviteId: number; userId: number }>(),
    'Decline Invite Success': props<{ inviteId: number }>(),
    'Decline Invite Failure': props<{ error: string }>(),

    'Remove Active Member': props<{ inviteId: number }>(),
    'Remove Active Member Success': props<{ inviteId: number }>(),
    'Remove Active Member Failure': props<{ error: string }>(),
  },
});
