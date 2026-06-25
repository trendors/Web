import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YourEarnings } from './your-earnings';

describe('YourEarnings', () => {
  let component: YourEarnings;
  let fixture: ComponentFixture<YourEarnings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YourEarnings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(YourEarnings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
