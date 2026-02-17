import { createActionGroup, props } from "@ngrx/store";
import { Share } from "../../core/models/shares/shares.model";

export const SharesActions = createActionGroup({
  source: 'Shares Action Flow',
  events: {
    'Load Shares': props<{ userId: number }>(),
    'Load Shares Success': props<{ list: Share[] }>(),
    'Load Shares Failure': props<{ error: string }>(),
    'Set Filter': props<{ filter: 'all' | 'paid' | 'free' | 'pending' | 'claimed' }>(),

    'create Shares' : props<{dto: Share}>(),
    'create Shares Success' : props<{error: boolean}> (),
    'create Shares Failure' : props<{error: boolean, message: string}> ()

  },
});
