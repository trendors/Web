import { Actions, createEffect, ofType } from "@ngrx/effects";
import { InvitationService } from "../../core/services/invitation/invitation.service";
import { InvitationActions } from "./invitation.action";
import { map, mergeMap } from "rxjs";

export class InvitationEffects {
    constructor(
        private actions$: Actions,
        private invitationService: InvitationService,
    ) {}

    loadCampaignInvitations$ = createEffect(() =>
        this.actions$.pipe(
            ofType(InvitationActions.loadCampaignInvitations),
            mergeMap(({ campaignId}) => 
            this.invitationService.getCampaignInvites(campaignId).pipe(
                map((invites) => InvitationActions.loadCampaignInvitationsSuccess({ invites })),
                
            ))
        ),
}