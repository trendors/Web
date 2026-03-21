import { createReducer, on } from '@ngrx/store';
import { Invitation } from '../../core/models/invitation/invitation.model';
import { InvitationActions } from './invitation.action';

export interface InvitationState {
  invites: Invitation[];
  loading: boolean;
  error: string | null;
}

export const invitationFeatureKey = 'invitation';

export const initialState: InvitationState = {
  invites: [],
  loading: false,
  error: null,
};

export const invitationReducer = createReducer(
  initialState,

  on(InvitationActions.loadCampaignInvitations, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(InvitationActions.loadCampaignInvitationsSuccess, (state, { invites }) => ({
    ...state,
    loading: false,
    invites,
  })),
  on(InvitationActions.loadCampaignInvitationsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(InvitationActions.acceptInviteSuccess, (state, { invite }) => ({
    ...state,
    invites: state.invites.map((i) => (i.id === invite.id ? invite : i)),
  })),
  on(InvitationActions.declineInviteSuccess, (state, { inviteId }) => ({
    ...state,
    invites: state.invites.filter((i) => i.id !== inviteId),
  })),
  on(InvitationActions.removeActiveMemberSuccess, (state, { inviteId }) => ({
    ...state,
    invites: state.invites.filter((i) => i.id !== inviteId),
  })),
);
