import { createAction, props } from "@ngrx/store";
import { LoginResponse, User } from "../../../core/models/users/user.model";

export const loginUser = createAction(
    '[Login Page] Login User',
    props<{credentials: {email: string; password: string}}>()
);

export const loginUserSuccess = createAction(
    '[Login API] Login User Success',
    props<{loginResponse: LoginResponse}>()
);

export const loginUserFailure = createAction(
    '[Login API] Login User Failure',
    props<{error: string}>()
);
