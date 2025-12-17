import { createActionGroup, props } from "@ngrx/store";
import { ForgetPasswordResponse, PasswordResetResponse } from "../../../core/models/users/user.model";

export const PasswordRecoveryActions = createActionGroup({
    source: 'Auth Password Recovery',
    events: {
        'Forget Password Request': props<{email: string}>(),
        'Forget Password Success': props<{response: ForgetPasswordResponse}>(),
        'Forget Password Failure': props<{error: string}>(),

        'Reset Password Request': props<{token: string, newPassword: string}>(),
        'Reset Password Success': props<{response: PasswordResetResponse}>(),
        'Reset Password Failure': props<{error: string}>(),
    }
})