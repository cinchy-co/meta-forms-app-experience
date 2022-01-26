import { Component, Inject, OnInit } from '@angular/core';
import { CinchyQueryService } from "../../services/cinchy-query.service";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { NgxSpinnerService } from "ngx-spinner";
import { ToastrService } from "ngx-toastr";
import { IFormMetadata } from 'src/app/models/form-metadata-model';
import { ILookupRecord } from 'src/app/models/lookup-record.model';
import { IFormSectionMetadata } from 'src/app/models/form-section-metadata.model';

@Component({
  selector: 'app-add-new-option-dialog',
  templateUrl: './add-new-option-dialog.component.html',
  styleUrls: ['./add-new-option-dialog.component.scss']
})
export class AddNewOptionDialogComponent implements OnInit {
  formMetadata: IFormMetadata;
  formSectionsMetadata: IFormSectionMetadata[];
  lookupRecords: ILookupRecord[];
  formId: string | number;

  constructor(
    private cinchyQueryService: CinchyQueryService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
    public dialogRef: MatDialogRef<AddNewOptionDialogComponent>
  ) { }

  ngOnInit(): void {
    this.formId = this.data.createNewOptionFormId;
    if (this.data.createLinkOptionFormId) {
      this.formId = this.data.createLinkOptionFormId;
    }
    this.loadFormMetadata()
  }

  async loadFormMetadata() {
    try {
      this.spinner.show();
      const formMetadata = await this.cinchyQueryService.getFormMetadata(this.formId).toPromise();
      this.loadLookupRecords(formMetadata);
      this.formMetadata = formMetadata;
      this.loadFormSections();
    } catch (e) {
      this.spinner.hide();
      console.log('Get meta data Query failing,', e);
      this.toastr.error('Operation aborted ! Access denied or temporary issue in execution getting Meta data.', 'Error');
    }
  }

  async loadLookupRecords(formMetadata: IFormMetadata) {
    if (!formMetadata)
      return;

    if (formMetadata.subTitleColumn) {
      this.lookupRecords = await this.cinchyQueryService.getLookupRecords(formMetadata.subTitleColumn, formMetadata.domainName, formMetadata.tableName, formMetadata.lookupFilter).toPromise();
    }
  }

  async loadFormSections() {
    if (this.data.createLinkOptionFormId) {
      sessionStorage.setItem('formId', this.formId as string);
    }
    this.formSectionsMetadata = await this.cinchyQueryService.getFormSections().toPromise();
  }

  closeDialog(newOptionId) {
    const newOption = { newOptionId, tableName: this.formMetadata.tableName };
    this.dialogRef.close(newOption);
  }
}
