import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'post/:id',
    renderMode: RenderMode.Server, // This forces SSR instead of Prerendering
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
