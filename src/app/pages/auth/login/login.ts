import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { selectAuthError, selectIsLoading } from '../../../store/auth/sharedState/auth.selector';
import { LoginActions } from '../../../store/auth/login/login.actions';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatIconModule,
    AsyncPipe,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private store = inject(Store);

  isLoading$ = this.store.select(selectIsLoading);
  error$ = this.store.select(selectAuthError);
  hidePassword = true;

  loginForm = this.fb.group({
    email: ['', Validators.required],
    password: ['', Validators.required],
  });

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.store.dispatch(
        LoginActions.loginRequest({
          email: email!,
          password: password!,
        }),
      );
    }
  }
}
