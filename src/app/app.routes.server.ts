import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'home/view-campaign/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'home/post/:id',
    renderMode: RenderMode.Server, // This forces SSR instead of Prerendering
  },
  {
    path: 'post/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
