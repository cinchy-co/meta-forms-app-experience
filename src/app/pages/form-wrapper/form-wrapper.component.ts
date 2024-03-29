import { takeUntil } from "rxjs/operators";

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

import { IframeUtil } from "../../util/iframe-util";


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


  get fullScreenHeight(): string {

    return IframeUtil.fullScreenHeight;
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


  ngOnInit(): void {

    this._appStateService.rootFormIdSet$.subscribe({
      next: (formId: string) => {

        this.formId = formId;

        this.loadFormMetadata();
      }
    })
  }


  handleOnLookupRecordFilter(filter: string): void {

    let resolvedFilter = (filter ? `LOWER(CAST([${this.formMetadata.subTitleColumn ?? "Cinchy ID"}] as nvarchar(MAX))) LIKE LOWER('%${filter}%')` : null);

    // Ensure that if there is a default filter on the field, it is not lost
    if (resolvedFilter && this.formMetadata.lookupFilter) {
      resolvedFilter += ` AND ${this.formMetadata.lookupFilter}`;
    }

    this.loadLookupRecords(this.formMetadata, resolvedFilter ?? this.formMetadata.lookupFilter);
  }


  async loadFormMetadata() {

    try {
      this._spinnerService.show();
      const formMetadata = await this._cinchyQueryService.getFormMetadata().toPromise();

      this.formMetadata = this._appStateService.formMetadata = formMetadata;

      this.lookupRecords = [];
      this.loadFormSections();
    } catch (e) {
      this.showError("Error getting form metadata", e);
    }
  }


  async loadFormSections() {

    try {
      const formSections = await this._cinchyQueryService.getFormSectionsMetadata().toPromise();

      this.formSectionsMetadata = formSections;

      this._appStateService.latestRenderedSections$.next(formSections);

      this._spinnerService.hide();
    } catch (e) {
      this.showError("Error getting section metadata", e);

      this._spinnerService.hide();
    }
  }

  loadLookupRecords(formMetadata: IFormMetadata, filter?: string, limitResults?: boolean): void {

    this._cinchyQueryService.resetLookupRecords.next();

    this._cinchyQueryService.getLookupRecords(
      formMetadata.subTitleColumn,
      formMetadata.domainName,
      formMetadata.tableName,
      filter ?? formMetadata.lookupFilter,
      limitResults
    ).pipe(
      takeUntil(this._cinchyQueryService.resetLookupRecords)
    ).subscribe(
      {
        next: (response: Array<ILookupRecord>) => {

          this.lookupRecords = response;
        },
        error: (e) => {

          this.showError("Error getting lookup records", e);
        }
      }
    );
  }


  private showError(message: string, error: any) {

    this._spinnerService.hide();

    console.error(message, error);

    this._toastrService.error("Could not fetch the form's metadata. You may not have the necessary entitlements to view this form.", "Error");
  }
}
