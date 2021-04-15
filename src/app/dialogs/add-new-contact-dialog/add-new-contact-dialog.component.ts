import {Component, Inject, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {CinchyQueryService} from '../../services/cinchy-query.service';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {CinchyUpdateInsertService} from "../../services/cinchy-update-insert.service";

@Component({
  selector: 'app-add-new-contact-dialog',
  templateUrl: './add-new-contact-dialog.component.html',
  styleUrls: ['./add-new-contact-dialog.component.scss']
})
export class AddNewContactDialogComponent implements OnInit {
  contactsForm: FormGroup;
  isContactAdded: boolean;
  newContact;
  allCompanies;

  constructor(private cinchyQueryService: CinchyQueryService, private fb: FormBuilder,
              @Inject(MAT_DIALOG_DATA) public data: any, private cinchyUpdateInsertService : CinchyUpdateInsertService,
              public dialogRef: MatDialogRef<AddNewContactDialogComponent>) {
  }

  ngOnInit(): void {
    this.allCompanies = this.data.allCompanies;
    this.createForm();
  }

  createForm() {
    this.contactsForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      company: [],
      email: [],
      title: [],
    });
  }

  async addContact() {
    const newContact = await this.cinchyUpdateInsertService.addContactInPerson(this.contactsForm.value).toPromise();
    this.newContact = newContact.queryResult.toObjectArray()[0];
    this.isContactAdded = true;
  }

  closeDialog() {
    this.dialogRef.close(this.newContact);
  }

}
