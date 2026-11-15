import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { ToastService } from '../../../components/toast/toast.service';
import { UserService } from '../../../core/services/users/user.service';
import { hasBrandProfile, hasCreativeProfile } from '../../../core/utils/user-display';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { updateCurrentUser } from '../../../store/auth/login/login.actions';

/** One login, both roles: lets an account add the brand or creator profile it does not have yet. */
@Component({
  selector: 'app-add-profile',
  imports: [FormsModule],
  template: `
    @if (user(); as u) {
      @if (!hasBrand(u) || !hasCreator(u)) {
        <div class="ui-card">
          <span class="ui-label">{{ !hasBrand(u) ? 'Run campaigns as a brand too' : 'Earn as a creator too' }}</span>
          <p class="ui-hint">
            {{ !hasBrand(u)
              ? 'Add a brand profile to this account to create campaigns. You can switch between the two any time.'
              : 'Add a creator profile to this account to apply to campaigns and get paid. You can switch between the two any time.' }}
          </p>
          @if (!hasBrand(u)) {
            <input class="ui-input" name="brandName" placeholder="Brand name" [ngModel]="brandName()" (ngModelChange)="brandName.set($event)" />
          }
          <button class="ui-btn block" type="button" [disabled]="busy() || (!hasBrand(u) && !brandName().trim())" (click)="add(u)">
            {{ busy() ? 'Adding…' : !hasBrand(u) ? 'Add brand profile' : 'Add creator profile' }}
          </button>
        </div>
      }
    }
  `,
})
export class AddProfile {
  private store = inject(Store);
  private users = inject(UserService);
  private toast = inject(ToastService);

  user = this.store.selectSignal(selectCurrentUser);
  brandName = signal('');
  busy = signal(false);
  hasBrand = (u: unknown) => hasBrandProfile(u);
  hasCreator = (u: unknown) => hasCreativeProfile(u);

  add(u: any): void {
    if (this.busy()) return;
    const role = !hasBrandProfile(u) ? 'brand' : 'influencer';
    this.busy.set(true);
    this.users.addProfile(role, role === 'brand' ? this.brandName().trim() : undefined).pipe(take(1)).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.toast.show(r.message, 'success');
        // The new profile comes back from the server; merge it into the signed-in user so the page and the profile switch update at once.
        if (r.data) this.store.dispatch(updateCurrentUser({ user: r.data as any }));
      },
      error: (e: Error) => {
        this.busy.set(false);
        this.toast.show(e.message || 'Could not add the profile. Try again.', 'error', 6000);
      },
    });
  }
}
