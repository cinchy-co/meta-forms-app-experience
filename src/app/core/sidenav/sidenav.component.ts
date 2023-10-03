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

  };
  private _tableUrl: string;

  @Output() closeSideBar = new EventEmitter<any>();


  formSectionsMetadata: IFormSectionMetadata[] = [];
  selectedSection: string;
  showNewContactLink: boolean;
  toggleMenu: boolean;


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


  isSelected(targetSection: string): boolean {

    return (this.selectedSection === targetSection);
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
}
