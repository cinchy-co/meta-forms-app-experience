import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CinchyDynamicFormsComponent } from './cinchy-dynamic-forms.component';

describe('CinchyDynamicFormsComponent', () => {
  let component: CinchyDynamicFormsComponent;
  let fixture: ComponentFixture<CinchyDynamicFormsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CinchyDynamicFormsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CinchyDynamicFormsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
