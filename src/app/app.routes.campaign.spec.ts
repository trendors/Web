import { Route } from '@angular/router';
import { routes } from './app.routes';

const home = routes.find((r) => r.path === 'home') as Route;
const child = (path: string) => home.children?.find((r) => r.path === path);

describe('where a brand starts a campaign', () => {
  it('has one entry, "create-campaign", with a Package and a Share tab behind it', () => {
    const create = child('create-campaign')!;
    expect(create.children?.map((r) => r.path)).toEqual(['', 'package', 'share']);
    expect(create.children![0]).toMatchObject({ redirectTo: 'package', pathMatch: 'full' });
  });

  it('sends the old package address to the Package tab, with an absolute target so it resolves from any depth', () => {
    expect(child('plan/new')).toMatchObject({ redirectTo: '/home/create-campaign/package', pathMatch: 'full' });
  });

  it('still opens a package draft for editing without the tabs, and its management page', () => {
    expect(child('plan/:id/edit')?.loadComponent).toBeTypeOf('function');
    expect(child('plan/:id')?.loadComponent).toBeTypeOf('function');
  });

  it('keeps the redirect ahead of the package pages, so "new" is never read as an id', () => {
    const paths = home.children!.map((r) => r.path);
    expect(paths.indexOf('plan/new')).toBeLessThan(paths.indexOf('plan/:id'));
    expect(paths.indexOf('plan/new')).toBeLessThan(paths.indexOf('plan/:id/edit'));
  });
});

describe('the old Invites and Applications address', () => {
  it('lands on My work → Requests, keeping the tab in the address', async () => {
    const { Component } = await import('@angular/core');
    const { TestBed } = await import('@angular/core/testing');
    const { Router, provideRouter } = await import('@angular/router');
    @Component({ template: '' }) class Page {}
    const redirect = child('invites-and-applications')!;
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'home', children: [redirect, { path: 'opportunities', component: Page }] }])],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/home/invites-and-applications');
    expect(router.url).toBe('/home/opportunities?tab=requests');
  });
});
