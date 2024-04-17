import { tap, throttleTime } from "rxjs/operators";

import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";

import { ChildFormComponent } from "../../dynamic-forms/fields/child-form/child-form.component";

import { Form } from "../../dynamic-forms/models/cinchy-form.model";

import { FormHelperService } from "../../dynamic-forms/service/form-helper/form-helper.service";

import { IFormSectionMetadata } from "../../models/form-section-metadata.model";
import { IFormMetadata } from "../../models/form-metadata-model";

import { AppStateService } from "../../services/app-state.service";
import { DialogService } from "../../services/dialog.service";

import { NgxSpinnerService } from "ngx-spinner";


@Component({
  selector: "sidenav",
  templateUrl: "./sidenav.component.html",
  styleUrls: ["./sidenav.component.scss"]
})
export class SidenavComponent implements OnInit {

  @Input() tableId: number;
  @Input() formMetadata: IFormMetadata;


  @Output() closeSideBar = new EventEmitter<any>();


  formSectionsMetadata: IFormSectionMetadata[] = [];
  selectedSection: string;
  toggleMenu: boolean;

  private _sectionRenderCompleted = false;


  /**
   * Used to display the correct entity on the create button
   */
  get createNewEntityLabel(): string {

    return (this.formMetadata?.createNewOptionName ?? "");
  }


  constructor(
    private _appStateService: AppStateService,
    private _dialogService: DialogService,
    private _formHelperService: FormHelperService,
    private _spinnerService: NgxSpinnerService
  ) {}


  ngOnInit(): void {

    // Store the section that the user selected. This is behind a guard to ensure that the first section is always
    // selected when the form is first populated
    this._appStateService.currentSection$.pipe(
      throttleTime(100)
    ).subscribe((sectionLabel: string) => {

      if (this._sectionRenderCompleted) {
        this.selectedSection = sectionLabel ?? this.selectedSection;
      }
    });


    // When the section metadata is loaded, save it and expand the first section by default
    this._appStateService.latestRenderedSections$.pipe(
      tap(() => {

        this._sectionRenderCompleted = false;
      }),
      throttleTime(100)
    ).subscribe((sectionMetadata: Array<IFormSectionMetadata>) => {

      this.formSectionsMetadata = sectionMetadata;

      if (this.formSectionsMetadata?.length) {
        this.sectionClicked(this.formSectionsMetadata[0]);
      }

      this._sectionRenderCompleted = true;
    });
  }


  /**
   * Determines whether or not the given section is the active section
   *
   * @param targetSection The name of the given section
   */
  isSelected(targetSection: string): boolean {

    return (this.selectedSection === targetSection);
  }


  /**
   * Opens a dialog which allows the user to add a record to a child table which is linked to the active form
   */
  async openAddNewOptionDialog(): Promise<void> {

    const form: Form = await this._formHelperService.getFormById(this.formMetadata.createNewOptionFormId);

    const newOptionDialogRef = this._dialogService.openDialog(
      ChildFormComponent,
      {
        childForm: form,
        title: this.formMetadata.createNewOptionName
      }
    );

    newOptionDialogRef.afterClosed().subscribe(async (resultId: number): Promise<void> => {

      // This check only exists to confirm that the dialog was closed by a save operation. If it was cancelled
      // or closed by clicking the backdrop, it will be nullish
      if (resultId) {
        await this._spinnerService.show();

        // Errors to this function are captured internally, so we can assume that it will complete naturally
        await this._formHelperService.addOptionToLinkedTable(form);

        await this._spinnerService.hide();
      }
    });
  }


  /**
   * Handles the expansion of a selected section
   *
   * @param section the metadata of the clicked section
   */
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
