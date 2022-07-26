import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AddNewOptionDialogComponent } from './add-new-option-dialog.component';

describe('AddNewOptionDialogComponent', () => {
  let component: AddNewOptionDialogComponent;
  let fixture: ComponentFixture<AddNewOptionDialogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AddNewOptionDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddNewOptionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
