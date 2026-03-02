import { AsyncPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { User, UpdateUserDto } from '../../../core/models/users/user.model';
import { UserService } from '../../../core/services/users/user.service';
import { selectCurrentUser, selectIsLoading } from '../../../store/auth/sharedState/auth.selector';
import { UserAction } from '../../../store/user/user.action';
import { selectUserError } from '../../../store/user/user.selector';

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    AsyncPipe,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private userService = inject(UserService);

  currentUser: User | null = null;
  user$ = this.store.select(selectCurrentUser);
  isLoading$ = this.store.select(selectIsLoading);
  userError$ = this.store.select(selectUserError);

  profileForm = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: [{ value: '', disabled: true }],
    phone_number: [''],
    twitter_handle: [''],
    instagram_handle: [''],
    facebook_username: [''],
  });

  ççç() {
    this.user$.pipe(take(1)).subscribe((user) => {
      this.currentUser = user;
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
    if (this.profileForm.valid && this.currentUser) {
      const updateData: UpdateUserDto = {
        first_name: this.profileForm.value.first_name ?? undefined,
        last_name: this.profileForm.value.last_name ?? undefined,
        phone_number: this.profileForm.value.phone_number ?? undefined,
        twitter_handle: this.profileForm.value.twitter_handle ?? undefined,
        instagram_handle: this.profileForm.value.instagram_handle ?? undefined,
        facebook_username: this.profileForm.value.facebook_username ?? undefined,
      };

      this.store.dispatch(UserAction.updateUser({ userId: this.currentUser.id, updateData }));
    }
  }

  onDelete() {
    if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      this.store.dispatch(UserAction.deleteUser({ userId: this.currentUser!.id }));
    }
  }
}
