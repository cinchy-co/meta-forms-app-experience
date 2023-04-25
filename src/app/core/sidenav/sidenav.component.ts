import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";

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

  @Input() tableId: number;
  @Input() formMetadata: IFormMetadata;


  @Input()
  get tableUrl() {

    return this._tableUrl;
  }
  set tableUrl(value: string) {

    this._tableUrl = value

    this._updateFilteredTableUrl();
  };
  private _tableUrl: string;

  @Output() closeSideBar = new EventEmitter<any>();


  canInsert: boolean;
  createNewOptionName: string;
  filteredTableUrl: string;
  formSectionsMetadata: IFormSectionMetadata[] = [];
  selectedSection: string;
  showNewContactLink: boolean;
  toggleMenu: boolean;


  get canCreateNewRecord(): boolean {

    return coerceBooleanProperty(this.canInsert && this._appStateService.rowId);
  }


  constructor(
    private _appStateService: AppStateService,
    private dialogService: DialogService,
    private cinchyService: CinchyService,
    private spinner: NgxSpinnerService
  ) {}


  ngOnInit(): void {

    this.loadTableEntitlements();
    this.subscribeToSectionClickedFromForm();
    this.subscribeToRenderedSectionUpdates();
    this.createNewOptionName = this.formMetadata.createNewOptionName;

    this._appStateService.onRecordSelected().subscribe({
      next: () => {

        this._updateFilteredTableUrl();
      }
    });
  }


  createNewRecord(): void {

    this.sectionClicked(this.formSectionsMetadata[0]);
    this._appStateService.setRecordSelected(null);
  }


  async loadTableEntitlements(): Promise<void> {

    const resp = await this.cinchyService.getTableEntitlementsById(this.tableId).toPromise();
    this.canInsert = resp.canAddRows;
  }


  openAddNewOptionDialog(): void {

    const newOptionDialogRef = this.dialogService.openDialog(
      AddNewOptionDialogComponent,
      {
        createNewOptionFormId: this._appStateService.formId,
        createNewOptionName: this.formMetadata.createNewOptionName
      }
    );

    this.spinner.hide();

    newOptionDialogRef.afterClosed().subscribe(newContactAdded => {

      if (newContactAdded) {
        this._appStateService.newContactAdded(newContactAdded)
      }
    });
  }


  saveForm(): void {

    this._appStateService.saveClicked$.next();
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


  subscribeToRenderedSectionUpdates(): void {

    this._appStateService.getLatestRenderedSections().subscribe(resp => {

      this.formSectionsMetadata = resp;

      if (this.formSectionsMetadata?.length) {
        this.sectionClicked(this.formSectionsMetadata[0]);
      }
    });
  }


  subscribeToSectionClickedFromForm(): void {

    this._appStateService.getCurrentSectionClicked().subscribe(section => {

      this.selectedSection = section ?? this.selectedSection;
    });
  }


  /**
   * Adds the current record information to the querystring of the table URL
   */
  private _updateFilteredTableUrl() {

    this.filteredTableUrl = this._appStateService.rowId ? `${this._tableUrl}?viewId=0&fil[Cinchy%20Id].Op=Equals&fil[Cinchy%20Id].Val=${this._appStateService.rowId}` : this.filteredTableUrl;
  }
}
