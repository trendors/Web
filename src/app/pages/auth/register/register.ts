import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectAuthError, selectIsLoading } from '../../../store/auth/sharedState/auth.selector';
import { RegisterActions } from '../../../store/auth/register/register.action';
import { RegisterDto } from '../../../core/models/users/user.model';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterModule, AsyncPipe],
  templateUrl: './register.html',
})
export class Register {
  private fb = inject(FormBuilder);
  private store = inject(Store);

  isLoading$ = this.store.select(selectIsLoading);
  error$ = this.store.select(selectAuthError);
  hidePassword = true;

  registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    phone_number: [''],
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
  });

  showError(control: string, error: string): boolean {
    const c = this.registerForm.get(control);
    return !!c && c.touched && c.hasError(error);
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    const v = this.registerForm.value;
    const userData = {
      ...v,
      email: v.email!.trim(),
      first_name: v.first_name!.trim(),
      last_name: v.last_name!.trim(),
    } as RegisterDto;
    this.store.dispatch(RegisterActions.registerRequest({ userData }));
  }
}
