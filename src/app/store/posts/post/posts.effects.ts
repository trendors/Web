import { inject, Injectable } from "@angular/core";
import { Actions } from "@ngrx/effects";

@Injectable()
export class PostsEffects {
    private actions$ = inject(Actions);
    private route$ = inject (Routes)
}