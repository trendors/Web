import { createActionGroup, props } from "@ngrx/store";
import { ChangePasswordResponse } from "../../../core/models/users/user.model";

export const PasswordChangeActions = createActionGroup({
    source: 'Auth Change Password',
    events: {
        'Change Password Request': props<{ userId: number, oldPassword: string, newPassword: string }>(),
        'Change Password Success': props<{ response: ChangePasswordResponse }>(),
        'Change Password Failure': props<{ error: string }>(),
    }
});