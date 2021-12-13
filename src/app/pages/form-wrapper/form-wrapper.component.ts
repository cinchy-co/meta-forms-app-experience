import {ChangeDetectorRef, Component, OnInit, ViewChild} from '@angular/core';
import {CinchyQueryService} from '../../services/cinchy-query.service';
import {AppStateService} from '../../services/app-state.service';
import {ActivatedRoute, Router} from '@angular/router';
import {DialogService} from '../../services/dialog.service';
import {CinchyService} from "@cinchy-co/angular-sdk";
import {ToastrService} from "ngx-toastr";
import {NgxSpinnerService} from "ngx-spinner";
import {MediaMatcher} from '@angular/cdk/layout';

@Component({
  selector: 'app-form-wrapper',
  templateUrl: './form-wrapper.component.html',
  styleUrls: ['./form-wrapper.component.scss']
})
export class FormWrapperComponent implements OnInit {
  @ViewChild('sidenav') sidenav;
  formFieldMetadataResult;
  rowId: string | number;
  formId: string | number;
  mobileQuery: MediaQueryList;
  formSections;
  allRows;
  showCreateNewForm: boolean;
  private mobileQueryListener: () => void;

  constructor(private cinchyQueryService: CinchyQueryService, private appStateService: AppStateService,
              private router: Router, private dialogService: DialogService,
              private activatedRoute: ActivatedRoute, private cinchyService: CinchyService,
              private toastr: ToastrService, private spinner: NgxSpinnerService,
              changeDetectorRef: ChangeDetectorRef, media: MediaMatcher,) {
    // For Sidenav
    this.mobileQuery = media.matchMedia('(max-width: 600px)');
    this.mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this.mobileQueryListener);
  }

  async ngOnInit() {
    // const selectedOpportunityId = this.appStateService.checkForOpportunityId();
    await this.setFormMetaData();
    let {formId, rowId} = this.activatedRoute.snapshot.queryParams;
    console.log('From session', sessionStorage.getItem('formId'), sessionStorage.getItem('rowId'));
    this.formId = formId || this.appStateService.formId || sessionStorage.getItem('formId');
    this.rowId = rowId || this.appStateService.rowId || sessionStorage.getItem('rowId');
  }

  async setFormMetaData() {
    // Get form Meta data Only when Once.
    try {
      this.spinner.show();
      const metaDataResp = await this.cinchyQueryService.getFormMetaData().toPromise();
      const objectArrayResponse = metaDataResp.queryResult.toObjectArray();
      this.setSubtitle(objectArrayResponse);
      this.formFieldMetadataResult = objectArrayResponse;
      this.appStateService.metaDataOfForm = this.formFieldMetadataResult;
      this.setFormSections();
    } catch (e) {
      this.showError(e);
    }
  }

  async setSubtitle(formFieldMetadataResult) {
    if (formFieldMetadataResult && formFieldMetadataResult[0]) {
      const lookupLabelColumn = formFieldMetadataResult[0].subTitleColumn;
      const lookupFilter = formFieldMetadataResult[0].lookupFilter;
      if (lookupLabelColumn) {
        this.cinchyQueryService.getAllRowsOfTable(lookupLabelColumn, formFieldMetadataResult[0].Domain, formFieldMetadataResult[0].Table, lookupFilter)
          .subscribe(rowsResp => {
            this.allRows = rowsResp.queryResult.toObjectArray();
          }, (e => {
            this.showError(e);
          }));
      }
    }
  }

  showError(e) {
    this.spinner.hide();
    console.log('Get meta data/All rows Query failing,', e);
    this.toastr.error('Operation aborted ! Access denied or temporary issue in execution getting Meta data.', 'Error');
  }

  async setFormSections() {
    const formSectionResp = await this.cinchyQueryService.getFormSections().toPromise();
    this.formSections = formSectionResp.queryResult.toObjectArray();

    if (this.formSections) {
      console.info('Sections fetched.');
      console.log(this.formSections)
      await this.spinner.hide();
    }
  }

  setDefaultForm() {
    this.rowId = null;
  }

  saveClicked(data) {
    this.appStateService.isFormSaved = data ? data.isSaved : null;
    if (data.isSaved && this.formId == 11) {
      this.router.navigate(['/save-success']);
    }
  }

  rowUpdatedFromForm(rowId) {
    this.rowId = rowId;
  }

  back() {
    this.router.navigate(['/deals-overview']);
  }

}
