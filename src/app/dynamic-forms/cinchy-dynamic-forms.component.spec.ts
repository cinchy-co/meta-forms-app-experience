import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CinchyDynamicFormsComponent } from './cinchy-dynamic-forms.component';

describe('CinchyDynamicFormsComponent', () => {
  let component: CinchyDynamicFormsComponent;
  let fixture: ComponentFixture<CinchyDynamicFormsComponent>;

  beforeEach(async(() => {
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
