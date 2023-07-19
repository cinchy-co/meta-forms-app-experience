import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";

import { CinchyService } from "@cinchy-co/angular-sdk";

import { NgxSpinnerService } from "ngx-spinner";

import { AddNewOptionDialogComponent } from "../../dialogs/add-new-option-dialog/add-new-option-dialog.component";

import { IFormSectionMetadata } from "../../models/form-section-metadata.model";
import { IFormMetadata } from "../../models/form-metadata-model";

import { AppStateService } from "../../services/app-state.service";
import { DialogService } from "../../services/dialog.service";


@Component({
  selector: "app-sidenav",
  templateUrl: "./sidenav.component.html",
  styleUrls: ["./sidenav.component.scss"]
})
export class SidenavComponent implements OnInit {

  @Input() formId: string;
  @Input() tableId: number;
  @Input() formMetadata: IFormMetadata;


  @Input() set tableUrl(value: string) {

    this._tableUrl = value
    this.filteredTableUrl = this.rowId ? `${value}?viewId=0&fil[Cinchy%20Id].Op=Equals&fil[Cinchy%20Id].Val=${this.rowId}` : this.filteredTableUrl;
  };

  @Output() closeSideBar = new EventEmitter<any>();


  canInsert: boolean;
  createNewOptionName: string;
  filteredTableUrl: string;
  formSectionsMetadata: IFormSectionMetadata[] = [];
  rowId: number;
  selectedSection: string;
  showNewContactLink: boolean;
  toggleMenu: boolean;


  get tableUrl() {

    return this._tableUrl;
  }
  private _tableUrl: string;


  constructor(
    private appStateService: AppStateService,
    private dialogService: DialogService,
    private cinchyService: CinchyService,
    private spinner: NgxSpinnerService
  ) {}


  ngOnInit(): void {

    this.loadTableEntitlements();
    this.subscribeToSectionClickedFromForm();
    this.subscribeToRenderedSectionUpdates();
    this.createNewOptionName = this.formMetadata.createNewOptionName;

    this.appStateService.onRecordSelected().subscribe({
      next: (record: { cinchyId: number, doNotReloadForm: boolean }) => {

        this.rowId = record?.cinchyId;
        this.filteredTableUrl = this.rowId ? `${this.tableUrl}?viewId=0&fil[Cinchy%20Id].Op=Equals&fil[Cinchy%20Id].Val=${this.rowId}` : this.tableUrl;
      }
    });
  }


  subscribeToRenderedSectionUpdates(): void {

    this.appStateService.getLatestRenderedSections().subscribe(resp => {

      this.formSectionsMetadata = resp;

      if (this.formSectionsMetadata?.length)
        this.sectionClicked(this.formSectionsMetadata[0]);
    });
  }


  subscribeToSectionClickedFromForm(): void {

    this.appStateService.getCurrentSectionClicked().subscribe(section => {

      this.selectedSection = section ?? this.selectedSection;
    });
  }


  sectionClicked(section: IFormSectionMetadata): void {

    this.selectedSection = section.name;
    const sectionElement = document.getElementById(`section-${section.name}`);
    const expansionHeader: any = sectionElement ? sectionElement.children[0] : null;
    const expansionContent: any = sectionElement ? sectionElement.children[1] : null;
    const isHidden = expansionContent?.style?.visibility === "hidden";

    if (expansionHeader && isHidden) {
      expansionHeader.click();
      expansionHeader.focus();
    }

    sectionElement?.scrollIntoView({ behavior: "smooth", block: "start" });
  }


  createNewRecord(): void {

    this.sectionClicked(this.formSectionsMetadata[0]);
    this.appStateService.setRecordSelected(null);
  }


  openAddNewOptionDialog(): void {

    const newOptionDialogRef = this.dialogService.openDialog(
      AddNewOptionDialogComponent,
      {
        createLinkOptionFormId:this.formMetadata.createNewOptionFormId,
        createNewOptionFormId: this.appStateService.formId,
        createNewOptionName: this.formMetadata.createNewOptionName
      }
    );

    this.spinner.hide();

    newOptionDialogRef.afterClosed().subscribe(newContactAdded => {

      newContactAdded && this.appStateService.newContactAdded(newContactAdded)
    });
  }


  async loadTableEntitlements(): Promise<void> {

    const resp = await this.cinchyService.getTableEntitlementsById(this.tableId).toPromise();
    this.canInsert = resp.canAddRows;
  }


  saveForm(): void {

    this.appStateService.saveClicked();
  }
}
