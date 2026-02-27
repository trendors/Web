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

  createCampaign$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CampaignActions.createCampaign),
      switchMap(({ dto, files }) => {
        const formData = new FormData();
        if (files && files.length > 0) {
          files.forEach(file => {
            formData.append('files', file);
          });
        }
        return this.campaignService.createCampaign(dto).pipe(
          map((response) => {
            if (response.error !== true) {
              return CampaignActions.createCampaignFailure({
                error: response.message || 'Failed to create campaign',
              });
            }
            return CampaignActions.createCampaignSuccess({ message: response.message });
          }),
          catchError((error: any) =>
            of(
              CampaignActions.createCampaignFailure({
                error: error?.message || 'Failed to create campaign',
              }),
            ),
          ),
        );
      }),
    ),
  );
}
