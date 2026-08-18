import { Component, HostListener, inject, Input, Renderer2 } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Store } from '@ngrx/store';
import { firstValueFrom, Observable } from 'rxjs';
import { Share } from '../../core/models/shares/shares.model';
import { SharesActions } from '../../store/shares/shares.action';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { selectFilteredShares } from '../../store/shares/shares.selector';

@Component({
  selector: 'app-top-nav-filter',
  imports: [MatIconModule,
    MatCardModule,
    MatInputModule,],
  templateUrl: './top-nav-filter.html',
  styleUrl: './top-nav-filter.scss',
})
export class TopNavFilter {
 @Input() userInitials = 'JD';
  @Input() earned = '$4.20';
  /** Number badge shown on the menu button and next to "Invites and applications". 0 hides both. */
  @Input() pendingCount = 0;
 
  private renderer = inject(Renderer2);
 
  drawerOpen = false;
 
  toggleDrawer(): void {
    this.drawerOpen ? this.closeDrawer() : this.openDrawer();
  }
 
  openDrawer(): void {
    this.drawerOpen = true;
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
  }
 
  closeDrawer(): void {
    this.drawerOpen = false;
    this.renderer.removeStyle(document.body, 'overflow');
  }
 
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawerOpen) this.closeDrawer();
  }
}
