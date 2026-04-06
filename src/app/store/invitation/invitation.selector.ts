import { createFeatureSelector, createSelector } from '@ngrx/store';
import { invitationFeatureKey, InvitationState } from './invitation.reducer';

const selectInvitationState = createFeatureSelector<InvitationState>(invitationFeatureKey);

export const selectAllInvites = createSelector(selectInvitationState, (state) => state.invites);
export const selectPendingApplicants = createSelector(selectAllInvites, (invites) =>
  invites.filter((i) => i.status === 'Pending'),
);
export const selectActiveMembers = createSelector(selectAllInvites, (invites) =>
  invites.filter((i) => i.status === 'Accepted'),
);
export const selectInvitationLoading = createSelector(
  selectInvitationState,
  (state) => state.loading,
);
export const selectInvitationError = createSelector(selectInvitationState, (state) => state.error);
