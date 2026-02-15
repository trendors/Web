import { inject, Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { switchMap, map, catchError, of } from "rxjs";
import { SharesActions } from "./shares.action";
import { ShareService } from "../../core/services/shares/share.service";

@Injectable()
export class SharesEffects {
    private actions$ = inject(Actions);
    private sharesService = inject(ShareService);
    
  loadShares$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SharesActions.loadShares),
      switchMap(({ userId }) =>
        this.sharesService.getHistory(userId).pipe(
          map((list) => SharesActions.loadSharesSuccess({ list })),
          catchError((error) => of(SharesActions.loadSharesFailure({ error: error.message || 'Failed to load shares' })))
        )
      )
    )
  );
}
