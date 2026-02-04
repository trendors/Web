import { UpperCasePipe, AsyncPipe, SlicePipe } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink, RouterLinkActive, RouterModule, RouterOutlet } from '@angular/router';
import { TimeAgoPipe } from '../../../time-ago-pipe';
import { SideNavCard } from "../../../components/side-nav-card/side-nav-card";
import { ButtomNav } from "../../../components/buttom-nav/buttom-nav";

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
    ButtomNav
],  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {

}
