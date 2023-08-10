import { debounceTime } from "rxjs/operators";

import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";

import { AddNewEntityDialogComponent } from "../../dialogs/add-new-entity-dialog/add-new-entity-dialog.component";

import { INewEntityDialogResponse } from "../../dynamic-forms/interface/new-entity-dialog-response";

import { IFormSectionMetadata } from "../../models/form-section-metadata.model";
import { IFormMetadata } from "../../models/form-metadata-model";

import { AppStateService } from "../../services/app-state.service";
import { DialogService } from "../../services/dialog.service";

import { CinchyService } from "@cinchy-co/angular-sdk";

import { NgxSpinnerService } from "ngx-spinner";
import { debounce } from "rxjs/operators";


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
  filteredTableUrl: string;
  formSectionsMetadata: IFormSectionMetadata[] = [];
  selectedSection: string;
  showNewContactLink: boolean;
  toggleMenu: boolean;


  get canCreateNewRecord(): boolean {

    // We're checking for rowId here so that the create button isn't visible if when the form
    // is already in create mode
    return coerceBooleanProperty(this.canInsert && this._appStateService.rowId);
  }


  /**
   * Used to display the correct entity on the create button
   */
  get createNewEntityLabel(): string {

    return (this.formMetadata?.createNewOptionName ?? "");
  }


  constructor(
    private _appStateService: AppStateService,
    private _dialogService: DialogService,
    private _cinchyService: CinchyService,
    private _spinner: NgxSpinnerService
  ) { }


  ngOnInit(): void {

    this.loadTableEntitlements();


    this._appStateService.onRecordSelected$.subscribe({
      next: () => {

        this._updateFilteredTableUrl();
      }
    });


    // This has the potential to fire multiple times when the form first loads
    this._appStateService.currentSection$.pipe(
      debounceTime(300)
    ).subscribe((sectionLabel: string) => {

      this.selectedSection = sectionLabel ?? this.selectedSection;
    });


    this._appStateService.latestRenderedSections$.pipe(
      debounceTime(300)
    ).subscribe((sectionMetadata: Array<IFormSectionMetadata>) => {

      this.formSectionsMetadata = sectionMetadata;

      if (this.formSectionsMetadata?.length) {
        this.sectionClicked(this.formSectionsMetadata[0]);
      }
    });
  }


  createNewRecord(): void {
    this.sectionClicked(this.formSectionsMetadata[0]);
    //this._appStateService.deleteConnectionQueryParams();
  }


  isSelected(targetSection: string): boolean {

    return (this.selectedSection === targetSection);
  }


  async loadTableEntitlements(): Promise<void> {

    const resp = await this._cinchyService.getTableEntitlementsById(this.tableId).toPromise();

    this.canInsert = resp.canAddRows;
  }


  openAddNewOptionDialog(): void {

    const newOptionDialogRef = this._dialogService.openDialog(
      AddNewEntityDialogComponent,
      {
        createNewOptionFormId: this._appStateService.formId,
        createNewOptionName: this.formMetadata.createNewOptionName
      }
    );

    this._spinner.hide();

    newOptionDialogRef.afterClosed().subscribe((value: INewEntityDialogResponse) => {

      if (value) {
        this._appStateService.addNewEntityDialogClosed$.next(value);
      }
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


  /**
   * Adds the current row information to the querystring of the table URL
   */
  private _updateFilteredTableUrl() {

    this.filteredTableUrl = this._appStateService.rowId ? `${this._tableUrl}?viewId=0&fil[Cinchy%20Id].Op=Equals&fil[Cinchy%20Id].Val=${this._appStateService.rowId}` : this.filteredTableUrl;
  }
}
