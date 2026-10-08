import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectAuthError, selectIsLoading } from '../../../store/auth/sharedState/auth.selector';
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

  isLoading$ = this.store.select(selectIsLoading);
  error$ = this.store.select(selectAuthError);
  hidePassword = true;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  onSubmit() {
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
