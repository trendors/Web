import { createActionGroup, props } from '@ngrx/store';
import { Campaign } from '../../core/models/campaign/campaign.model';
import { CreateCampaign } from '../../pages/layout/create-campaign/create-campaign';

export const CampaignActions = createActionGroup({
  source: 'Campaign Action Flow',
  events: {
    'Load Campaigns': props<{ userId: number }>(),
    'Load Campaigns Success': props<{ list: Campaign[] }>(),
    'Load Campaigns Failure': props<{ error: string }>(),

    'Create Campaign': props<{ dto: FormData; files?: File[] }>(),
    'Create Campaign Success': props<{ campaign: Campaign }>(),
    'Create Campaign Failure': props<{ error: string }>(),
  },
});
