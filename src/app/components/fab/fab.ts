import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-fab',
  imports: [RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './fab.html',
  styleUrl: './fab.scss',
})
export class Fab {


}
