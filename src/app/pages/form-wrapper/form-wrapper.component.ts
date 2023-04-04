import {
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild
} from "@angular/core";
import { MediaMatcher } from "@angular/cdk/layout";

import { ToastrService } from "ngx-toastr";
import { NgxSpinnerService } from "ngx-spinner";

import { CinchyQueryService } from "../../services/cinchy-query.service";
import { AppStateService } from "../../services/app-state.service";

import { IFormMetadata } from "../../models/form-metadata-model";
import { IFormSectionMetadata } from "../../models/form-section-metadata.model";
import { ILookupRecord } from "../../models/lookup-record.model";


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

  formId: string;

  private mobileQueryListener: () => void;


  get brandedFormWrapperTheme(): string {

    return `form-wrapper-theme--${this.formMetadata?.brand}`;
  }


  constructor(
    private _cinchyQueryService: CinchyQueryService,
    private _appStateService: AppStateService,
    private _toastrService: ToastrService,
    private _spinnerService: NgxSpinnerService,
    public changeDetectorRef: ChangeDetectorRef,
    public media: MediaMatcher
  ) {

    // For Sidenav
    this.mobileQuery = media.matchMedia("(max-width: 600px)");
    this.mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this.mobileQueryListener);
  }


  async ngOnInit() {

    this._appStateService.formPopulated$.subscribe({
      next: (formId: string) => {

        this.formId = formId;

        this.loadFormMetadata();
      }
    })
  }


  onSaved(): void {

    this.loadLookupRecords(this.formMetadata);
  }


  async loadFormMetadata() {

    try {
      this._spinnerService.show();
      const formMetadata = await this._cinchyQueryService.getFormMetadata().toPromise();
      this.formMetadata = this._appStateService.formMetadata = formMetadata;

      await this.loadLookupRecords(formMetadata);

      this.loadFormSections();
    } catch (e) {
      this.showError("Error getting form metadata", e);
    }
  }


  async loadFormSections() {
    try {
      const formSections = await this._cinchyQueryService.getFormSections().toPromise();
      this.formSectionsMetadata = formSections;
      this._appStateService.setLatestRenderedSections(formSections);
      if (this.formSectionsMetadata) {
        await this._spinnerService.hide();
      }
    } catch (e) {
      this.showError("Error getting section metadata", e);
    }
    await this._spinnerService.hide();
  }


  async loadLookupRecords(formMetadata: IFormMetadata): Promise<void> {

    if (formMetadata?.subTitleColumn == null) {
      return;
    }

    this._cinchyQueryService.resetLookupRecords.next();

    await this._cinchyQueryService.getLookupRecords(
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

    this._spinnerService.hide();

    console.error(message, error);

    this._toastrService.error("Could not fetch the form's metadata. You may not have the necessary entitlements to view this form.", "Error");
  }
}
