import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-buttom-nav',
  imports: [ MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,],
  templateUrl: './buttom-nav.html',
  styleUrl: './buttom-nav.scss',
})
export class ButtomNav {

}
