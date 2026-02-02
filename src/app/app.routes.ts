import { Routes } from '@angular/router';
import { authGuard } from './core/guard/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'home',
    // canActivate: [authGuard],
    loadComponent: () => import('./pages/layout/home/home').then((m) => m.Home),
  },

  {
    path: 'post/:id',
    loadComponent: () => import('./pages/layout/single-post/single-post').then((m) => m.SinglePost)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/auth/forget-password/forget-password').then((m) => m.ForgetPassword),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/auth/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'change-password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/auth/change-password/change-password').then((m) => m.ChangePassword),
  },
  {
    path: 'dashboard',
    // canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/layout/dashboard/dashboard-layout/dashboard-layout').then(
        (m) => m.DashboardLayout,
      ),
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/layout/dashboard/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'change-password',
        loadComponent: () =>
          import('./pages/auth/change-password/change-password').then((m) => m.ChangePassword),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
