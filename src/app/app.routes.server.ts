import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Only public pages render on the server. Everything behind login renders in
 * the browser: the server has no token, so SSR there would fetch protected
 * APIs anonymously and render empty or redirected pages.
 */
export const serverRoutes: ServerRoute[] = [
  // Shared post links: crawlers need the OG/Twitter tags in the HTML.
  { path: 'post/:id', renderMode: RenderMode.Server },
  { path: 'home/post/:id', renderMode: RenderMode.Server },

  // Static public pages.
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'register', renderMode: RenderMode.Prerender },
  { path: 'forgot-password', renderMode: RenderMode.Prerender },

  { path: '**', renderMode: RenderMode.Client },
];
