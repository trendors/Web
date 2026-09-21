import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { TopNavFilter } from './top-nav-filter';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';

describe('TopNavFilter', () => {
  let component: TopNavFilter;
  let fixture: ComponentFixture<TopNavFilter>;
  let store: MockStore;

  const brandUser = { id: 1, brandProfile: { brand_name: 'GlowSkin Inc' } };
  const creativeUser = { id: 10, influncerProfile: { id: 7, first_name: 'Zainab' } };

  async function setup(user: unknown): Promise<(string | null)[]> {
    await TestBed.configureTestingModule({
      imports: [TopNavFilter],
      providers: [provideRouter([]), provideMockStore()],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(selectCurrentUser, user as any);

    fixture = TestBed.createComponent(TopNavFilter);
    component = fixture.componentInstance;
    component.drawerOpen = true;
    fixture.detectChanges();
    await fixture.whenStable();

    return Array.from(fixture.nativeElement.querySelectorAll('a.drawer__item')).map((a) =>
      (a as HTMLAnchorElement).getAttribute('href'),
    );
  }

  it('should create', async () => {
    await setup(brandUser);
    expect(component).toBeTruthy();
  });

  it('should derive avatar initials from the real user', async () => {
    await setup(creativeUser);
    expect(component.userInitials).toBe('Z');
  });

  it('should show brand destinations for brand profiles', async () => {
    const hrefs = await setup(brandUser);
    expect(hrefs).toContain('/home');
    expect(hrefs).toContain('/home/create-campaign');
    expect(hrefs).toContain('/home/view-campaign');
    expect(hrefs).toContain('/home/notifications');
    expect(hrefs).toContain('/home/profile');
    expect(hrefs).not.toContain('/home/shares');
    expect(hrefs).not.toContain('/home/invites-and-applications');
  });

  it('should show creative destinations for influencer profiles', async () => {
    const hrefs = await setup(creativeUser);
    expect(hrefs).toContain('/home');
    expect(hrefs).toContain('/home/shares');
    expect(hrefs).toContain('/home/transactions');
    expect(hrefs).toContain('/home/invites-and-applications');
    expect(hrefs).not.toContain('/home/create-campaign');
    expect(hrefs).not.toContain('/home/view-campaign');
  });

  it('should not link to dead routes', async () => {
    const hrefs = await setup(brandUser);
    for (const href of hrefs) {
      expect(['/campaigns', '/shares', '/transactions', '/invites', '/settings', '/logout']).not.toContain(href);
    }
    expect(fixture.nativeElement.querySelector('button.drawer__logout')).toBeTruthy();
  });

  it('should toggle the drawer', async () => {
    await setup(brandUser);
    expect(component.drawerOpen).toBe(true);
    component.toggleDrawer();
    expect(component.drawerOpen).toBe(false);
    component.toggleDrawer();
    expect(component.drawerOpen).toBe(true);
  });
});
