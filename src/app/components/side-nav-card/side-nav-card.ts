import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-side-nav-card',
  imports: [],
  templateUrl: './side-nav-card.html',
  styleUrl: './side-nav-card.scss',
})
export class SideNavCard {

constructor(private router: Router) {} // Inject it here

  routeTo(path: string) {
    // Implement your routing logic here, e.g. using Angular's Router
    this.router.navigate([path]);
    console.log(`Navigating to: ${path}`);
  }
}
