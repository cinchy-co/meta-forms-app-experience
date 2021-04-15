import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {AppStateService} from '../../services/app-state.service';
import {ISection} from '../core.model';
import {AddNewContactDialogComponent} from "../../dialogs/add-new-contact-dialog/add-new-contact-dialog.component";
import {DialogService} from "../../services/dialog.service";
import {CinchyQueryService} from "../../services/cinchy-query.service";
import {CinchyService} from "@cinchy-co/angular-sdk";
import {NgxSpinnerService} from "ngx-spinner";
import {Subject} from "rxjs";
import {takeUntil} from "rxjs/operators";
import {AddNewOptionDialogComponent} from "../../dialogs/add-new-option-dialog/add-new-option-dialog.component";

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss']
})
export class SidenavComponent implements OnInit, OnDestroy {
  @Input() formSections: Array<ISection>;
  @Input() formId: string | number;
  @Input() tableId: string | number;
  @Input() formFieldMetadataResult: any;

  @Input() set rowId(value: string | number) {
    this._rowId = value
    this.filteredTableUrl = this.tableUrl ? `${this.tableUrl}?viewId=0&fil[Cinchy%20Id].Op=Equals&fil[Cinchy%20Id].Val=${value}` : this.filteredTableUrl;
  };

  @Input() set tableUrl(value: string) {
    this._tableUrl = value
    this.filteredTableUrl = this.rowId ? `${value}?viewId=0&fil[Cinchy%20Id].Op=Equals&fil[Cinchy%20Id].Val=${this.rowId}` : this.filteredTableUrl;
  };

  @Output() closeSideBar = new EventEmitter<any>();
  @Output() createNewFormClicked = new EventEmitter<any>();
  toggleMenu: boolean;
  canAddNewContact: boolean;
  canAddNewForm: boolean;
  selectedSection: string;
  filteredTableUrl: string;
  destroy$: Subject<boolean> = new Subject<boolean>();
  _rowId;
  _tableUrl;
  showNewContactLink: boolean;
  createNewOptionName: string;

  get rowId() {
    return this._rowId;
  }

  get tableUrl() {
    return this._tableUrl;
  }

  constructor(private appStateService: AppStateService,
              private dialogService: DialogService,
              private cinchyQueryService: CinchyQueryService,
              private cinchyService: CinchyService,
              private spinner: NgxSpinnerService) {
  }

  ngOnInit(): void {
  //  this.getPeopleTableEntitlements();
    this.getOpportunityTableEntitlements();
    this.selectedSection = this.formSections[0].sectionName;
    this.subscribeToSectionClickedFromForm();
    //  this.showNewContactLink = this.formFieldMetadataResult[0]['allowNewContact'];
    this.createNewOptionName = this.formFieldMetadataResult[0]['createNewOptionName'];
  }

  subscribeToSectionClickedFromForm() {
    this.appStateService.getCurrentSectionClicked().pipe(takeUntil(this.destroy$)).subscribe(section => {
      this.selectedSection = section ? section : this.selectedSection;
    })
  }

  sectionClicked(section: ISection) {
    const {sectionName, sequence} = section;
    this.selectedSection = sectionName;
    const sectionEle = document.getElementById(`section-${sectionName}`);
    const expansionHeader: any = sectionEle ? sectionEle.children[0] : null;
    const expansionContent: any = sectionEle ? sectionEle.children[1] : null;
    const isHidden = expansionContent.style.visibility === 'hidden';
    if (expansionHeader && isHidden) {
      expansionHeader.click();
      expansionHeader.focus();
    }
    sectionEle.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  createNewForm() {
    this.sectionClicked(this.formSections[0]);
    this.createNewFormClicked.emit();
  }

  async openAddNewContactDialog() {
    this.spinner.show();
    const companiesResp = await this.cinchyQueryService.getAllCompanies().toPromise();
    const allCompanies = companiesResp.queryResult.toObjectArray();
    const contactDialogRef = this.dialogService.openDialog(AddNewContactDialogComponent, {allCompanies});
    this.spinner.hide();
    contactDialogRef.afterClosed().subscribe(newContactAdded => {
      // newContactAdded && this.appStateService.newContactAdded(newContactAdded)
    });
  }

  openAddNewOptionDialog() {
    const {createNewOptionFormId, createNewOptionName} = this.formFieldMetadataResult[0];
    this.createNewOptionName = createNewOptionName;
    const newOptionDialogRef = this.dialogService.openDialog(AddNewOptionDialogComponent, {
      createNewOptionFormId,
      createNewOptionName
    });
    this.spinner.hide();
    newOptionDialogRef.afterClosed().subscribe(newContactAdded => {
      newContactAdded && this.appStateService.newContactAdded(newContactAdded)
    });
  }

  async getPeopleTableEntitlements() {
    // TODO need to add configuration for when can we make this call
 //   const resp = await this.cinchyService.getTableEntitlementsByName('Contacts', 'People').toPromise();
 //   this.canAddNewContact = resp.canAddRows;
  }

  async getOpportunityTableEntitlements() {
    const resp = await this.cinchyService.getTableEntitlementsById(this.tableId).toPromise();
    this.canAddNewForm = resp.canAddRows;
  }

  saveForm() {
    this.appStateService.saveClicked(true);
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

}
