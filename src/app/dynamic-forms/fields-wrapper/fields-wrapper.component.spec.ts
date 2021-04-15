import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FieldsWrapperComponent } from './fields-wrapper.component';

describe('FieldsWrapperComponent', () => {
  let component: FieldsWrapperComponent;
  let fixture: ComponentFixture<FieldsWrapperComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FieldsWrapperComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FieldsWrapperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
