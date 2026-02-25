import { createActionGroup, props } from '@ngrx/store';
import { Campaign } from '../../core/models/campaign/campaign.model';

export const CampaignActions = createActionGroup({
  source: 'Campaign Action Flow',
  events: {
    'Load Campaigns': props<{ userId: number }>(),
    'Load Campaigns Success': props<{ list: Campaign[] }>(),
    'Load Campaigns Failure': props<{ error: string }>(),
  },
});
