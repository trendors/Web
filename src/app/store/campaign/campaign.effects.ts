import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { CampaignService } from '../../core/services/campaign/campaign.service';
import { of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { CampaignActions } from './campaign.action';

@Injectable()
export class CampaignEffects {
  private actions$ = inject(Actions);
  private campaignService = inject(CampaignService);

  loadCampaigns$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CampaignActions.loadCampaigns),
      switchMap(({ userId }) =>
        this.campaignService.getCampaigns(userId).pipe(
          map((list) => CampaignActions.loadCampaignsSuccess({ list })),
          catchError((error: any) =>
            of(
              CampaignActions.loadCampaignsFailure({
                error: error?.message || 'Failed to load campaigns',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
