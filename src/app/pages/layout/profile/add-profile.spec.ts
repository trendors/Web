import { TestBed } from '@angular/core/testing';
import { MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { provideAppMockStore } from '../../../core/testing/mock-store';
import { provideTestDefaults } from '../../../core/testing/test-providers';
import { UserService } from '../../../core/services/users/user.service';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { AddProfile } from './add-profile';

describe('AddProfile', () => {
  const setup = (user: any) => {
    TestBed.configureTestingModule({
      imports: [AddProfile],
      providers: [...provideTestDefaults(), provideAppMockStore({ selectors: [{ selector: selectCurrentUser, value: user }] })],
    });
    const f = TestBed.createComponent(AddProfile);
    f.detectChanges();
    return f;
  };

  it('offers a brand profile to a creator-only account', () => {
    const f = setup({ id: 1, influncerProfile: { id: 5, first_name: 'A' }, brandProfile: null });
    expect(f.nativeElement.textContent).toContain('Add brand profile');
  });

  it('offers nothing when the account has both', () => {
    const f = setup({ id: 1, influncerProfile: { id: 5, first_name: 'A' }, brandProfile: { id: 2, brand_name: 'B' } });
    expect(f.nativeElement.textContent.trim()).toBe('');
  });

  it('asks the server for the missing role', () => {
    const f = setup({ id: 1, influncerProfile: { id: 5, first_name: 'A' }, brandProfile: null });
    const spy = vi.spyOn(TestBed.inject(UserService), 'addProfile').mockReturnValue(of({ error: false, message: 'ok' }));
    f.componentInstance.brandName.set(' Acme ');
    f.componentInstance.add({ id: 1, influncerProfile: { id: 5, first_name: 'A' }, brandProfile: null });
    expect(spy).toHaveBeenCalledWith('brand', 'Acme');
  });

  it('merges the returned profile into the signed-in user', () => {
    const f = setup({ id: 1, influncerProfile: { id: 5, first_name: 'A' }, brandProfile: null });
    const store = TestBed.inject(MockStore);
    const dispatch = vi.spyOn(store, 'dispatch');
    vi.spyOn(TestBed.inject(UserService), 'addProfile').mockReturnValue(of({ error: false, message: 'ok', data: { brandProfile: { id: 9, brand_name: 'Acme' } } }));
    f.componentInstance.brandName.set('Acme');
    f.componentInstance.add({ id: 1, influncerProfile: { id: 5, first_name: 'A' }, brandProfile: null });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ user: { brandProfile: { id: 9, brand_name: 'Acme' } } }));
  });
});
