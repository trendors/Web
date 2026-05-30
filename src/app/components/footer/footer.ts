import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { Router } from 'express';
import { selectUnreadCount } from '../../store/notification/notification.selector';
import { AsyncPipe, CommonModule } from '@angular/common';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AsyncPipe, CommonModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer implements OnInit {


  private store = inject(Store);

  unreadCount$ = this.store.select(selectUnreadCount);
  currentUser$ = this.store.select(selectCurrentUser);

  ngOnInit() {

  }

}
