import { createFeatureSelector, createSelector } from '@ngrx/store';
import { campaignFeatureKey, CampaignState } from './campaign.reducer';
import { Campaign, CampaignStats } from '../../core/models/campaign/campaign.model';

export const selectCampaignState = createFeatureSelector<CampaignState>(campaignFeatureKey);
export const selectCampaignList = createSelector(selectCampaignState, (s) => s.list);
export const selectCampaignLoading = createSelector(selectCampaignState, (s) => s.isLoading);
export const selectCampaignError = createSelector(selectCampaignState, (s) => s.error);

export const selectCampaignStats = createSelector(selectCampaignList, (list): CampaignStats => {
  const totalReach = list.reduce((sum, campaign) => sum + Number(campaign.total_reach ?? 0), 0);
  const totalEngagement = list.reduce((sum, campaign) => sum + Number(campaign.avg_engagement ?? 0), 0);

  return {
    totalCampaigns: list.length,
    activeNow: list.filter((campaign) => campaign.access === 'invite_only').length,
    endedCampaigns: list.filter((campaign) => campaign.access === 'application').length,
    totalReach,
    avgEngagement: list.length ? Number((totalEngagement / list.length).toFixed(1)) : 0,
  };
});