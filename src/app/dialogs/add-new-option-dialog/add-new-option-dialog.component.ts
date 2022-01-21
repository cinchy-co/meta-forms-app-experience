import {Component, Inject, OnInit} from '@angular/core';
import {CinchyQueryService} from "../../services/cinchy-query.service";
import {FormBuilder} from "@angular/forms";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {NgxSpinnerService} from "ngx-spinner";
import {ToastrService} from "ngx-toastr";

@Component({
  selector: 'app-add-new-option-dialog',
  templateUrl: './add-new-option-dialog.component.html',
  styleUrls: ['./add-new-option-dialog.component.scss']
})
export class AddNewOptionDialogComponent implements OnInit {
  formFieldMetadataResult;
  allRows;
  formSections;
  formId;

  constructor(private cinchyQueryService: CinchyQueryService, @Inject(MAT_DIALOG_DATA) public data: any,
              private spinner: NgxSpinnerService, private toastr: ToastrService,
              public dialogRef: MatDialogRef<AddNewOptionDialogComponent>) { }

  ngOnInit(): void {
    this.formId = this.data.createNewOptionFormId;
    if(this.data.createLinkOptionFormId){
      this.formId = this.data.createLinkOptionFormId;
    }
    this.setFormMetaData()
  }

  async setFormMetaData() {
    // Get form Meta data Only when Once.
    try {
      this.spinner.show();
      const metaDataResp = await this.cinchyQueryService.getFormMetaData(this.formId).toPromise();
      this.setSubtitle(metaDataResp.queryResult.toObjectArray());
      this.formFieldMetadataResult = metaDataResp.queryResult.toObjectArray();
      this.setFormSections();
      // this.spinner.hide();
    } catch (e) {
      this.spinner.hide();
      console.log('Get meta data Query failing,', e);
      this.toastr.error('Operation aborted ! Access denied or temporary issue in execution getting Meta data.', 'Error');
    }
  }

  async setSubtitle(formFieldMetadataResult) {
    if (formFieldMetadataResult && formFieldMetadataResult[0]) {
      const lookupLabelColumn = formFieldMetadataResult[0].subTitleColumn;
      const lookupFilter = formFieldMetadataResult[0].lookupFilter;
      if (lookupLabelColumn) {
        const allRowsRes: any = await this.cinchyQueryService.getAllRowsOfTable(lookupLabelColumn,
          formFieldMetadataResult[0].Domain, formFieldMetadataResult[0].Table, lookupFilter).toPromise();
        this.allRows = allRowsRes.queryResult.toObjectArray();
      }
    }
  }

  async setFormSections() {
    if(this.data.createLinkOptionFormId){
      sessionStorage.setItem('formId',this.formId);
    }
    const formSectionResp = await this.cinchyQueryService.getFormSections().toPromise();
    this.formSections = formSectionResp.queryResult.toObjectArray();
  }

  closeDialog(newOptionId){
    const newOption = {newOptionId, tableName: this.formFieldMetadataResult[0].Table};
    this.dialogRef.close(newOption);
  }
}
