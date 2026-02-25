import { Routes } from '@angular/router';
import { authGuard } from './core/guard/auth-guard';
import path from 'path';

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
    children: [
      { path: '', redirectTo: 'posts', pathMatch: 'full' },
      { path: 'posts', loadComponent: () => import('./pages/layout/posts/posts').then((m) => m.Posts) },
      {
        path: 'post/:id',
        loadComponent: () => import('./pages/layout/single-post/single-post').then((m) => m.SinglePost)
      }, {
        path: 'shares',
        loadComponent: () => import('./pages/layout/shares/shares').then((m) => m.SharesDashboard)
      }, {
        path: 'create-campaign',
        loadComponent: () =>
          import('./pages/layout/create-campaign/create-campaign').then((m) => m.CreateCampaign),
      },{
         path: 'notifications',
        loadComponent: () =>
          import('./pages/layout/notification/notification').then((m) => m.NotificationsPage),    
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/layout/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'view-campaign',
        loadComponent: () =>
          import('./pages/layout/view-campaign/view-campaign').then((m) => m.ViewCampaign),
      }
    ],
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
    path: '**',
    redirectTo: 'login',
  },
];
