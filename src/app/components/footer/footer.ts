import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { AsyncPipe } from '@angular/common';
import { selectUnreadCount } from '../../store/notification/notification.selector';
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
  activeProfile = inject(ActiveProfileService).activeProfile;
}
