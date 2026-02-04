import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopNavFilter } from './top-nav-filter';

describe('TopNavFilter', () => {
  let component: TopNavFilter;
  let fixture: ComponentFixture<TopNavFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopNavFilter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopNavFilter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
