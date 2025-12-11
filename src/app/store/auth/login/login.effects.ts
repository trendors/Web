import { inject } from "@angular/core";
import { AuthService } from "../../../core/services/users/auth.service";

@injectable()
export class LoginEffects {
  private actions$ = inject(Actions)
    private authService = inject(AuthService);

    loginRequest$ = createEffect(() =>
}