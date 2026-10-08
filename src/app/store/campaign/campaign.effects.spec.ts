import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { firstValueFrom, of, ReplaySubject } from 'rxjs';
import { CampaignEffects } from './campaign.effects';
import { CampaignActions } from './campaign.action';
import { CampaignService } from '../../core/services/campaign/campaign.service';

describe('CampaignEffects.createCampaign$', () => {
  function run(response: unknown) {
    const actions$ = new ReplaySubject<any>(1);
    TestBed.configureTestingModule({
      providers: [
        CampaignEffects,
        provideMockActions(() => actions$),
        { provide: CampaignService, useValue: { createCampaign: () => of(response) } },
      ],
    });
    actions$.next(CampaignActions.createCampaign({ dto: new FormData() }));
    return firstValueFrom(TestBed.inject(CampaignEffects).createCampaign$);
  }

  it('treats an error response as a failure, never as success', async () => {
    const result = await run({ error: true, message: 'Insufficient balance' });
    expect(result).toEqual(CampaignActions.createCampaignFailure({ error: 'Insufficient balance' }));
  });

  it('succeeds only with data and no error flag', async () => {
    const result = await run({ error: false, data: { id: 4 } });
    expect(result).toEqual(CampaignActions.createCampaignSuccess({ campaign: { id: 4 } as any }));
  });
});
