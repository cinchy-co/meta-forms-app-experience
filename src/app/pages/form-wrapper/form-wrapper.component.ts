import { takeUntil } from "rxjs/operators";

import {
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild
} from "@angular/core";
import { MediaMatcher } from "@angular/cdk/layout";
import { ActivatedRoute } from "@angular/router";

import { ToastrService } from "ngx-toastr";
import { NgxSpinnerService } from "ngx-spinner";

import { CinchyQueryService } from "../../services/cinchy-query.service";
import { AppStateService } from "../../services/app-state.service";

import { IFormMetadata } from "src/app/models/form-metadata-model";
import { IFormSectionMetadata } from "src/app/models/form-section-metadata.model";
import { ILookupRecord } from "src/app/models/lookup-record.model";


@Component({
  selector: "app-form-wrapper",
  templateUrl: "./form-wrapper.component.html",
  styleUrls: ["./form-wrapper.component.scss"]
})
export class FormWrapperComponent implements OnInit {
  @ViewChild("sidenav") sidenav;

  formMetadata: IFormMetadata;
  formSectionsMetadata: IFormSectionMetadata[];
  lookupRecords: ILookupRecord[];

  mobileQuery: MediaQueryList;

  rowId: number;
  formId: string;

  private mobileQueryListener: () => void;

  constructor(
      private cinchyQueryService: CinchyQueryService,
      private appStateService: AppStateService,
      private toastr: ToastrService,
      private spinner: NgxSpinnerService,
      changeDetectorRef: ChangeDetectorRef,
      media: MediaMatcher
  ) {
    // For Sidenav
    this.mobileQuery = media.matchMedia("(max-width: 600px)");
    this.mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this.mobileQueryListener);
  }


  async ngOnInit() {

    await this.loadFormMetadata();

    this.formId = this.appStateService.formId;
    this.rowId = this.appStateService.rowId;

    this.appStateService.setRecordSelected(this.rowId);
  }


  onSaved(): void {

    this.loadLookupRecords(this.formMetadata);
  }


  async loadFormMetadata() {
    try {
      this.spinner.show();
      const formMetadata = await this.cinchyQueryService.getFormMetadata().toPromise();
      this.formMetadata = this.appStateService.formMetadata = formMetadata;

      await this.loadLookupRecords(formMetadata);

      this.loadFormSections();
    } catch (e) {
      this.showError("Error getting form metadata", e);
    }
  }


  async loadFormSections() {
    try {
      const formSections = await this.cinchyQueryService.getFormSections().toPromise();
      this.formSectionsMetadata = formSections;
      this.appStateService.setLatestRenderedSections(formSections);
      if (this.formSectionsMetadata) {
        await this.spinner.hide();
      }
    } catch (e) {
      this.showError("Error getting section metadata", e);
    }
    await this.spinner.hide();
  }


  async loadLookupRecords(formMetadata: IFormMetadata): Promise<void> {

    if (formMetadata?.subTitleColumn == null) {
      return;
    }

    this.cinchyQueryService.resetLookupRecords.next();

    await this.cinchyQueryService.getLookupRecords(
      formMetadata.subTitleColumn,
      formMetadata.domainName,
      formMetadata.tableName
    ).subscribe(
      response => {

        this.lookupRecords = response;
      },
      e => {

        this.showError("Error getting lookup records", e);
      }
    );
  }


  private showError(message: string, error: any) {

    this.spinner.hide();

    console.error(message, error);

    this.toastr.error("Could not fetch the form's metadata. You may not have the necessary entitlements to view this form.", "Error");
  }
}
