import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddNewContactDialogComponent } from './add-new-contact-dialog.component';

describe('AddNewContactDialogComponent', () => {
  let component: AddNewContactDialogComponent;
  let fixture: ComponentFixture<AddNewContactDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddNewContactDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddNewContactDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
