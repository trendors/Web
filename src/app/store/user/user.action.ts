import { createActionGroup, props } from '@ngrx/store';
import { UpdateUserDto, User } from '../../core/models/users/user.model';

export const UserAction = createActionGroup({
  source: 'User Flow',
  events: {
    'Update User': props<{ userId: number; updateData: UpdateUserDto }>(),
    'Update User Success': props<{ user: User }>(),
    'Update User Failure': props<{ error: string }>(),

    'Delete User': props<{ userId: number }>(),
    'Delete User Success': props<{ message: string }>(),
    'Delete User Failure': props<{ error: string }>(),
  },
});
