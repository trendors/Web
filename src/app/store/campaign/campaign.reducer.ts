import { createReducer, on } from '@ngrx/store';
import { Campaign } from '../../core/models/campaign/campaign.model';
import { CampaignActions } from './campaign.action';

export const campaignFeatureKey = 'campaign';

export interface CampaignState {
  list: Campaign[];
  isLoading: boolean;
  error: string | null;
}

export const initialState: CampaignState = {
  list: [],
  isLoading: false,
  error: null,
};

export const campaignReducer = createReducer(
  initialState,
  on(CampaignActions.loadCampaigns, (state) => ({ ...state, isLoading: true, error: null })),
  on(CampaignActions.loadCampaignsSuccess, (state, { list }) => ({
    ...state,
    isLoading: false,
    list,
  })),
  on(CampaignActions.loadCampaignsFailure, (state, { error }) => ({ ...state, error })),

  on(CampaignActions.createCampaign, (state) => ({ ...state, isLoading: true, error: null })),
  on(CampaignActions.createCampaignSuccess, (state, { campaign }) => ({
    ...state,
    isLoading: false,
    campaign,
  })),
  on(CampaignActions.createCampaignFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),
);
