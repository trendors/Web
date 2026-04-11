import { UpperCasePipe, AsyncPipe, SlicePipe } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterModule, RouterOutlet } from '@angular/router';
import { TimeAgoPipe } from '../../../time-ago-pipe';
import { SideNavCard } from "../../../components/side-nav-card/side-nav-card";
import { ButtomNav } from "../../../components/buttom-nav/buttom-nav";
import { UserInfoCard } from "../../../components/user-info-card/user-info-card";
import { SocialVerify } from "../social-verify/social-verify";
import { filter } from 'rxjs';
import { Footer } from "../../../components/footer/footer";

@Component({
  selector: 'app-home',
imports: [
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TimeAgoPipe,
    RouterLink,
    UpperCasePipe,
    AsyncPipe,
    SlicePipe,
    RouterOutlet,
    RouterLink, RouterLinkActive,
    SideNavCard,
    ButtomNav,
    UserInfoCard,
    SocialVerify,
    Footer
],  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
     url = '';

  constructor(private router: Router) {



  this.router.events.pipe(
    filter(event => event instanceof NavigationEnd)
  ).subscribe((event: NavigationEnd) => {
    this.url = event.url;
    console.log('Current route:', event.url);
  });
}

}
