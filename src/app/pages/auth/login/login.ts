import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectAuthError, selectAuthErrorCode, selectIsLoading } from '../../../store/auth/sharedState/auth.selector';
import { environment } from '../../../../environments/environment';
import { LoginActions } from '../../../store/auth/login/login.actions';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterModule, AsyncPipe],
  templateUrl: './login.html',
})
export class Login {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private http = inject(HttpClient);

  isLoading$ = this.store.select(selectIsLoading);
  error$ = this.store.select(selectAuthError);
  /** What kind of failure it was, so an unverified account can be offered a new link. */
  errorCode$ = this.store.select(selectAuthErrorCode);
  readonly resendState = signal<'idle' | 'sending' | 'sent' | 'error'>('idle');
  hidePassword = true;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  /** Send the activation link again. The server answers the same whether or not the account exists. */
  resend(): void {
    const email = (this.loginForm.value.email ?? '').trim();
    if (!email || this.resendState() === 'sending') return;
    this.resendState.set('sending');
    this.http.post(`${environment.apiUrl}/user/resend-verification`, { email }).subscribe({
      next: () => this.resendState.set('sent'),
      error: () => this.resendState.set('error'),
    });
  }

  onSubmit() {
    this.resendState.set('idle');
    if (this.loginForm.invalid) {
      // Reveal the inline errors instead of a silently disabled button.
      this.loginForm.markAllAsTouched();
      return;
    }
    const { email, password } = this.loginForm.value;
    this.store.dispatch(
      LoginActions.loginRequest({
        email: email!.trim(),
        password: password!,
      }),
    );
  }
}
