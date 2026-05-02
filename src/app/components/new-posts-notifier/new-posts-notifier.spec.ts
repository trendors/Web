import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewPostsNotifier } from './new-posts-notifier';

describe('NewPostsNotifier', () => {
  let component: NewPostsNotifier;
  let fixture: ComponentFixture<NewPostsNotifier>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewPostsNotifier]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewPostsNotifier);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
