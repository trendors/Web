import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationsLists } from './applications-lists';

describe('ApplicationsLists', () => {
  let component: ApplicationsLists;
  let fixture: ComponentFixture<ApplicationsLists>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationsLists]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplicationsLists);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
