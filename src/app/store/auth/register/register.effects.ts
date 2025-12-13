import { inject, Injectable } from '@angular/core';
import * as RegisterActions from '../register/register.action';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AuthService } from '../../../core/services/users/auth.service';
import { Router } from '@angular/router';
import { mergeMap } from 'rxjs';

@Injectable()
export class RegisterEffects {
    private action$ = inject(Actions);
    private authService = inject(AuthService);
    private router = inject(Router);

    registerRequest$ = createEffect(() =>
    this.action$.pipe(
        ofType(RegisterActions.registerUser),
        mergeMap(({ userData }) => 
            this.authService.register(userData).pipe)
    ))
}