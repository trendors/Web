import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActiveProfileService } from '../../core/services/activeprofile.service';

/** Mobile shortcut to create a campaign; brands only. */
@Component({
  selector: 'app-fab',
  imports: [RouterLink],
  templateUrl: './fab.html',
  styleUrl: './fab.scss',
})
export class Fab {
  activeProfile = inject(ActiveProfileService).activeProfile;
}
