import { createActionGroup, props, emptyProps } from '@ngrx/store';
import { UpdateUserDto, User } from '../../core/models/users/user.model';

export const UserAction = createActionGroup({
  source: 'User Flow',
  events: {
    // 🔹 Update user
    'Update User': props<{ userId: number; updateData: UpdateUserDto }>(),
    'Update User Success': props<{ user: User }>(),
    'Update User Failure': props<{ error: string }>(),

    // 🔹 Fetch current user (NEW)
    'Load Current User': props<{ userId: number }>(),
    'Load Current User Success': props<{ user: User }>(),
    'Load Current User Failure': props<{ error: string }>(),

    // 🔹 Delete user
    'Delete User': props<{ userId: number }>(),
    'Delete User Success': props<{ message: string }>(),
    'Delete User Failure': props<{ error: string }>(),
  },
});