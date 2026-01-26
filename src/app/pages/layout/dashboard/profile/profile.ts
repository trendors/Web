import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import {
  selectCurrentUser,
  selectIsLoading,
} from '../../../../store/auth/shared state/auth.selector';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    AsyncPipe
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private fb = inject(FormBuilder);
  private store = inject(Store);

  user$ = this.store.select(selectCurrentUser);
  isLoading$ = this.store.select(selectIsLoading);

  profileForm = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: [{ value: '', disabled: true }],
    phone_number: [''],
    twitter_handle: [''],
    instagram_handle: [''],
    facebook_username: [''],
  });

  ngOnInit() {
    this.user$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.profileForm.patchValue({
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone_number: user.phone_number,
          twitter_handle: user.twitter_handle,
          instagram_handle: user.instagram_handle,
          facebook_username: user.facebook_username,
        });
      }
    });
  }

  onSave() {
    if (this.profileForm.valid) {
      // TODO: Dispatch Update User Action here
      console.log('Saving profile...', this.profileForm.getRawValue());
    }
  }
}
