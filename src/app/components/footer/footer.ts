import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { AsyncPipe } from '@angular/common';
import { selectUnreadCount } from '../../store/notification/notification.selector';
import { PendingInvitesService } from '../../core/services/invitation/pending-invites.service';
import { ActiveProfileService } from '../../core/services/activeprofile.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  private store = inject(Store);

  unreadCount$ = this.store.select(selectUnreadCount);
  pendingInvites = inject(PendingInvitesService).count;
  activeProfile = inject(ActiveProfileService).activeProfile;
}
