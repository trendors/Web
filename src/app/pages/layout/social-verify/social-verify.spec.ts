import { provideTestDefaults } from '../../../core/testing/test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { of } from 'rxjs';
import { UserService } from '../../../core/services/users/user.service';
import { SocialVerify } from './social-verify';

describe('SocialVerify', () => {
  let component: SocialVerify;
  let fixture: ComponentFixture<SocialVerify>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SocialVerify],
      providers: [
        ...provideTestDefaults(),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SocialVerify);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not call the API when the user declines the confirmation', () => {
    const svc = TestBed.inject(UserService);
    const spy = vi.spyOn(svc, 'disconnectTwitter');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.disconnectTwitter(10);
    expect(spy).not.toHaveBeenCalled();
  });

  it('disconnects after confirmation and reloads the user', () => {
    const svc = TestBed.inject(UserService);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const spy = vi.spyOn(svc, 'disconnectTwitter').mockReturnValue(of({ error: false, message: 'ok' }));
    component.disconnectTwitter(10);
    expect(spy).toHaveBeenCalled();
    expect(component.disconnecting()).toBe(false);
  });
});
