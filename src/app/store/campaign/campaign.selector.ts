import { createFeatureSelector, createSelector } from '@ngrx/store';
import { campaignFeatureKey, CampaignState } from './campaign.reducer';

export const selectCampaignState = createFeatureSelector<CampaignState>(campaignFeatureKey);
export const selectCampaignList = createSelector(selectCampaignState, (s) => s.list);
export const selectCampaignLoading = createSelector(selectCampaignState, (s) => s.isLoading);
export const selectCampaignError = createSelector(selectCampaignState, (s) => s.error);