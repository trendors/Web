import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Router } from 'express';

@Component({
  selector: 'app-footer',
  imports: [ RouterLink, RouterLinkActive],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
   
}
