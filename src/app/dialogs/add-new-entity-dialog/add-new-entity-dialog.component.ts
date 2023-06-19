import { Component, Inject, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";

import { CinchyQueryService } from "../../services/cinchy-query.service";

import { IFormMetadata } from "../../models/form-metadata-model";
import { IFormSectionMetadata } from "../../models/form-section-metadata.model";
import { ILookupRecord } from "../../models/lookup-record.model";

import { INewEntityDialogResponse } from "../../dynamic-forms/interface/new-entity-dialog-response";

import { NgxSpinnerService } from "ngx-spinner";
import { ToastrService } from "ngx-toastr";


@Component({
  selector: "app-add-new-entity-dialog",
  templateUrl: "./add-new-entity-dialog.component.html",
  styleUrls: ["./add-new-entity-dialog.component.scss"]
})
export class AddNewEntityDialogComponent implements OnInit {

  formMetadata: IFormMetadata;
  formSectionsMetadata: IFormSectionMetadata[];
  lookupRecords: ILookupRecord[];

  constructor(
    private cinchyQueryService: CinchyQueryService,
    @Inject(MAT_DIALOG_DATA) public data: {
      formId: string,
      title: string
    },
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
    public dialogRef: MatDialogRef<AddNewEntityDialogComponent, INewEntityDialogResponse>
  ) {}


  ngOnInit(): void {

    this.loadFormMetadata()
  }


  async loadFormMetadata() {

    try {
      this.spinner.show();

      const formMetadata = await this.cinchyQueryService.getFormMetadata(this.data.formId).toPromise();

      this.loadLookupRecords(formMetadata);

      this.formMetadata = formMetadata;
      this.loadFormSections();
    } catch (e) {
      this.spinner.hide();

      this.toastr.error("Operation aborted! Access denied or temporary issue in execution getting Meta data.", "Error");
    }
  }

  async loadLookupRecords(formMetadata: IFormMetadata): Promise<void> {

    this.lookupRecords = await this.cinchyQueryService.getLookupRecords(
      formMetadata.subTitleColumn,
      formMetadata.domainName,
      formMetadata.tableName,
      formMetadata.lookupFilter
    ).toPromise();
  }


  async loadFormSections() {

    this.formSectionsMetadata = await this.cinchyQueryService.getFormSectionsMetadata(this.data.formId).toPromise();
  }


  closeDialog(newRowId: number): void {

    this.dialogRef.close({
      newRowId: newRowId,
      tableName: this.formMetadata.tableName
    });
  }
}
