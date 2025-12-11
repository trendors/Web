import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'register',
    loadComponent: () => import('./pages/auth/register/register').then((m) => m.Register),
  },
];
