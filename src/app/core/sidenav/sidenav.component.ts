import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AppStateService } from '../../services/app-state.service';
import { DialogService } from "../../services/dialog.service";
import { CinchyService } from "@cinchy-co/angular-sdk";
import { NgxSpinnerService } from "ngx-spinner";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { AddNewOptionDialogComponent } from "../../dialogs/add-new-option-dialog/add-new-option-dialog.component";
import { IFormSectionMetadata } from 'src/app/models/form-section-metadata.model';
import { IFormMetadata } from 'src/app/models/form-metadata-model';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss']
})
export class SidenavComponent implements OnInit, OnDestroy {
  formSectionsMetadata: IFormSectionMetadata[] = [];
  @Input() formId: string | number;
  @Input() tableId: string | number;
  @Input() formMetadata: IFormMetadata;

  rowId: string | number;

  @Input() set tableUrl(value: string) {
    this._tableUrl = value
    this.filteredTableUrl = this.rowId ? `${value}?viewId=0&fil[Cinchy%20Id].Op=Equals&fil[Cinchy%20Id].Val=${this.rowId}` : this.filteredTableUrl;
  };

  @Output() closeSideBar = new EventEmitter<any>();

  toggleMenu: boolean;
  canInsert: boolean;
  selectedSection: string;
  filteredTableUrl: string;
  destroy$: Subject<boolean> = new Subject<boolean>();
  _tableUrl;
  showNewContactLink: boolean;
  createNewOptionName: string;

  get tableUrl() {
    return this._tableUrl;
  }

  constructor(private appStateService: AppStateService,
    private dialogService: DialogService,
    private cinchyService: CinchyService,
    private spinner: NgxSpinnerService) {
  }

  ngOnInit(): void {
    this.loadTableEntitlements();
    this.subscribeToSectionClickedFromForm();
    this.subscribeToRenderedSectionUpdates();
    this.createNewOptionName = this.formMetadata.createNewOptionName;

    this.appStateService.onRecordSelected().subscribe(resp => {
      this.rowId = resp.cinchyId;
      this.filteredTableUrl = !this.rowId.toString().includes('null') ? `${this.tableUrl}?viewId=0&fil[Cinchy%20Id].Op=Equals&fil[Cinchy%20Id].Val=${this.rowId}` : this.tableUrl;
    });
  }

  subscribeToRenderedSectionUpdates() {
    this.appStateService.getLatestRenderedSections().subscribe(resp => {
      this.formSectionsMetadata = resp;
      if (this.formSectionsMetadata?.length)
        this.sectionClicked(this.formSectionsMetadata[0]);
    });
  }

  subscribeToSectionClickedFromForm() {
    this.appStateService.getCurrentSectionClicked().pipe(takeUntil(this.destroy$)).subscribe(section => {
      this.selectedSection = section ? section : this.selectedSection;
    })
  }

  sectionClicked(section: IFormSectionMetadata) {
    this.selectedSection = section.name;
    const sectionEle = document.getElementById(`section-${section.name}`);
    const expansionHeader: any = sectionEle ? sectionEle.children[0] : null;
    const expansionContent: any = sectionEle ? sectionEle.children[1] : null;
    const isHidden = expansionContent?.style?.visibility === 'hidden';
    if (expansionHeader && isHidden) {
      expansionHeader.click();
      expansionHeader.focus();
    }
    sectionEle?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  createNewRecord() {
    this.sectionClicked(this.formSectionsMetadata[0]);
    this.appStateService.setRecordSelected(null);
  }

  openAddNewOptionDialog() {
    const { createNewOptionFormId, createNewOptionName } = this.formMetadata;
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

  async loadTableEntitlements() {
    const resp = await this.cinchyService.getTableEntitlementsById(this.tableId).toPromise();
    this.canInsert = resp.canAddRows;
  }

  saveForm() {
    this.appStateService.saveClicked(true);
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
